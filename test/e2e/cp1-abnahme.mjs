#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   Abnahme-Suite Checkpoint 1 (Spec-Dashboard-Design-v2 §5, Gates 2 und 3)

   Läuft NICHT in `npm test` (Dateiname ohne .test.mjs) und bringt keine
   Abhängigkeit in package.json: Playwright wird aus dem executive-agent-Repo
   geladen, das es ohnehin installiert hat (oder aus PLAYWRIGHT_PFAD).

   Aufruf:
     node test/e2e/cp1-abnahme.mjs --ziel=http://127.0.0.1:18810 --aus=<ordner>
     node test/e2e/cp1-abnahme.mjs --ziel=https://app.bikobickel.de --aus=<ordner> --live

   Ohne --live wird ein lokaler Server ohne nginx angesprochen. Die Seite
   erwartet alle Pfade unter /dashboard/ — ein kleiner Vorschalt-Proxy in
   diesem Skript nimmt das Präfix ab, wie nginx es tut.

   NUR LESEND: Jede Anfrage außer GET und HEAD wird abgebrochen und gezählt.
   Der Zugangstoken kommt aus ~/.config/openclaw/env und wird nie ausgegeben.

   --live: nur Smoke (Heute mobil + Desktop, ?tab=assets), keine Abfänge.
   Ergebnis: <aus>/ergebnis.json und Screenshots <nn>-<tab>-<breite>.png.
   ═══════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const arg = (name, vorgabe) => {
  const t = process.argv.find(a => a.startsWith('--' + name + '='));
  return t ? t.slice(name.length + 3) : (process.argv.includes('--' + name) ? true : vorgabe);
};
const ZIEL = String(arg('ziel', 'http://127.0.0.1:18810')).replace(/\/$/, '');
const AUS = path.resolve(String(arg('aus', './cp1-abnahme')));
const LIVE = arg('live', false) === true;
const NUR = arg('nur', null);   // z. B. --nur=tabs,deeplinks,heute,tagesbogen
fs.mkdirSync(AUS, { recursive: true });

const require = createRequire(import.meta.url);
const pwPfad = process.env.PLAYWRIGHT_PFAD
  || path.join(os.homedir(), '.openclaw/workspace/.openclaw/extensions/executive-agent/node_modules/playwright');
const { chromium } = require(pwPfad);

const envText = fs.readFileSync(path.join(os.homedir(), '.config/openclaw/env'), 'utf8');
const TOKEN = (envText.match(/^DASHBOARD_TOKEN=(.+)$/m) || [])[1]?.trim();
if (!TOKEN) { console.error('DASHBOARD_TOKEN fehlt'); process.exit(2); }

/* Vorschalt-Proxy: /dashboard/<rest> → <ZIEL>/<rest>. */
async function proxyStarten() {
  const ziel = new URL(ZIEL);
  const server = http.createServer((req, res) => {
    const pfad = req.url.startsWith('/dashboard') ? (req.url.slice('/dashboard'.length) || '/') : req.url;
    const weiter = http.request({ host: ziel.hostname, port: ziel.port, path: pfad, method: req.method,
      headers: { ...req.headers, host: ziel.host } }, (antwort) => {
      res.writeHead(antwort.statusCode, antwort.headers);
      antwort.pipe(res);
    });
    weiter.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(weiter);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, basis: 'http://127.0.0.1:' + server.address().port };
}

const TABS = ['heute', 'health', 'trips', 'calendar', 'fleet', 'assets', 'trading', 'banking',
  'pe', 'instagram', 'sharepoint', 'wiki', 'agents', 'status'];
const BREITEN = [
  { name: 'mobil-390', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];

const ergebnis = { ziel: LIVE ? ZIEL : 'lokal (Proxy auf ' + ZIEL + ')', start: new Date().toISOString(),
  gesperrt: [], fremdeHosts: [], tabs: [], deeplinks: [], heute: [], fehler: [], fehlerAntworten: [] };

function beobachten(page, sammel, eigenerHost) {
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' || /Content Security Policy/i.test(t)) sammel.konsole.push(t.slice(0, 300));
  });
  page.on('pageerror', e => sammel.konsole.push('pageerror: ' + String(e.message).slice(0, 300)));
  /* CP2-0: Pfad jeder 5xx-Antwort mitschreiben — die Konsole nennt nur den Status. */
  page.on('response', r => { if (r.status() >= 500) ergebnis.fehlerAntworten.push(r.status() + ' ' + new URL(r.url()).pathname); });
  page.on('request', r => {
    try { const h = new URL(r.url()).host; if (h && h !== eigenerHost && !r.url().startsWith('data:')) ergebnis.fremdeHosts.push(r.url().slice(0, 120)); } catch {}
  });
}

async function nurLesend(context) {
  await context.route('**/*', (route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD') return route.continue();
    ergebnis.gesperrt.push(m + ' ' + route.request().url().replace(/token=[^&]+/, 'token=…').slice(0, 160));
    return route.abort();
  });
}

/* Warten, bis ein Bereich steht: Heute meldet data-geladen="1", die übrigen
   haben dann keinen Lade-Platzhalter mehr. Danach Schriften. */
async function bereit(page, tab) {
  if (tab === 'heute') {
    /* Bereitschaftssignal data-geladen="1" (CP1-2). Der Altstand vor CP1-2
       kennt es nicht; dort genügt sein letzter Block (.heute-block). */
    await page.waitForFunction(() => document.getElementById('content').dataset.geladen === '1'
      || document.querySelectorAll('#content .heute-block').length >= 7, null, { timeout: 30000 });
  } else {
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#content > .spinner'), null, { timeout: 20000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

/* Überbreite: overflow-x von html/body vorübergehend aufheben, dann jedes
   Element suchen, das über den Viewport hinausragt und NICHT in einem
   eigenen Scroll-/Clip-Container steckt. */
async function ueberbreite(page) {
  return page.evaluate(() => {
    const h = document.documentElement, b = document.body;
    const alt = [h.style.overflowX, b.style.overflowX];
    h.style.overflowX = 'visible'; b.style.overflowX = 'visible';
    const breite = window.innerWidth;
    const treffer = [];
    const geclippt = (el) => {
      for (let p = el.parentElement; p && p !== b && p !== h; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox !== 'visible') return true;
      }
      return false;
    };
    for (const el of b.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right <= breite + 1) continue;
      const st = getComputedStyle(el);
      if (st.position === 'fixed' || st.visibility === 'hidden') continue;
      if (geclippt(el)) continue;
      treffer.push((el.id ? '#' + el.id : el.tagName.toLowerCase()) + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' r=' + Math.round(r.right));
    }
    const scrollBreite = h.scrollWidth;
    h.style.overflowX = alt[0]; b.style.overflowX = alt[1];
    return { breite, scrollBreite, treffer: treffer.slice(0, 12), anzahl: treffer.length };
  });
}

