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
const NUR = arg('nur', null);   // z. B. --nur=tabs,deeplinks,heute
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
  gesperrt: [], fremdeHosts: [], tabs: [], deeplinks: [], heute: [], fehler: [] };

function beobachten(page, sammel, eigenerHost) {
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' || /Content Security Policy/i.test(t)) sammel.konsole.push(t.slice(0, 300));
  });
  page.on('pageerror', e => sammel.konsole.push('pageerror: ' + String(e.message).slice(0, 300)));
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

  /* Mobil: Briefing Morgen/Abend, „Vollständig lesen", „Alle anzeigen" */
  {
    const { context, page } = await seiteOeffnen(browser, BREITEN[0], eigenerHost);
    await page.goto(start, { waitUntil: 'domcontentloaded' });
    await bereit(page, 'heute');
    const voll = page.locator('.tu-briefing .hb-voll');
    if (await voll.count()) {
      const h1 = await page.evaluate(() => document.querySelector('.tu-briefing .hb-text').getBoundingClientRect().height);
      await voll.click();
      const h2 = await page.evaluate(() => document.querySelector('.tu-briefing .hb-text').getBoundingClientRect().height);
      notiz('Briefing: „Vollständig lesen" klappt auf', h2 > h1, Math.round(h1) + '→' + Math.round(h2) + ' px');
    } else notiz('Briefing: „Vollständig lesen" klappt auf', null, 'kein Knopf (Text passt in 4 Zeilen)');
    const text = () => page.evaluate(() => document.querySelector('.tu-briefing .hb-text, .tu-briefing .zustand')?.textContent || '');
    const vorher = await text();
    const andere = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.tu-briefing .segment button')].find(x => x.getAttribute('aria-pressed') !== 'true');
      return b ? b.textContent : null;
    });
    if (andere) await page.locator('.tu-briefing .segment button', { hasText: andere }).click();
    const nachher = await text();
    notiz('Briefing: Morgen/Abend wechselt den Text', !!andere && vorher !== nachher, (andere || '—') + ' · ' + vorher.length + '→' + nachher.length + ' Zeichen');

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
    const teile = NUR ? String(NUR).split(',') : ['tabs', 'deeplinks', 'heute'];
    if (teile.includes('tabs')) await tabsPruefen(browser, proxy.basis, host, TABS);
    if (teile.includes('nurheute')) await tabsPruefen(browser, proxy.basis, host, ['heute']);
    if (teile.includes('deeplinks')) await deeplinksPruefen(browser, proxy.basis, host);
    if (teile.includes('heute')) await heutePruefen(browser, proxy.basis, host);
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
const tabsFehler = ergebnis.tabs.filter(t => t.ausnahme || (t.ueber && t.ueber.anzahl) || (t.konsole && t.konsole.length) || t.manrope === false);
console.log(JSON.stringify({ tabs: ergebnis.tabs.length, tabsMitBefund: tabsFehler.length, gesperrt: ergebnis.gesperrt.length,
  fremdeHosts: ergebnis.fremdeHosts.length, deeplinks: ergebnis.deeplinks.map(d => d.schritte),
  heute: ergebnis.heute.map(h => [h.name, h.ok]), fehler: ergebnis.fehler }, null, 1));