/* CP1-5: bereichsbezogene Prüfungen.
   heute (Desktop): die drei Karten der ersten Rasterzeile enden unten bündig (±2 px).
   health: keine .s-card ohne sichtbaren Wert.
   trips: kein Bildstreifen > 80 px Höhe in einer Reisekarte. */
async function zusatzPruefen(page, tab, breite) {
  if (tab === 'heute' && breite.name.startsWith('desktop')) {
    return page.evaluate(() => {
      const unten = ['.tu-handlung', '.tu-termine', '.tu-gesundheit']
        .map(sel => Math.round(document.querySelector(sel).getBoundingClientRect().bottom));
      /* CP1-8: Briefing über die volle Breite, Datenquellen und Offene
         Punkte gemeinsam darunter, keine Wetter-Karte mehr. */
      const r = (sel) => document.querySelector(sel).getBoundingClientRect();
      const b = r('.tu-briefing'), raster = r('.tu-raster'), q = r('.tu-quellen'), o = r('.tu-offen');
      const raster_ok = Math.abs(b.width - raster.width) <= 2 && Math.abs(q.top - o.top) <= 2 && q.top > b.bottom
        && !document.querySelector('.tu-wetter');
      return { name: 'Heute: erste Rasterzeile unten bündig, Briefing volle Breite', ok: Math.max(...unten) - Math.min(...unten) <= 2 && raster_ok,
        detail: unten.join('/') + ' · Briefing ' + Math.round(b.width) + '/' + Math.round(raster.width) + ' px · Quellen/Offen oben ' + Math.round(q.top) + '/' + Math.round(o.top) };
    });
  }
  if (tab === 'health') {
    return page.evaluate(() => {
      const karten = [...document.querySelectorAll('#content .s-card')];
      const leer = karten.filter(k => { const v = k.querySelector('.val'); const t = v ? v.textContent.replace(/\s+/g, '') : '';
        return !t || t === '—' || t === '–' || !v.getBoundingClientRect().height; });
      const abgeschnitten = karten.filter(k => { const v = k.querySelector('.val'); return v && v.scrollWidth > v.clientWidth + 1; });
      return { name: 'Gesundheit: keine Kachel ohne Wert, kein Wert abgeschnitten', ok: !leer.length && !abgeschnitten.length,
        detail: karten.length + ' Kacheln, ' + leer.length + ' ohne Wert, ' + abgeschnitten.length + ' abgeschnitten' };
    });
  }
  if (tab === 'trips') {
    return page.evaluate(() => {
      const bilder = [...document.querySelectorAll('#content .trip-card .entity-img-wrap')];
      const hoch = bilder.filter(b => b.getBoundingClientRect().height > 80);
      return { name: 'Reisen: kein Bildstreifen > 80 px', ok: !hoch.length,
        detail: bilder.map(b => Math.round(b.getBoundingClientRect().height)).join('/') || 'kein Bild' };
    });
  }
  return null;
}

async function seiteOeffnen(browser, breite, eigenerHost) {
  const context = await browser.newContext({ viewport: breite.viewport, deviceScaleFactor: breite.deviceScaleFactor,
    isMobile: !!breite.isMobile, hasTouch: !!breite.hasTouch, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  await nurLesend(context);
  const page = await context.newPage();
  const sammel = { konsole: [] };
  beobachten(page, sammel, eigenerHost);
  return { context, page, sammel };
}

async function tabsPruefen(browser, basis, eigenerHost, tabs) {
  for (const breite of BREITEN) {
    const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
    let erste = true;
    for (const [i, tab] of tabs.entries()) {
      sammel.konsole.length = 0;
      const url = basis + '/dashboard/?tab=' + tab + (erste ? '&token=' + encodeURIComponent(TOKEN) : '');
      erste = false;
      const eintrag = { tab, breite: breite.name };
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await bereit(page, tab);
        eintrag.ueber = await ueberbreite(page);
        eintrag.zusatz = await zusatzPruefen(page, tab, breite);
        eintrag.manrope = await page.evaluate(() => document.fonts.check('15px Manrope'));
        eintrag.aktiv = await page.evaluate(() => typeof currentTab === 'string' ? currentTab : null);
        const datei = String(TABS.indexOf(tab) + 1).padStart(2, '0') + '-' + tab + '-' + breite.name + '.png';
        await page.screenshot({ path: path.join(AUS, datei), fullPage: true });
        eintrag.screenshot = datei;
      } catch (e) {
        eintrag.ausnahme = String(e.message).slice(0, 200);
      }
      eintrag.konsole = [...sammel.konsole];
      ergebnis.tabs.push(eintrag);
      console.error('tab', tab, breite.name, eintrag.ausnahme ? 'AUSNAHME' : 'ok', eintrag.ueber ? eintrag.ueber.anzahl : '-', eintrag.konsole.length);
    }
    await context.close();
  }
}

async function apiJson(page, pfad) {
  return page.evaluate(async (p) => (await fetch('/dashboard' + p + (p.includes('?') ? '&' : '?') + 'token='
    + encodeURIComponent(localStorage.getItem('token') || ''))).json(), pfad);
}

async function deeplinksPruefen(browser, basis, eigenerHost) {
  const breite = BREITEN[0];
  const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
  await page.goto(basis + '/dashboard/?tab=status&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
  await bereit(page, 'status');
  const fahrzeuge = await apiJson(page, '/api/fleet/vehicles?status=active').catch(() => []);
  const wiki = await apiJson(page, '/api/wiki/pages').catch(() => ({ pages: [] }));
  const fleetCode = Array.isArray(fahrzeuge) && fahrzeuge[0] ? fahrzeuge[0].vehicleCode : null;
  const seite = wiki && wiki.pages && wiki.pages[0] ? wiki.pages[0] : null;

  const faelle = [
    { url: '?tab=drafts', tab: 'drafts' },
    { url: '?tab=documents', tab: 'documents' },
    { url: '?tab=banking-connect', tab: 'banking' },
    { url: '?tab=assets&assets_subtab=nebenkosten', tab: 'assets', param: 'assets_subtab',
      pruef: () => { const a = document.querySelector('.assets-subtabs .subtab-btn.active'); return !!a && /Nebenkosten/.test(a.textContent); } },
    { url: '?tab=fleet&fleet_code=' + encodeURIComponent(fleetCode || ''), tab: 'fleet', param: 'fleet_code',
      pruef: () => !!document.querySelector('[x-data="fleetDetailView"]') },
    /* wiki.js nimmt `page` nach dem Öffnen bewusst aus der Adresse (seit P2-2:
       „Nur beim ersten Aufruf folgen"). Neu laden und Zurück landen deshalb
       im Bereich Wiki (Übersicht) — geprüft wird dort der Bereich, beim
       Direktaufruf zusätzlich die geöffnete Seite. */
    { url: '?tab=wiki&page=' + encodeURIComponent(seite ? seite.slug : ''), tab: 'wiki',
      titel: seite ? seite.title : null, titelNurDirekt: true },
  ];

  for (const f of faelle) {
    const e = { url: f.url, erwartet: f.tab, schritte: {} };
    const pruefen = async (schritt) => {
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
      const ist = await page.evaluate(() => currentTab);
      let ok = ist === f.tab;
      if (ok && f.param) ok = await page.evaluate((p) => new URLSearchParams(location.search).has(p), f.param);
      if (ok && f.pruef) ok = await page.evaluate(f.pruef);
      if (ok && f.titel && (schritt === 'direkt' || !f.titelNurDirekt)) ok = await page.evaluate((t) =>
        (document.querySelector('#content .wiki-title')?.textContent || '').includes(t), f.titel);
      e.schritte[schritt] = ok ? 'ok' : 'FALSCH (' + ist + ')';
    };
    try {
      await page.goto(basis + '/dashboard/' + f.url, { waitUntil: 'domcontentloaded' });
      await pruefen('direkt');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await pruefen('neu laden');
      await page.locator('#hauptnav .nav-pill[data-tab="heute"]').click();
      await page.waitForSelector('#content[data-geladen="1"]', { timeout: 30000 }).catch(() => {});
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await pruefen('zurück');
    } catch (err) { e.ausnahme = String(err.message).slice(0, 200); }
    ergebnis.deeplinks.push(e);
    console.error('deeplink', f.url, JSON.stringify(e.schritte));
  }
  ergebnis.deeplinkKonsole = [...sammel.konsole];
  await context.close();
}

async function heutePruefen(browser, basis, eigenerHost) {
  const notiz = (name, ok, detail) => { ergebnis.heute.push({ name, ok, detail }); console.error('heute', name, ok, detail || ''); };
  const start = basis + '/dashboard/?tab=heute&token=' + encodeURIComponent(TOKEN);

  /* Desktop: „Mehr" öffnen/schließen */
  {
    const { context, page } = await seiteOeffnen(browser, BREITEN[1], eigenerHost);
    await page.goto(start, { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    const offen = () => page.evaluate(() => document.querySelector('.nav-mehr').open);
    await page.locator('.nav-mehr > summary').click();
    const a = await offen();
    await page.mouse.click(700, 600);
    const b = await offen();
    await page.locator('.nav-mehr > summary').click();
    const c = await offen();
    await page.keyboard.press('Escape');
    const d = await offen();
    notiz('Mehr: öffnet, schließt bei Klick außerhalb, öffnet, schließt mit Esc', a && !b && c && !d, [a, b, c, d].join('/'));
    await page.locator('.nav-mehr > summary').click();
    await page.locator('.nav-mehr-eintrag[data-tab="wiki"]').click();
    await page.waitForTimeout(1500);
    const sum = await page.evaluate(() => ({ text: document.querySelector('.nav-mehr-text').textContent,
      aktiv: document.querySelector('.nav-mehr > summary').classList.contains('active') }));
    notiz('Mehr: aktiver Tab aus „Mehr" steht in der Summary', sum.text === 'Wiki' && sum.aktiv, JSON.stringify(sum));

    /* Kurzzeile = Zähler der Handlungsbedarf-Karte */
    await page.goto(basis + '/dashboard/?tab=heute', { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    const kz = await page.evaluate(() => ({ kurz: document.querySelector('.hero-kurzzeile')?.textContent || '',
      chip: document.querySelector('.tu-handlung .card-head .chip')?.textContent || '' }));
    const n = (kz.chip.match(/\d+/) || [])[0];
    notiz('Kurzzeile nennt den Zähler der Handlungsbedarf-Karte', !!n && kz.kurz.startsWith(n + ' '), kz.kurz + ' | ' + kz.chip);
    await context.close();
  }

  /* Mobil: Briefing vollständig und Morgen/Abend (CP1-8), danach „Alle anzeigen" */
  {
    const { context, page } = await seiteOeffnen(browser, BREITEN[0], eigenerHost);
    await page.goto(start, { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    /* CP1-8: nichts gekürzt — jeder Abschnitt sichtbar, keine Zeile
       abgeschnitten, kein Aufklappknopf, keine Wetter-Kachel. */
    const voll = await page.evaluate(() => {
      const karte = document.querySelector('.tu-briefing');
      const abschnitte = [...karte.querySelectorAll('.hb-abschnitt')];
      const versteckt = abschnitte.filter(x => x.offsetParent === null).length;
      const abgeschnitten = [...karte.querySelectorAll('.zeile-titel, .zeile-sub, .hb-absatz, .hb-kopf, .hb-text p')]
        .filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1 || getComputedStyle(x).textOverflow === 'ellipsis').length;
      const knopf = karte.querySelectorAll('.hb-alle, .hb-voll').length;
      return { n: abschnitte.length, versteckt, abgeschnitten, knopf, wetter: !!karte.querySelector('.hb-wetter'),
        kachel: !!document.querySelector('.tu-kachel-ort') };
    });
    notiz('Briefing: alle Abschnitte sichtbar, nichts abgeschnitten', voll.n > 0 && !voll.versteckt && !voll.abgeschnitten && !voll.knopf && !voll.kachel,
      JSON.stringify(voll));
    /* Morgen/Abend: Abschnittstitel vergleichen. Ist das andere Briefing heute
       noch nicht da („Noch nicht zugestellt"), den Vortag wählen. */
    const titel = () => page.evaluate(() =>
      [...document.querySelectorAll('.tu-briefing .hb-titel')].map(x => x.textContent).join(' | ')
      || document.querySelector('.tu-briefing .hb-status, .tu-briefing .zustand')?.textContent || '');
    const vorher = await titel();
    const andere = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.tu-briefing .segment button')].find(x => x.getAttribute('aria-pressed') !== 'true');
      return b ? b.textContent : null;
    });
    if (andere) await page.locator('.tu-briefing .segment button', { hasText: andere }).click();
    if (!(await page.locator('.tu-briefing .hb-abschnitt').count())) {
      const zweiter = await page.evaluate(() => document.querySelectorAll('.tu-briefing .hb-tag option')[1]?.value || null);
      if (zweiter) await page.locator('.tu-briefing .hb-tag select').selectOption(zweiter);
    }
    const nachher = await titel();
    const emoji = await page.evaluate(() => /\p{Extended_Pictographic}/u.test(document.querySelector('.tu-briefing').innerText));
    notiz('Briefing: Morgen/Abend wechselt die Abschnitte, keine Emojis', !!andere && vorher !== nachher && !emoji,
      (andere || '—') + ' · ' + vorher.slice(0, 60) + ' → ' + nachher.slice(0, 60) + (emoji ? ' · EMOJI' : ''));

    await context.close();

    /* „Alle anzeigen": mit echten Daten, sonst mit 8 eingespielten Fahrzeugen
       (nur Antwort eines GET ersetzt, nichts geschrieben). */
    const versuch = async (mitDaten) => {
      const { context: c2, page: p2 } = await seiteOeffnen(browser, BREITEN[0], eigenerHost);
      if (mitDaten) {
        await p2.route('**/api/fleet/vehicles*', (route) => route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(Array.from({ length: 8 }, (_, i) => ({ vehicleCode: 'TEST-' + i, name: 'Testfahrzeug ' + (i + 1),
            tuevNextDueDate: new Date(Date.now() + (i * 9 - 10) * 86400000).toISOString().slice(0, 10) }))) }));
      }
      await p2.goto(start, { waitUntil: 'domcontentloaded' });
      await bereit(p2, 'heute');
      const knopf = p2.locator('.tu-handlung .tu-alle');
      if (!(await knopf.count())) { await c2.close(); return null; }
      const z1 = await p2.locator('.tu-handlung .list-row:visible').count();
      await knopf.click();
      const z2 = await p2.locator('.tu-handlung .list-row:visible').count();
      await p2.screenshot({ path: path.join(AUS, 'heute-alle-anzeigen-mobil-390.png'), fullPage: false });
      await c2.close();
      return { z1, z2, eingespielt: mitDaten };
    };
    let r = await versuch(false);
    if (!r) r = await versuch(true);
    notiz('Handlungsbedarf: „Alle {n} anzeigen" klappt auf', !!r && r.z1 === 5 && r.z2 > 5,
      r ? r.z1 + '→' + r.z2 + ' Zeilen' + (r.eingespielt ? ' (8 Testfahrzeuge eingespielt)' : '') : 'kein Knopf');
  }

  /* Simulierter 500 einer Quelle: nur die betroffene Karte zeigt den Fehler. */
  {
    const { context, page } = await seiteOeffnen(browser, BREITEN[0], eigenerHost);
    await page.route('**/api/calendar*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"test"}' }));
    await page.goto(start, { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    const st = await page.evaluate(() => {
      const f = (sel) => !!document.querySelector(sel + ' .zustand-fehler');
      return { termine: f('.tu-termine'), handlung: f('.tu-handlung'), gesundheit: f('.tu-gesundheit'),
        briefing: f('.tu-briefing'), offen: f('.tu-offen'),
        kachel: document.querySelector('.tu-kachel-termin .tile-wert')?.textContent || '' };
    });
    await page.screenshot({ path: path.join(AUS, 'heute-fehler-kalender-mobil-390.png'), fullPage: true });
    notiz('500 auf /api/calendar: Fehler nur in „Termine heute"', st.termine && !st.handlung && !st.gesundheit && !st.briefing && !st.offen, JSON.stringify(st));
    await context.close();
  }
}

/* CP1-9: Tagesbogen im Briefing, Tag (12:20) und Nacht (19:30) am 06.11.2026,
   Uhr per Playwright-Clock gestellt (Date fest, Timer laufen weiter).
   Prüft Bereitschaft, Sichtbarkeit, Sonne nur tags, Sterne nur nachts,
   Konsole, Überbreite und den Kontrast der Legende gegen den tatsächlichen
   Verlaufston an ihrer Stelle (gleiche Formel wie kontrast-pruefen.mjs). */
/* Messung des Tagesbogens im Browser (CP1-9, erweitert CP1-10). */
async function tbMessen(page) {
  return page.evaluate(() => {
      const tb = document.querySelector('.tu-briefing .tb');
      const sichtbar = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const wurzel = getComputedStyle(document.documentElement);
      const hex = (n) => wurzel.getPropertyValue(n).trim();
      const rgb = (t) => {
        if (t.startsWith('#')) return [1, 3, 5].map(i => parseInt(t.slice(i, i + 2), 16));
        return t.match(/[\d.]+/g).slice(0, 3).map(Number);
      };
      const lum = (c) => { const l = c.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const nacht = tb.classList.contains('nacht');
      const stops = nacht ? [[0, hex('--night-top')], [1, hex('--night-bottom')]]
        : [[0, hex('--sky-top')], [0.58, hex('--surface')], [1, hex('--sky-bottom')]];
      const r = tb.getBoundingClientRect();
      const grund = (el) => {
        const b = el.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (b.top + b.height / 2 - r.top) / r.height));
        let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
        const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
        const f = (t - t0) / (t1 - t0), a = rgb(c0), z = rgb(c1);
        return a.map((v, k) => Math.round(v + (z[k] - v) * Math.max(0, Math.min(1, f))));
      };
      const messen = (sel) => [...tb.querySelectorAll(sel)].map(el => ({ sel, text: el.textContent.trim().slice(0, 30),
        r: Math.round(ratio(rgb(getComputedStyle(el).color), grund(el)) * 100) / 100 }));
      const legende = [...messen('.legende span'), ...messen('.legende strong'), ...messen('.legende b')];
      const datum = [...messen('.tag'), ...messen('.datum'), ...messen('.ort')];
      return {
        sichtbar: sichtbar(tb), nacht, hoehe: Math.round(r.height),
        sonne: sichtbar(tb.querySelector('.tb-sonne')), sterne: sichtbar(tb.querySelector('.tb-sterne')),
        chip: tb.querySelector('.jetzt-text')?.textContent || '',
        legendeMin: Math.min(...legende.map(x => x.r)), datumMin: Math.min(...datum.map(x => x.r)), legende, datum,
        mond: !!tb.querySelector('.tb-mond') && getComputedStyle(tb.querySelector('.tb-mond')).display !== 'none',
        beschnitten: tb.querySelectorAll('[clip-path="url(#tbMondFenster)"]').length,
        tagZeile: tb.querySelector('.tag')?.textContent || '',
        legendeText: tb.querySelector('.legende')?.textContent.replace(/\s+/g, ' ') || '',
        spalten: getComputedStyle(tb).gridTemplateColumns.split(' ').length,
      };
  });
}

const TB_BREITEN = [
  { name: 'mobil', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
];
const TB_ZEITEN = [{ name: 'tag', iso: '2026-11-06T12:20:00+01:00' }, { name: 'nacht', iso: '2026-11-06T19:30:00+01:00' }];
ergebnis.tagesbogen = [];
async function tagesbogenPruefen(browser, basis, eigenerHost) {
  for (const breite of TB_BREITEN) {
    for (const zeit of TB_ZEITEN) {
      const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
      const e = { breite: breite.name, zeit: zeit.name };
      try {
        /* CP1-10: den 06.11. ausdrücklich wählen — das jüngste echte Briefing
           kann andere Sonnenzeiten haben (08.11.: Winnipeg, 14:29–23:57 Berlin). */
        await page.route(u => u.pathname.endsWith('/api/briefing') && u.searchParams.get('tage') === '7',
          r => r.continue({ url: r.request().url().replace('tage=7', 'tage=14') }));
        await page.clock.setFixedTime(new Date(zeit.iso));
        await page.goto(basis + '/dashboard/?tab=heute&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
        await bereit(page, 'heute');
        e.geladen = await page.evaluate(() => document.getElementById('content').dataset.geladen === '1');
        await page.selectOption('.tu-briefing .hb-tag select', '2026-11-06');
        await page.waitForTimeout(300);
        /* Kopfzeile mit Sonne und Mond hat nur das Morgenbriefing. */
        const morgen = page.locator('.tu-briefing .segment button[data-art="morgen"]');
        if (await morgen.getAttribute('aria-pressed') !== 'true') { await morgen.click(); await page.waitForTimeout(300); }
        await page.waitForSelector('.tu-briefing .tb', { timeout: 10000 });
        await page.waitForTimeout(2600);   // Bahn 1,6 s, Jetzt-Chip ab 1,5 s + 0,6 s
        Object.assign(e, await tbMessen(page));
        e.ueber = await ueberbreite(page);
        const datei = 'heute-' + breite.name + '-' + zeit.name + '.png';
        await page.screenshot({ path: path.join(AUS, datei), fullPage: true });
        e.screenshot = datei;
      } catch (err) { e.ausnahme = String(err.message).slice(0, 200); }
      e.konsole = [...sammel.konsole];
      const tagsOk = zeit.name === 'tag' ? (e.sonne && !e.sterne && !e.nacht) : (!e.sonne && e.sterne && e.nacht);
      e.ok = !e.ausnahme && e.geladen && e.sichtbar && tagsOk && !e.konsole.length && e.ueber && !e.ueber.anzahl && e.legendeMin >= 4.5 && e.datumMin >= 4.5
        && (breite.name === 'mobil' ? e.spalten === 1 : e.spalten === 2);
      ergebnis.tagesbogen.push(e);
      console.error('tagesbogen', breite.name, zeit.name, e.ok, JSON.stringify({ chip: e.chip, legendeMin: e.legendeMin, ueber: e.ueber && e.ueber.anzahl, konsole: e.konsole.length, ausnahme: e.ausnahme }));
      await context.close();
    }
  }
}

/* CP1-10: 31.10.2026 (Mond über Mitternacht: Aufgang 21:34, Untergang 13:12)
   um 12:00 (Morgenbriefing, Tag) und 23:00 (Abendbriefing, Nacht) sowie das
   Abendbriefing 05.11. um 19:30 (Bogen aus dem Morgenbriefing). Der 31.10.
   liegt außerhalb von ?tage=7; die Abfrage wird deshalb im Browser auf
   ?tage=14 umgeschrieben — echte Daten, nur ein längerer Zeitraum (GET). */
const AB_FAELLE = [
  { name: '3110-tag', iso: '2026-10-31T12:00:00+01:00', datum: '2026-10-31', art: 'morgen', nacht: false, mond: true, beschnitten: true },
  { name: '3110-nacht', iso: '2026-10-31T23:00:00+01:00', datum: '2026-10-31', art: 'abend', nacht: true, mond: true, beschnitten: true },
  { name: '0511-abend', iso: '2026-11-05T19:30:00+01:00', datum: '2026-11-05', art: 'abend', nacht: true, mond: false, beschnitten: false },
];
ergebnis.abendbogen = [];
async function abendbogenPruefen(browser, basis, eigenerHost) {
  for (const breite of TB_BREITEN) {
    for (const fall of AB_FAELLE) {
      const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
      const e = { breite: breite.name, fall: fall.name };
      try {
        await page.route(u => u.pathname.endsWith('/api/briefing') && u.searchParams.get('tage') === '7',
          r => r.continue({ url: r.request().url().replace('tage=7', 'tage=14') }));
        await page.clock.setFixedTime(new Date(fall.iso));
        await page.goto(basis + '/dashboard/?tab=heute&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
        await bereit(page, 'heute');
        e.geladen = await page.evaluate(() => document.getElementById('content').dataset.geladen === '1');
        await page.selectOption('.tu-briefing .hb-tag select', fall.datum);
        await page.waitForTimeout(300);
        const knopf = page.locator('.tu-briefing .segment button[data-art="' + fall.art + '"]');
        if (await knopf.getAttribute('aria-pressed') !== 'true') { await knopf.click(); await page.waitForTimeout(300); }
        await page.waitForSelector('.tu-briefing .tb', { timeout: 10000 });
        await page.waitForTimeout(2600);
        Object.assign(e, await tbMessen(page));
        e.ueber = await ueberbreite(page);
        const datei = 'heute-' + breite.name + '-' + fall.name + '.png';
        await page.screenshot({ path: path.join(AUS, datei), fullPage: true });
        e.screenshot = datei;
      } catch (err) { e.ausnahme = String(err.message).slice(0, 200); }
      e.konsole = [...sammel.konsole];
      const zustand = e.nacht === fall.nacht && e.sonne === !fall.nacht && e.sterne === fall.nacht && e.mond === fall.mond
        && (fall.beschnitten ? e.beschnitten === 4 : e.beschnitten === 0);
      e.ok = !e.ausnahme && e.geladen && e.sichtbar && zustand && !e.konsole.length && e.ueber && !e.ueber.anzahl
        && e.legendeMin >= 4.5 && e.datumMin >= 4.5 && (breite.name === 'mobil' ? e.spalten === 1 : e.spalten === 2);
      ergebnis.abendbogen.push(e);
      console.error('abendbogen', breite.name, fall.name, e.ok, JSON.stringify({ tag: e.tagZeile, chip: e.chip, legende: e.legendeText, legendeMin: e.legendeMin, datumMin: e.datumMin, mond: e.mond, beschnitten: e.beschnitten, ueber: e.ueber && e.ueber.anzahl, konsole: e.konsole, ausnahme: e.ausnahme }));
      await context.close();
    }
  }
}

/* CP1-11/CP1-12: Ortszeit. Die Antwort von /api/briefing (echt, GET) wird im
   Browser um ein Briefing aus der Fixture briefings-20261110-ortszeit.json
   ergänzt bzw. ersetzt. Uhr 09.11. 17:41Z (= 18:41 Berlin, 12:41 Winnipeg).
   Fall A: das echte 09.11. ohne Felder (Berliner Zeiten) → sichtbarer
   Rückfall „Zeiten in Berliner Zeit", Chip „jetzt 18:41 · Berlin".
   Fall B: Winnipeg 10.11. mit zeitzone/utcOffsetMin −300 → „jetzt 12:41 ·
   Ortszeit", Tag, Zustellchip „Zugestellt 07:00 Berlin · Telegram". */
const OZ_FIX = JSON.parse(fs.readFileSync(new URL('../fixtures/briefings-20261110-ortszeit.json', import.meta.url), 'utf8'));
const OZ_FAELLE = [
  { name: 'a-ohne-felder', briefing: OZ_FIX[0], chip: 'jetzt 18:41 · Berlin', ort: 'Winnipeg · Zeiten in Berliner Zeit · 9 h 26 min Tageslicht',
    tag: 'Montag · 07:00 Uhr', status: 'Zugestellt 07:00 · Telegram' },
  { name: 'b-mit-feldern', briefing: OZ_FIX[1], chip: 'jetzt 12:41 · Ortszeit', ort: 'Winnipeg · Ortszeit MEZ −6 h · 9 h 19 min Tageslicht',
    tag: 'Dienstag · 07:00 Uhr Berlin', status: 'Zugestellt 07:00 Berlin · Telegram' },
];
ergebnis.ortszeit = [];
async function ortszeitPruefen(browser, basis, eigenerHost) {
  for (const breite of BREITEN.filter(b => b.name === 'mobil-390' || b.name === 'desktop-1440')) {
    for (const fall of OZ_FAELLE) {
      const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
      const e = { breite: breite.name, fall: fall.name };
      try {
        await page.route(u => u.pathname.endsWith('/api/briefing') && u.searchParams.get('tage') === '7', async (r) => {
          const antwort = await r.fetch();
          const j = await antwort.json();
          const b = fall.briefing;
          const liste = (j.briefings || []).filter(x => !(x.art === b.art && x.datum === b.datum));
          await r.fulfill({ response: antwort, contentType: 'application/json', body: JSON.stringify({ ...j, briefings: [b, ...liste] }) });
        });
        await page.clock.setFixedTime(new Date('2026-11-09T17:41:00Z'));
        await page.goto(basis + '/dashboard/?tab=heute&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
        await bereit(page, 'heute');
        e.geladen = await page.evaluate(() => document.getElementById('content').dataset.geladen === '1');
        await page.selectOption('.tu-briefing .hb-tag select', fall.briefing.datum);
        await page.waitForTimeout(300);
        const knopf = page.locator('.tu-briefing .segment button[data-art="morgen"]');
        if (await knopf.getAttribute('aria-pressed') !== 'true') { await knopf.click(); await page.waitForTimeout(300); }
        await page.waitForSelector('.tu-briefing .tb', { timeout: 10000 });
        await page.waitForTimeout(2600);
        Object.assign(e, await tbMessen(page));
        Object.assign(e, await page.evaluate(() => {
          const tb = document.querySelector('.tu-briefing .tb');
          const chip = tb.querySelector('.jetzt-chip'), cr = chip.getBoundingClientRect(), hr = tb.querySelector('.himmel').getBoundingClientRect();
          const intl = new Intl.DateTimeFormat('de-DE', { timeZone: 'America/Winnipeg', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(Date.UTC(2026, 10, 9, 13, 30)));
          return { chipVoll: chip.textContent, ortZeile: tb.querySelector('.ort').textContent, tagVoll: tb.querySelector('.tag').textContent,
            statusText: document.querySelector('.tu-briefing .hb-status')?.textContent || '',
            chipImBild: cr.left >= hr.left - 1 && cr.right <= hr.right + 1, intlWinnipeg1330Z: intl };
        }));
        e.ueber = await ueberbreite(page);
        const datei = 'heute-' + breite.name + '-' + fall.name + '.png';
        await page.screenshot({ path: path.join(AUS, datei), fullPage: true });
        e.screenshot = datei;
      } catch (err) { e.ausnahme = String(err.message).slice(0, 200); }
      e.konsole = [...sammel.konsole];
      e.ok = !e.ausnahme && e.geladen && e.sichtbar && !e.nacht && e.sonne && !e.sterne && e.chipVoll === fall.chip && e.ortZeile === fall.ort
        && e.tagVoll === fall.tag && e.statusText === fall.status
        && e.chipImBild && !e.konsole.length && e.ueber && !e.ueber.anzahl && e.legendeMin >= 4.5 && e.datumMin >= 4.5
        && (breite.name.startsWith('mobil') ? e.spalten === 1 : e.spalten === 2);
      ergebnis.ortszeit.push(e);
      console.error('ortszeit', breite.name, fall.name, e.ok, JSON.stringify({ chip: e.chipVoll, ort: e.ortZeile, tag: e.tagVoll, status: e.statusText, imBild: e.chipImBild, intl: e.intlWinnipeg1330Z, legendeMin: e.legendeMin, datumMin: e.datumMin, ueber: e.ueber && e.ueber.anzahl, konsole: e.konsole, ausnahme: e.ausnahme }));
      await context.close();
    }
  }
}

/* CP2-0: Reisen-Karte der aktiven Reise. Uhr 12.11. 22:00Z. Misst die Höhe
   der Karte (Vergleich vorher/nachher) und prüft Aufklappen, Aktionsmenü,
   Emojis, Überbreite, Konsole und Kontrast. Nur GET; Schreibanfragen sperrt
   nurLesend(). */
ergebnis.reisen = [];
async function reisenPruefen(browser, basis, eigenerHost, nurMessen) {
  for (const breite of BREITEN) {
    const { context, page, sammel } = await seiteOeffnen(browser, breite, eigenerHost);
    const e = { breite: breite.name };
    try {
      await page.clock.setFixedTime(new Date('2026-11-12T22:00:00Z'));
      await page.goto(basis + '/dashboard/?tab=trips&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
      await bereit(page, 'trips');
      await page.waitForSelector('#content .trip-card.reise-neu', { timeout: 15000 });
      await page.waitForTimeout(500);
      const karte = '#content .trip-card.reise-neu';
      e.hoehe = await page.evaluate((sel) => Math.round(document.querySelector(sel).getBoundingClientRect().height), karte);
      const datei = 'reisen-' + breite.name + (nurMessen ? '-vorher' : '') + '.png';
      await page.screenshot({ path: path.join(AUS, datei), fullPage: true });
      e.screenshot = datei;
      if (!nurMessen) {
        e.stand = await page.evaluate((sel) => {
          const k = document.querySelector(sel);
          const emoji = (k.textContent.match(/\p{Extended_Pictographic}/gu) || []);
          const raster = getComputedStyle(k.querySelector('.reise-raster')).gridTemplateColumns;
          return { kopfZeile: k.querySelector('.reise-tagzeile')?.textContent.trim() || '',
            offenChip: k.querySelector('.reise-offen-chip')?.textContent.trim() || '',
            ziel: !!k.querySelector('.reise-ziel'), warnChipsKopf: k.querySelectorAll('.reise-kopf .reise-chips').length,
            naechst: k.querySelectorAll('.reise-naechst-kommend > .naechst').length,
            ueberfaellig: k.querySelector('.reise-ueberfaellig > summary')?.textContent.replace(/\s+/g, ' ').trim() || '',
            vergangen: k.querySelector('.tl-vergangen > summary')?.textContent.replace(/\s+/g, ' ').trim() || '',
            heuteLabel: k.querySelector('.tl-tag.heute .tl-heute')?.textContent.trim() || '',
            buchungen: k.querySelectorAll('.buchung').length, buchungsChips: k.querySelectorAll('.buchung .chip').length,
            primaer: [...k.querySelectorAll('.reise-knoepfe > .btn')].map(b => b.textContent.trim()),
            menue: [...k.querySelectorAll('.reise-mehr .reise-mehr-eintrag')].map(b => b.textContent.trim()),
            letzter: k.querySelector('.reise-raster').lastElementChild.className,
            spalten: raster.split(' ').length, emoji: emoji.length, emojiText: [...new Set(emoji)].join(''),
            teile: Object.fromEntries([['kopf', '.reise-kopf'], ['naechst', '.reise-naechst'], ['verlauf', '.reise-links > .reise-block:last-child'],
              ['buchungen', '.reise-rechts > .reise-block:first-child'], ['abschnitte', '.reise-abschnitte'], ['fuss', '.reise-rechts > .reise-fuss'], ['erledigt', '.reise-erledigt']]
              .map(([n, q]) => [n, [...k.querySelectorAll(q)].reduce((x, el) => x + Math.round(el.getBoundingClientRect().height), 0)])),
            tlTag: [...k.querySelectorAll('.tl-tag')].slice(0, 3).map(el => Math.round(el.getBoundingClientRect().height)),
            buchung: Math.round(k.querySelector('.buchung')?.getBoundingClientRect().height || 0) };
        }, karte);
        /* Aufklappen: jedes Ziel öffnet beim Antippen. */
        const auf = async (sel) => {
          const s = page.locator(karte + ' ' + sel + ' > summary').first();
          if (!(await s.count())) return 'fehlt';
          await s.scrollIntoViewIfNeeded(); await s.click(); await page.waitForTimeout(150);
          return await page.locator(karte + ' ' + sel).first().evaluate(d => d.open) ? 'ok' : 'zu';
        };
        e.aufklappen = { ueberfaellig: await auf('.reise-ueberfaellig'), vergangen: await auf('.tl-vergangen'),
          buchung: await auf('.buchung'), erledigt: await auf('.reise-erledigt'), alleFristen: await auf('.reise-naechst > .reise-klapp') };
        /* Aktionsmenü „…": öffnen, Klick außerhalb schließt, erneut öffnen, Esc schließt. */
        const menue = page.locator(karte + ' .reise-mehr');
        const offen = () => menue.evaluate(d => d.open);
        await menue.locator('summary').scrollIntoViewIfNeeded();
        await menue.locator('summary').click(); await page.waitForTimeout(100);
        const m1 = await offen();
        await page.locator(karte + ' .reise-titel').click({ position: { x: 2, y: 2 } }); await page.waitForTimeout(100);
        const m2 = await offen();
        await menue.locator('summary').click(); await page.waitForTimeout(100);
        const m3 = await offen();
        await page.keyboard.press('Escape'); await page.waitForTimeout(100);
        const m4 = await offen();
        e.menue = { auf: m1, aussenZu: !m2, wiederAuf: m3, escZu: !m4 };
        /* Kontrast der neuen Bausteine gegen ihren tatsächlichen Hintergrund. */
        e.kontrast = await page.evaluate((sel) => {
          const rgb = (t) => t.match(/[\d.]+/g).map(Number);
          const lum = (c) => { const l = c.slice(0, 3).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
          const grund = (el) => { for (let x = el; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c.length < 4 || c[3] > 0.5) { if (c.length < 4 || c[3] === 1 || c[3] > 0.5) return c; } } return [255, 255, 255]; };
          const ratio = (el) => { const a = lum(rgb(getComputedStyle(el).color)), b = lum(grund(el)); const [x, y] = [a, b].sort((p, q) => q - p); return Math.round((x + 0.05) / (y + 0.05) * 100) / 100; };
          const k = document.querySelector(sel);
          const liste = ['.reise-tagzeile', '.reise-offen-chip', '.reise-zeitraum', '.naechst-tag', '.naechst-titel', '.naechst-rest',
            '.reise-ueberfaellig > summary', '.tl-vergangen > summary', '.tl-heute', '.tl-datum', '.buchung-anbieter', '.buchung-zeile2',
            '.buchung .num', '.reise-erledigt > summary', '.reise-erledigt .chip', '.frist-gruppe-titel', '.frist-text', '.frist-rest', '.frist-tag', '.reise-mehr > summary', '.reise-mehr-eintrag', '.reise-knoepfe .btn-primary']
            .flatMap(s => [...k.querySelectorAll(s)].filter(el => el.getBoundingClientRect().width > 0).slice(0, 4).map(el => ({ s, r: ratio(el) })));
          return { min: Math.min(...liste.map(x => x.r)), schwach: liste.filter(x => x.r < 4.5) };
        }, karte);
      }
      e.ueber = await ueberbreite(page);
    } catch (err) { e.ausnahme = String(err.message).slice(0, 300); }
    e.konsole = [...sammel.konsole];
    const st = e.stand || {};
    e.ok = nurMessen ? !e.ausnahme : (!e.ausnahme && !e.konsole.length && e.ueber && !e.ueber.anzahl && !st.ziel && !st.warnChipsKopf && !st.emoji
      && Object.values(e.aufklappen || {}).every(v => v === 'ok') && e.menue && Object.values(e.menue).every(Boolean)
      && e.kontrast && e.kontrast.min >= 4.5 && (breite.name.startsWith('mobil') ? st.spalten === 1 : st.spalten === 2));
    ergebnis.reisen.push(e);
    console.error('reisen', breite.name, e.ok, JSON.stringify({ hoehe: e.hoehe, stand: e.stand, aufklappen: e.aufklappen, menue: e.menue, kontrast: e.kontrast, ueber: e.ueber && e.ueber.anzahl, konsole: e.konsole, ausnahme: e.ausnahme }));
    await context.close();
  }
}

async function liveSmoke(browser) {
  const host = new URL(ZIEL).host;
  for (const breite of BREITEN) {
    const { context, page, sammel } = await seiteOeffnen(browser, breite, host);
    await page.goto(ZIEL + '/dashboard/?tab=heute&token=' + encodeURIComponent(TOKEN), { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    const e = { tab: 'heute', breite: breite.name, ueber: await ueberbreite(page),
      manrope: await page.evaluate(() => document.fonts.check('15px Manrope')) };
    await page.screenshot({ path: path.join(AUS, 'live-01-heute-' + breite.name + '.png'), fullPage: true });
    e.screenshot = 'live-01-heute-' + breite.name + '.png';
    if (breite.name.startsWith('desktop')) {
      await page.goto(ZIEL + '/dashboard/?tab=assets', { waitUntil: 'domcontentloaded' });
      await bereit(page, 'assets');
      e.assets = await page.evaluate(() => ({ aktiv: currentTab, subtabs: !!document.querySelector('.assets-subtabs') }));
      await page.screenshot({ path: path.join(AUS, 'live-06-assets-' + breite.name + '.png'), fullPage: false });
    }
    e.konsole = [...sammel.konsole];
    ergebnis.tabs.push(e);
    console.error('live', breite.name, JSON.stringify({ ueber: e.ueber.anzahl, konsole: e.konsole.length, assets: e.assets }));
    await context.close();
  }
}

const browser = await chromium.launch();
let proxy = null;
try {
  if (LIVE) {
    await liveSmoke(browser);
  } else {
    proxy = await proxyStarten();
    const host = new URL(proxy.basis).host;
    const teile = NUR ? String(NUR).split(',') : ['tabs', 'deeplinks', 'heute', 'tagesbogen', 'abendbogen', 'ortszeit', 'reisen'];
    if (teile.includes('tabs')) await tabsPruefen(browser, proxy.basis, host, TABS);
    if (teile.includes('nurheute')) await tabsPruefen(browser, proxy.basis, host, ['heute']);
    if (teile.includes('deeplinks')) await deeplinksPruefen(browser, proxy.basis, host);
    if (teile.includes('heute')) await heutePruefen(browser, proxy.basis, host);
    if (teile.includes('tagesbogen')) await tagesbogenPruefen(browser, proxy.basis, host);
    if (teile.includes('abendbogen')) await abendbogenPruefen(browser, proxy.basis, host);
    if (teile.includes('ortszeit')) await ortszeitPruefen(browser, proxy.basis, host);
    if (teile.includes('reisenhoehe')) await reisenPruefen(browser, proxy.basis, host, true);
    if (teile.includes('reisen')) await reisenPruefen(browser, proxy.basis, host, false);
  }
} catch (e) {
  ergebnis.fehler.push(String(e.stack || e).slice(0, 500));
} finally {
  await browser.close();
  if (proxy) proxy.server.close();
}
ergebnis.ende = new Date().toISOString();
ergebnis.fremdeHosts = [...new Set(ergebnis.fremdeHosts)];
fs.writeFileSync(path.join(AUS, 'ergebnis.json'), JSON.stringify(ergebnis, null, 2));
const tabsFehler = ergebnis.tabs.filter(t => t.ausnahme || (t.ueber && t.ueber.anzahl) || (t.konsole && t.konsole.length)
  || t.manrope === false || (t.zusatz && !t.zusatz.ok));
console.log(JSON.stringify({ tabs: ergebnis.tabs.length, tabsMitBefund: tabsFehler.length, gesperrt: ergebnis.gesperrt.length,
  fremdeHosts: ergebnis.fremdeHosts.length,
  zusatz: ergebnis.tabs.filter(t => t.zusatz).map(t => [t.zusatz.name, t.breite, t.zusatz.ok, t.zusatz.detail]), deeplinks: ergebnis.deeplinks.map(d => d.schritte),
  heute: ergebnis.heute.map(h => [h.name, h.ok]),
  tagesbogen: ergebnis.tagesbogen.map(t => [t.breite, t.zeit, t.ok, t.chip, t.legendeMin, t.datumMin]),
  abendbogen: ergebnis.abendbogen.map(t => [t.breite, t.fall, t.ok, t.tagZeile, t.chip, t.legendeMin, t.datumMin]),
  ortszeit: ergebnis.ortszeit.map(t => [t.breite, t.fall, t.ok, t.chipVoll, t.legendeMin, t.datumMin]), fehler: ergebnis.fehler }, null, 1));
