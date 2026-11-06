/* ═══════════════════════════════════════════════════════════════════════════
   Tagesübersicht — Startansicht „Heute"
   Paket P2-5, neu aufgebaut in CP1 (Spec-Dashboard-Design-v2 §3, Variante A
   „Horizont")

   WAS DIESE ANSICHT IST
   Bildband mit Begrüßung, eine Navy-Karte „Handlungsbedarf" als Anker, dazu
   Gesundheit, Termine, Briefing, Wetter, Datenquellen und offene Punkte.
   Jede Handlungszeile führt per Klick in den Fachbereich.

   WAS SIE NICHT IST
   Keine Kennzahlenwand, kein Gesamtscore, keine Diagramme, keine Doppelung
   der Warnungen aus den Fachbereichen.

   DATENQUELLEN (alle lesend, unverändert seit P2-5)
     GET /api/heute/umfeld                       Standort, Sonne/Mond, Wetter
     GET /api/calendar                           Termine, 7-Tage-Fenster
     GET /api/health/alerts                      Gesundheitswarnungen
     GET /api/health?days=3                      letzte Messwerte
     GET /api/fleet/vehicles?status=active       TÜV-Fristen
     GET /api/dashboard/status                   Dienste, Token, Backup
     GET /api/sharepoint/sync-status             Alter des Dokumentenindex
     GET /api/instagram/media                    Alter des Medienbestands
     GET /api/banking/accounts                   Alter der Salden
     GET /api/assets/properties                  Objekte
     GET /api/assets/properties/:code/nk-period-obligations
     GET /api/briefing?tage=7                    Morgen- und Abendbriefing

   Kein sammelnder Endpunkt, kein neuer Speicher. Fällt eine Quelle aus,
   zeigt genau ihre Karte den Fehler (Promise.allSettled, Zustandsmatrix §3.10).

   SICHERHEIT
   Fremdtexte (Briefing, Terminnamen, Orte, Warnmeldungen) werden NIE per
   innerHTML eingesetzt, sondern als DOM-Knoten mit textContent. Mit
   'unsafe-inline' in der CSP wäre eingeschleustes HTML sonst ausführbar.
   innerHTML wird hier nur für zustandBlock() verwendet — dessen Texte sind
   eigene und laufen dort durch esc().

   BEREITSCHAFT
   Nach Promise.allSettled und dem Füllen aller Karten setzt loadHeute
   data-geladen="1" auf #content. Darauf warten die Abnahmetests.

   Abhängigkeiten: esc, fmtDate, fmtDT, apiFetch, stamp, showTab,
   BEREICHSPARAMETER, currentTab (index.html); datenstand.js; zeit.js;
   iconElement (nav.js).
   ═══════════════════════════════════════════════════════════════════════════ */

const HEUTE_FRIST_DRINGEND_TAGE = 30;
const HEUTE_FRIST_VORGEMERKT_TAGE = 90;
/* Mobil zeigt die Handlungsbedarf-Karte höchstens so viele Zeilen, der Rest
   klappt über „Alle {n} anzeigen" auf (§3.3). */
const HEUTE_HANDLUNG_MOBIL_MAX = 5;
const HEUTE_TERMINE_MAX = 6;
const HEUTE_OFFEN_MAX = 5;

/* Bildband aus dem Owner-Banner (Dropbox /Austausch/dashboard-design/
   linkedin-banner.png, 05.11.2026): public/img/hero-horizont-{m,d}.{jpg,webp}.
   false schaltet das Band auf die bildlose Fläche zurück — ein <picture> auf
   fehlende Dateien erzeugte sonst 404 in der Konsole. */
const HEUTE_BAND_BILD = true;

const HEUTE_STUFEN = {
  1: { label: 'Kritisch',   punkt: 'tu-punkt-rot' },
  2: { label: 'Dringend',   punkt: 'tu-punkt-gold' },
  3: { label: 'Offen',      punkt: 'tu-punkt-blau' },
  4: { label: 'Vorgemerkt', punkt: 'tu-punkt-blau' },
};

/* ── DOM-Helfer ───────────────────────────────────────────────────────────── */

/* Element mit Klasse und optionalem Text (immer textContent). */
function heuteEl(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

/* Eigene, bereits maskierte Bausteine (zustandBlock) als Knoten. */
function heuteHtmlKnoten(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}

function heuteSkelett(klasse, anzahl) {
  const f = document.createDocumentFragment();
  for (let i = 0; i < (anzahl || 1); i++) f.appendChild(heuteEl('span', 'skeleton ' + (klasse || '')));
  return f;
}

/* Karte mit Kopf (Titel + optionale Aktion rechts) und leerem Körper. */
function heuteKarte(klasse, titel, opt) {
  const o = opt || {};
  const karte = heuteEl('section', 'card ' + klasse + (o.navy ? ' card-navy' : ''));
  karte.setAttribute('aria-label', titel);
  const kopf = heuteEl('div', 'card-head');
  kopf.appendChild(heuteEl('h2', o.gesperrt ? 'label-gesperrt' : '', titel));
  if (o.ziel) {
    const link = heuteEl('button', 'btn btn-ghost', o.zielText);
    link.type = 'button';
    link.addEventListener('click', () => heuteSprung(o.ziel, {}));
    kopf.appendChild(link);
  }
  const koerper = heuteEl('div', 'tu-koerper');
  karte.append(kopf, koerper);
  return { karte, kopf, koerper };
}

function heuteFuellen(ziel, ...knoten) {
  ziel.replaceChildren(...knoten);
}

/* ── Zeit- und Texthilfen ─────────────────────────────────────────────────── */

function heuteRestTage(datum) {
  if (!datum) return null;
  const heute = zeitTagInZone(new Date(), ZEIT_ZONE);
  return zeitTageDifferenz(heute, String(datum).slice(0, 10));
}

/* "Di 06.11." */
function heuteTagKurz(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  if (!m) return 'Datum unklar';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const wochentag = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'short' }).format(d);
  return wochentag + ' ' + m[3] + '.' + m[2] + '.';
}

function heuteWochentag(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  if (!m) return '';
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'short' })
    .format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

function heuteRestText(tage) {
  if (tage === null) return 'ohne Datum';
  if (tage < 0) return 'seit ' + Math.abs(tage) + (Math.abs(tage) === 1 ? ' Tag' : ' Tagen') + ' überfällig';
  if (tage === 0) return 'heute fällig';
  if (tage === 1) return 'morgen fällig';
  return 'in ' + tage + ' Tagen';
}

function heuteStunde() {
  return Number(new Intl.DateTimeFormat('de-DE', { timeZone: ZEIT_ZONE, hour: '2-digit', hour12: false }).format(new Date()));
}

function heuteGruss() {
  const h = heuteStunde();
  return h < 11 ? 'Guten Morgen' : h >= 18 ? 'Guten Abend' : 'Guten Tag';
}

/* Sprung in einen Fachbereich samt Deeplink-Parametern. showTab() räumt die
   Bereichsparameter auf, wenn es selbst den Verlaufseintrag schreibt —
   deshalb wird die Adresse hier gesetzt und showTab() ohne Verlauf gerufen. */
function heuteSprung(tab, parameter) {
  const url = new URL(window.location.href);
  for (const p of BEREICHSPARAMETER) url.searchParams.delete(p);
  url.searchParams.set('tab', tab);
  url.searchParams.delete('token');
  for (const [k, v] of Object.entries(parameter || {})) {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  history.pushState({ tab }, '', url.pathname + (url.search || ''));
  showTab(tab, { verlauf: false });
}

/* ── Handlungsbedarf sammeln ──────────────────────────────────────────────── */

function heutePostenGesundheit(alerts) {
  if (!Array.isArray(alerts)) return [];
  return alerts
    .filter(a => a && (a.severity === 'critical' || a.severity === 'warning'))
    .map(a => ({
      stufe: a.severity === 'critical' ? 1 : 2,
      tage: null,
      bereich: 'Gesundheit',
      titel: a.message || 'Gesundheitswarnung',
      frist: a.severity === 'critical' ? 'kritische Abweichung' : 'Abweichung über mehrere Tage',
      ziel: { tab: 'health', parameter: {} },
    }));
}

function heutePostenFahrzeuge(fahrzeuge) {
  if (!Array.isArray(fahrzeuge)) return [];
  return fahrzeuge.map(f => {
    const frist = f.tuevNextDueDate || f.tuevDate || null;
    const ziel = { tab: 'fleet', parameter: { fleet_code: f.vehicleCode, fleet_subtab: 'tuev' } };
    if (!frist) {
      return { stufe: 3, tage: null, bereich: 'Fuhrpark',
        titel: (f.name || f.vehicleCode) + ': keine TÜV-Frist erfasst', frist: 'ohne Frist', ziel };
    }
    const tage = heuteRestTage(frist);
    const stufe = tage === null ? 3
      : tage < 0 ? 1
      : tage <= HEUTE_FRIST_DRINGEND_TAGE ? 2
      : tage <= HEUTE_FRIST_VORGEMERKT_TAGE ? 3
      : 4;
    return { stufe, tage, bereich: 'Fuhrpark',
      titel: 'TÜV ' + (f.name || f.vehicleCode) + ': ' + fmtDate(frist),
      frist: heuteRestText(tage), ziel };
  });
}

/* Nebenkosten erzeugen hier keinen Handlungsbedarf (Owner-Entscheidung
   10.10.2026): Die Abrechnungsreife ist ein Dauerzustand der Datenpflege und
   bleibt unter Immobilien → Nebenkosten / Abrechnungsreife sichtbar. */

function heutePostenSortieren(posten) {
  return posten.slice().sort((a, b) => (a.stufe - b.stufe)
    || ((a.tage === null ? 99999 : a.tage) - (b.tage === null ? 99999 : b.tage)));
}

/* ── Bildband und Kurzzeile ───────────────────────────────────────────────── */

function heuteBandSchliessen() {
  const band = document.getElementById('kopfBand');
  if (band) { band.replaceChildren(); band.hidden = true; }
  document.body.classList.remove('band-aktiv');
  const c = document.getElementById('content');
  if (c) delete c.dataset.geladen;
}

function heuteBandAufbauen() {
  const band = document.getElementById('kopfBand');
  if (!band) return null;
  const hero = heuteEl('div', 'hero' + (HEUTE_BAND_BILD ? '' : ' hero-ohne-bild'));
  if (HEUTE_BAND_BILD) {
    /* §3.1: mobil Ausschnitt rechts, Desktop Querformat; WebP zuerst. */
    const bild = document.createElement('picture');
    const quelle = (media, datei, typ) => {
      const s = document.createElement('source');
      s.media = media; s.srcset = '/dashboard/img/' + datei; if (typ) s.type = typ;
      return s;
    };
    bild.append(
      quelle('(min-width: 640px)', 'hero-horizont-d.webp', 'image/webp'),
      quelle('(min-width: 640px)', 'hero-horizont-d.jpg'),
      quelle('(max-width: 639.98px)', 'hero-horizont-m.webp', 'image/webp'));
    const img = document.createElement('img');
    img.src = '/dashboard/img/hero-horizont-m.jpg';
    img.alt = '';
    img.className = 'hero-bild';
    bild.appendChild(img);
    hero.appendChild(bild);
  }
  const text = heuteEl('div', 'hero-text');
  const datum = new Intl.DateTimeFormat('de-DE', {
    timeZone: ZEIT_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
  text.append(
    heuteEl('div', 'hero-datum', datum),
    heuteEl('div', 'hero-gruss', heuteGruss()),
    heuteEl('div', 'hero-kurzzeile'));
  hero.appendChild(text);
  band.replaceChildren(hero);
  band.hidden = false;
  document.body.classList.add('band-aktiv');
  return text.querySelector('.hero-kurzzeile');
}

/* §3.2: n ist exakt der Zähler der Handlungsbedarf-Karte. Zweiter Satz nur,
   wenn der Banking-Eintrag der Datenquellen grün ist. */
function heuteKurzzeile(n, bankingGruen) {
  const satz = n === 1 ? '1 Punkt braucht heute eine Entscheidung.'
    : n + ' Punkte brauchen heute eine Entscheidung.';
  return satz + (bankingGruen ? ' Konten abgeglichen.' : '');
}

/* ── Karten ───────────────────────────────────────────────────────────────── */

function heuteHandlungFuellen(k, posten, fehlend) {
  const sortiert = heutePostenSortieren(posten);
  const jetzt = sortiert.filter(p => p.stufe < 4);
  const spaeter = sortiert.filter(p => p.stufe >= 4);
  const n = jetzt.length;

  const chip = heuteEl('span', 'chip chip-info tu-zaehler', n + ' offen');
  k.kopf.querySelector('.chip')?.remove();
  k.kopf.appendChild(chip);

  const teile = [];
  for (const q of fehlend) {
    teile.push(heuteHtmlKnoten(zustandBlock('fehler', q + ' nicht abrufbar — die Liste kann unvollständig sein.')));
  }

  const zeile = (p, i) => {
    const li = heuteEl('li');
    const knopf = heuteEl('button', 'list-row ohne-zeit tu-hzeile' + (i >= HEUTE_HANDLUNG_MOBIL_MAX ? ' tu-ueber' : ''));
    knopf.type = 'button';
    knopf.appendChild(heuteEl('span', 'tu-punkt ' + (HEUTE_STUFEN[p.stufe] || HEUTE_STUFEN[3]).punkt));
    knopf.querySelector('.tu-punkt').setAttribute('aria-label', (HEUTE_STUFEN[p.stufe] || HEUTE_STUFEN[3]).label);
    const text = heuteEl('span', 'zeile-text');
    text.append(heuteEl('span', 'zeile-titel', p.titel), heuteEl('span', 'zeile-sub', p.bereich + ' · ' + p.frist));
    knopf.append(text, iconElement('chevron-right', 'ic-18'));
    knopf.addEventListener('click', () => heuteSprung(p.ziel.tab, p.ziel.parameter));
    li.appendChild(knopf);
    if (i >= HEUTE_HANDLUNG_MOBIL_MAX) li.className = 'tu-ueber';
    return li;
  };

  if (!n && !fehlend.length) {
    const leer = heuteEl('div', 'tu-leer');
    leer.append(iconElement('check'), heuteEl('span', '', 'Heute nichts zu entscheiden.'));
    teile.push(leer);
  } else if (n) {
    const liste = heuteEl('ul', 'list tu-hliste');
    jetzt.forEach((p, i) => liste.appendChild(zeile(p, i)));
    teile.push(liste);
    if (n > HEUTE_HANDLUNG_MOBIL_MAX) {
      const alle = heuteEl('button', 'btn btn-ghost tu-alle', 'Alle ' + n + ' anzeigen');
      alle.type = 'button';
      alle.setAttribute('aria-expanded', 'false');
      alle.addEventListener('click', () => {
        const offen = k.karte.classList.toggle('alle-offen');
        alle.setAttribute('aria-expanded', String(offen));
        alle.textContent = offen ? 'Weniger anzeigen' : 'Alle ' + n + ' anzeigen';
      });
      teile.push(alle);
    }
  }
  if (spaeter.length) {
    const d = heuteEl('details', 'tu-spaeter');
    d.appendChild(heuteEl('summary', '', 'Fristen über ' + HEUTE_FRIST_VORGEMERKT_TAGE + ' Tage anzeigen (' + spaeter.length + ')'));
    const liste = heuteEl('ul', 'list tu-hliste');
    spaeter.forEach((p) => liste.appendChild(zeile(p, 0)));
    d.appendChild(liste);
    teile.push(d);
  }
  heuteFuellen(k.koerper, ...teile);
  return n;
}

/* Termin-Hilfen: kalenderZeitraum() aus zeit.js liefert Tag, Zeittext, Dauer. */
function heuteTermineSortiert(events) {
  return events.map(ev => ({ ev, z: kalenderZeitraum(ev) })).sort((a, b) =>
    String(a.z.tagesSchluessel || '').localeCompare(String(b.z.tagesSchluessel || ''))
    || (a.z.ganztags === b.z.ganztags ? 0 : a.z.ganztags ? -1 : 1)
    || String(a.z.zeitText || '').localeCompare(String(b.z.zeitText || '')));
}

function heuteNaechsterTermin(events) {
  if (!Array.isArray(events)) return null;
  const jetzt = Date.now();
  const kandidaten = events.filter(ev => !ev.isAllDay)
    .map(ev => ({ ev, start: graphZeitpunkt(ev.start) }))
    .filter(x => x.start && x.start.getTime() >= jetzt)
    .sort((a, b) => a.start - b.start);
  return kandidaten[0] || null;
}

function heuteTile(klasse, label, icon) {
  const t = heuteEl('div', 'tile ' + (klasse || ''));
  const kopf = heuteEl('div', 'tile-label');
  if (icon) kopf.appendChild(iconElement(icon, 'ic-16'));
  kopf.appendChild(heuteEl('span', '', label));
  t.append(kopf, heuteEl('div', 'tile-wert'), heuteEl('div', 'tile-sub'));
  t.querySelector('.tile-wert').appendChild(heuteSkelett('skeleton-wert'));
  return t;
}

function heuteTileSetzen(t, wert, sub, opt) {
  const o = opt || {};
  const w = t.querySelector('.tile-wert');
  w.replaceChildren(document.createTextNode(wert));
  w.classList.toggle('wert-fehlt', wert === '—');
  w.classList.toggle('tile-wert-text', !!o.text);
  t.querySelector('.tile-sub').textContent = sub || '';
  if (o.titel) t.title = o.titel; else t.removeAttribute('title');
}

function heuteKachelnFuellen(kacheln, kalender, umfeld) {
  const [tTermin, tOrt] = kacheln;
  if (!Array.isArray(kalender)) {
    heuteTileSetzen(tTermin, '—', 'Kalender', { titel: 'Quelle nicht erreichbar' });
  } else {
    const n = heuteNaechsterTermin(kalender);
    if (!n) heuteTileSetzen(tTermin, 'Keine Termine', 'in den nächsten 7 Tagen', { text: true });
    else {
      const tag = zeitTagInZone(n.start, ZEIT_ZONE);
      const heute = zeitTagInZone(new Date(), ZEIT_ZONE);
      /* Countdown aus Zeitstempeln (zeit.js), nicht aus Uhrzeiten-Text:
         sonst verschiebt die Zone von Browser oder Server das Ergebnis. */
      const bis = zeitBisText(n.start.getTime(), Date.now());
      heuteTileSetzen(tTermin, zeitUhr(n.start),
        [tag === heute ? '' : heuteWochentag(tag), bis, n.ev.subject || '(kein Titel)'].filter(Boolean).join(' · '));
    }
  }
  const ort = umfeld && umfeld.ort && umfeld.ort.label ? umfeld.ort.label : 'Wetter';
  tOrt.querySelector('.tile-label span').textContent = ort;
  const w = umfeld && umfeld.wetter;
  if (!w || w.jetzt_grad == null) {
    heuteTileSetzen(tOrt, '—', '', { titel: 'Quelle nicht erreichbar' });
  } else {
    const sonne = umfeld.astro && umfeld.astro.sonnenuntergang ? ' · Sonne bis ' + umfeld.astro.sonnenuntergang : '';
    heuteTileSetzen(tOrt, w.jetzt_grad + ' °C', (w.jetzt_text || '') + sonne);
  }
}

/* Letzter Wert je Messart aus /api/health (neueste zuerst geliefert). */
function heuteLetzterWert(entries, typ) {
  return entries.filter(e => e && e.type === typ)
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0] || null;
}

function heuteGesundheitFuellen(k, entries) {
  if (!Array.isArray(entries)) {
    heuteFuellen(k.koerper, heuteHtmlKnoten(zustandBlock('fehler', 'Die Gesundheitsdaten sind nicht abrufbar.')));
    return;
  }
  const kurzDatum = (ts) => { const t = zeitTagInZone(new Date(ts), ZEIT_ZONE); return t ? heuteTagKurz(t) : ''; };
  const schlaf = heuteLetzterWert(entries, 'sleep');
  const hrv = heuteLetzterWert(entries, 'hrv');
  const schritte = heuteLetzterWert(entries, 'steps');
  const kacheln = heuteEl('div', 'tiles-3');
  const tS = heuteTile('', 'Schlaf');
  const tH = heuteTile('', 'HRV');
  const tF = heuteTile('', 'Schritte');
  heuteTileSetzen(tS, schlaf ? Number(schlaf.value).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h' : '—',
    schlaf ? kurzDatum(schlaf.timestamp) : 'keine Messung');
  heuteTileSetzen(tH, hrv ? Math.round(Number(hrv.value)) + ' ms' : '—', hrv ? kurzDatum(hrv.timestamp) : 'keine Messung');
  heuteTileSetzen(tF, schritte ? Number(schritte.value).toLocaleString('de-DE') : '—',
    schritte ? kurzDatum(schritte.timestamp) : 'keine Messung');
  kacheln.append(tS, tH, tF);
  heuteFuellen(k.koerper, kacheln);
}

function heuteTerminZeile(ev, z, folgetag) {
  const li = heuteEl('li', 'list-row' + (folgetag ? ' tu-folgetag' : ''));
  const zeit = folgetag ? heuteWochentag(z.tagesSchluessel)
    : z.ganztags ? 'ganzt.' : (z.zeitText.split(/[–-]/)[0] || '').trim();
  li.appendChild(heuteEl('span', 'tu-zeit' + (z.ganztags && !folgetag ? ' tu-zeit-klein' : ''), zeit));
  const text = heuteEl('span', 'zeile-text');
  const ort = ev.location && ev.location.displayName ? ev.location.displayName : '';
  /* Neben der Startzeit steht das Ende ausdruecklich ("bis 15:00 · 1 Std.").
     Eine nackte Dauer "1 Std." unter 14:00 las sich wie ein Countdown
     "in 1 h" (Owner-Befund 06.11.2026). */
  const ende = !z.ganztags && !z.mehrtaegig && !z.unplausibel ? graphZeitpunkt(ev.end) : null;
  /* Folgetag: links steht der Wochentag, also hier die volle Spanne. */
  const spanne = folgetag ? z.zeitText : 'bis ' + zeitUhr(ende);
  const dauer = ende ? spanne + (z.dauerText ? ' · ' + z.dauerText : '') : z.dauerText;
  const sub = [z.ganztags ? (z.mehrtaegig ? z.spanneText : 'ganztägig') : dauer, ort].filter(Boolean).join(' · ');
  text.appendChild(heuteEl('span', 'zeile-titel tu-termin-titel', ev.subject || '(kein Titel)'));
  if (sub) text.appendChild(heuteEl('span', 'zeile-sub', sub));
  if (z.unplausibel) text.appendChild(heuteEl('span', 'zeile-sub tu-warn', 'Zeitangabe unplausibel'));
  li.appendChild(text);
  return li;
}

function heuteTermineFuellen(k, events) {
  if (!Array.isArray(events)) {
    heuteFuellen(k.koerper, heuteHtmlKnoten(zustandBlock('fehler', 'Der Kalender ist nicht abrufbar. Es fehlen Termine — die Liste ist nicht leer.')));
    return;
  }
  const heute = zeitTagInZone(new Date(), ZEIT_ZONE);
  const morgen = zeitTagVerschieben(heute, 1);
  const alle = heuteTermineSortiert(events);
  const heuteListe = alle.filter(x => x.z.tagesSchluessel === heute);
  const folge = alle.filter(x => x.z.tagesSchluessel === morgen).slice(0, 2);
  const teile = [];
  if (!heuteListe.length) {
    teile.push(heuteHtmlKnoten(zustandBlock('keine_daten', 'Heute steht kein Termin im Kalender.')));
  } else {
    const liste = heuteEl('ul', 'list');
    heuteListe.slice(0, HEUTE_TERMINE_MAX).forEach(x => liste.appendChild(heuteTerminZeile(x.ev, x.z, false)));
    teile.push(liste);
  }
  if (folge.length) {
    const liste = heuteEl('ul', 'list tu-folgetag-liste');
    folge.forEach(x => liste.appendChild(heuteTerminZeile(x.ev, x.z, true)));
    teile.push(liste);
  }
  if (heuteListe.length > HEUTE_TERMINE_MAX) {
    const mehr = heuteEl('button', 'btn btn-ghost tu-alle', 'Alle Termine');
    mehr.type = 'button';
    mehr.addEventListener('click', () => heuteSprung('calendar', {}));
    teile.push(mehr);
  }
  heuteFuellen(k.koerper, ...teile);
}

/* ── Briefing ─────────────────────────────────────────────────────────────── */

let _heuteBriefings = [];
let _heuteBriefingWahl = null;   // { art, datum }
let _heuteBriefingKarte = null;

const HEUTE_BRIEFING_ART = { morgen: 'Morgen', abend: 'Abend' };
/* Mobil sichtbare Abschnitte; der Rest hinter „Alle Abschnitte". */
const HEUTE_BRIEFING_MOBIL_ABSCHNITTE = 2;

/* Der gespeicherte Text ist Telegram-HTML: Inhalt maskiert, einzige
   Auszeichnung <b>. Zerlegt in Absätze (Leerzeile) aus Stücken
   { text, fett }; einfache Umbrüche werden zu Leerzeichen (§3.7). Alles
   außer <b>/</b> bleibt TEXT — auch ein unmaskiert gespeichertes Element. */
function heuteBriefingAbsaetze(textHtml) {
  const entmaskiert = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const absaetze = [[]];
  let fett = false;
  for (const teil of String(textHtml || '').split(/(<\/?b>)/)) {
    if (teil === '<b>') { fett = true; continue; }
    if (teil === '</b>') { fett = false; continue; }
    const stuecke = entmaskiert(teil).split(/\n[ \t]*\n+/);
    stuecke.forEach((s, i) => {
      if (i > 0) absaetze.push([]);
      const text = s.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/[ \t]{2,}/g, ' ');
      if (text) absaetze[absaetze.length - 1].push({ text, fett });
    });
  }
  return absaetze
    .map(a => {
      const b = a.map(s => ({ ...s }));
      if (b.length) { b[0].text = b[0].text.replace(/^\s+/, ''); b[b.length - 1].text = b[b.length - 1].text.replace(/\s+$/, ''); }
      return b.filter(s => s.text);
    })
    .filter(a => a.length);
}

/* Absätze als DOM: <p> mit Textknoten und <strong>, nur textContent. */
function heuteBriefingTextKnoten(absaetze) {
  const box = document.createElement('div');
  box.className = 'hb-text';
  for (const absatz of absaetze) {
    const p = document.createElement('p');
    for (const s of absatz) {
      if (s.fett) { const b = document.createElement('strong'); b.textContent = s.text; p.appendChild(b); }
      else p.appendChild(document.createTextNode(s.text));
    }
    box.appendChild(p);
  }
  return box;
}

/* ── Briefing gegliedert (CP1-7) ──────────────────────────────────────────
   Der Core speichert nur den fertigen Telegram-Text (Tabelle briefings,
   Spalte text_html); eine Struktur gibt es dort nicht. Deshalb wird der Text
   hier nach seinen eigenen Marken zerlegt:
     <b>…</b>            Rubrik (Abschnittstitel)
     "• " / "- "         Eintrag
     eingerückte Zeile   eigener Eintrag (Kalender-Folgetermin, cc-Auftrag)
                         bzw. mit "→" Zusatz zum vorigen Eintrag (Posteingang)
     "Fr 06.11.  …"      Kalendertag, gilt für die folgenden Einträge
   Der erste Abschnitt (Datum, Ort, Sonne, Mond) wird zur Kopfzeile, „Wetter"
   entfällt (die Wetter-Karte deckt ihn ab). Emojis werden entfernt; 🔴 und
   ⚠️ werden vorher als Ton des Eintrags festgehalten.
   Rückgabe null = Format unbekannt → Anzeige wie bisher als Absätze. */
function heuteBriefingGliedern(textHtml) {
  const entmaskiert = String(textHtml || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  /* Pictogramme samt Variantenwähler, Verbinder und Hauttönen. Pfeile (→),
     Aufzählungszeichen und ≤ sind keine Pictogramme und bleiben. */
  const ohneEmoji = (t) => t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu, '')
    .replace(/\s+/g, ' ').trim();
  const zeilen = entmaskiert.split('\n');
  const rubrik = /^<b>(.*)<\/b>\s*$/;
  if (!zeilen.some(z => rubrik.test(z))) return null;

  const roh = [];
  let aktuell = null;
  for (const z of zeilen) {
    const m = rubrik.exec(z);
    if (m) { aktuell = { titelRoh: m[1], zeilen: [] }; roh.push(aktuell); continue; }
    if (!aktuell) { if (z.trim()) return null; continue; }   // Text vor der ersten Rubrik: unbekannt
    aktuell.zeilen.push(z);
  }

  const ergebnis = { kopf: null, abschnitte: [], ausgeblendet: [] };

  /* Kopfabschnitt: Titel mit ausgeschriebenem Datum ("Freitag, 6. November 2026"). */
  const datumMuster = /(\p{L}+, \d{1,2}\. \p{L}+ \d{4})/u;
  if (roh.length && datumMuster.test(roh[0].titelRoh)) {
    const k = roh.shift();
    const teile = [datumMuster.exec(k.titelRoh)[1]];
    for (const z of k.zeilen) {
      const t = z.trim();
      if (!t) continue;
      if (t.startsWith('📍')) teile.push(ohneEmoji(t));
      else if (t.startsWith('☀')) {
        const s = /Aufgang (\d{1,2}:\d\d).*Untergang (\d{1,2}:\d\d)/.exec(t);
        teile.push(s ? 'Sonne ' + s[1] + '–' + s[2] : ohneEmoji(t));
      } else if (/^[\u{1F311}-\u{1F318}]/u.test(t)) teile.push(ohneEmoji(t));   // Mondphase
      else if (t.startsWith('🌙')) continue;   // Mondauf-/-untergang: nur im Telegram-Text
      else teile.push(ohneEmoji(t));
    }
    ergebnis.kopf = teile.filter(Boolean).join(' · ');
  }

  const eintrag = (text, tag) => {
    const ton = /🔴/u.test(text) ? 'rot' : /⚠/u.test(text) ? 'gelb' : '';
    const t = ohneEmoji(text);
    let titel = t, sub = '';
    const zeit = /^(ganztägig|\d{1,2}:\d\d(?:–\d{1,2}:\d\d)?) (.+?)(?: \(([^()]*)\))?$/.exec(t);
    const frist = /^(.+): ((?:in \d+ Tag(?:en)?|heute|morgen|seit \d+ Tag(?:en)?)\b.*)$/.exec(t);
    const aktion = t.indexOf(' — Ihre Aktion: ');
    if (zeit) { titel = zeit[2]; sub = [tag, zeit[1], zeit[3]].filter(Boolean).join(' · '); }
    else if (aktion > 0) { titel = t.slice(0, aktion); sub = t.slice(aktion + 3); }
    else if (frist) { titel = frist[1]; sub = frist[2]; }
    else {
      /* Erster Doppelpunkt außerhalb von Klammern trennt Bezeichnung und Wert. */
      let tiefe = 0, stelle = -1;
      for (let i = 0; i < t.length - 1; i++) {
        if (t[i] === '(') tiefe++;
        else if (t[i] === ')') tiefe--;
        else if (t[i] === ':' && t[i + 1] === ' ' && tiefe === 0) { stelle = i; break; }
      }
      const strich = t.indexOf(' — ');
      if (stelle > 0) { titel = t.slice(0, stelle); sub = t.slice(stelle + 2); }
      else if (strich > 0) { titel = t.slice(0, strich); sub = t.slice(strich + 3); }
    }
    return { titel, sub, ton };
  };

  const abschnittNeu = (titel) => ({ titel, icon: heuteBriefingIcon(titel), eintraege: [], text: [] });

  for (const r of roh) {
    const titel = ohneEmoji(r.titelRoh);
    if (/^Wetter\b/.test(titel)) { ergebnis.ausgeblendet.push(titel); continue; }
    let a = abschnittNeu(titel);
    ergebnis.abschnitte.push(a);
    let tag = '';
    let nachLeerzeile = false;
    for (const z of r.zeilen) {
      if (!z.trim()) { nachLeerzeile = true; continue; }
      const eingerueckt = /^\s{2,}/.test(z);
      const t = z.trim();
      /* Abgesetzte Schlusszeile mit eigenem Symbol (z. B. "🔑 cc-Login: ok")
         gehört nicht zum Abschnitt davor. */
      if (nachLeerzeile && !eingerueckt && a.eintraege.length && /^\p{Extended_Pictographic}/u.test(t) && !t.startsWith('⚠')) {
        a = abschnittNeu('Sonstiges');
        ergebnis.abschnitte.push(a);
      }
      nachLeerzeile = false;
      const tagZeile = /^(Mo|Di|Mi|Do|Fr|Sa|So) (\d\d\.\d\d\.)\s+(.+)$/.exec(t);
      if (/^[•-] /.test(t) && !eingerueckt) a.eintraege.push(eintrag(t.slice(2), ''));
      else if (tagZeile && !eingerueckt) { tag = tagZeile[1] + ' ' + tagZeile[2]; a.eintraege.push(eintrag(tagZeile[3], tag)); }
      else if (eingerueckt && t.startsWith('→') && a.eintraege.length) {
        const vorher = a.eintraege[a.eintraege.length - 1];
        const zusatz = ohneEmoji(t.slice(1));
        vorher.sub = vorher.sub ? vorher.sub + ' · ' + zusatz : zusatz;
      } else if (eingerueckt) a.eintraege.push(eintrag(t, tag));
      else if (t.startsWith('⚠')) a.eintraege.push(eintrag(t, ''));
      else a.text.push(ohneEmoji(t));
    }
  }
  /* Ein Abschnitt mit Einträgen und einzelnen Textzeilen: die Textzeilen
     werden ebenfalls Einträge, damit nichts zwischen den Zeilen verloren geht. */
  for (const a of ergebnis.abschnitte) {
    if (a.eintraege.length && a.text.length) {
      a.eintraege.push(...a.text.map(t => eintrag(t, '')));
      a.text = [];
    }
    a.art = a.eintraege.length ? 'liste' : 'text';
  }
  ergebnis.abschnitte = ergebnis.abschnitte.filter(a => a.eintraege.length || a.text.length);
  return ergebnis.abschnitte.length ? ergebnis : null;
}

/* Abschnitt → Lucide-Symbol (docs/DESIGN.md, „Briefing"). */
function heuteBriefingIcon(titel) {
  const t = String(titel || '').toLowerCase();
  if (/posteingang|mail/.test(t)) return 'mail';
  if (/kalender|termine/.test(t)) return 'calendar';
  if (/cc-auftr|aufgaben|handlungsbedarf/.test(t)) return 'list-checks';
  if (/banking|finanzen|konten/.test(t)) return 'wallet';
  if (/trading/.test(t)) return 'trending-up';
  if (/reisen/.test(t)) return 'plane';
  if (/nk-|immobilien|objekte/.test(t)) return 'building';
  if (/fuhrpark/.test(t)) return 'car';
  if (/gesundheit/.test(t)) return 'heart-pulse';
  if (/fristen/.test(t)) return 'clock';
  return 'info';
}

/* Gegliedertes Briefing als DOM, ausschließlich textContent. */
function heuteBriefingGegliedertKnoten(g) {
  const box = heuteEl('div', 'hb-inhalt');
  if (g.kopf) box.appendChild(heuteEl('p', 'hb-kopf', g.kopf));
  g.abschnitte.forEach((a, i) => {
    const s = heuteEl('section', 'hb-abschnitt' + (i >= HEUTE_BRIEFING_MOBIL_ABSCHNITTE ? ' hb-ueber' : ''));
    const h = heuteEl('h3', 'hb-titel');
    h.append(iconElement(a.icon, 'ic-16'), heuteEl('span', '', a.titel));
    s.appendChild(h);
    if (a.art === 'liste') {
      const ul = heuteEl('ul', 'hb-liste');
      for (const e of a.eintraege) {
        const li = heuteEl('li', 'list-row ohne-zeit hb-zeile');
        const text = heuteEl('span', 'zeile-text');
        text.appendChild(heuteEl('span', 'zeile-titel', e.titel));
        if (e.sub) text.appendChild(heuteEl('span', 'zeile-sub', e.sub));
        li.appendChild(text);
        if (e.ton) {
          const p = heuteEl('span', 'tu-punkt hb-punkt-' + e.ton);
          p.setAttribute('role', 'img');
          p.setAttribute('aria-label', e.ton === 'rot' ? 'Kritisch' : 'Hinweis');
          li.appendChild(p);
        }
        ul.appendChild(li);
      }
      s.appendChild(ul);
    } else {
      s.appendChild(heuteEl('p', 'hb-absatz', a.text.join(' ')));
    }
    box.appendChild(s);
  });
  return box;
}

function heuteBriefingStatus(b) {
  if (b.status === 'gesendet') {
    const zeit = b.gesendetAt ? ' ' + zeitUhr(new Date(b.gesendetAt)) : '';
    const teile = ['Zugestellt' + zeit, 'Telegram'];
    if (b.mailOk === true) teile.push('Mail');
    if (b.mailOk === false) teile.push('Mail fehlgeschlagen');
    if (b.versuche > 1) teile.push('nachgeholt');
    return { klasse: 'chip-ok', text: teile.join(' · ') };
  }
  if (b.status === 'erzeugt') return { klasse: 'chip-warn', text: 'Erzeugt, Zustellung an Telegram fehlgeschlagen' };
  return { klasse: 'chip-err', text: 'Ausgefallen' + (b.fehler ? ': ' + b.fehler : '') };
}

/* Voreinstellung: das jüngste Briefing — abends also das Abendbriefing. */
function heuteBriefingVorwahl(liste) {
  if (!liste.length) return null;
  const neuestes = [...liste].sort((a, b) =>
    String(b.gesendetAt || b.erzeugtAt).localeCompare(String(a.gesendetAt || a.erzeugtAt)))[0];
  return { art: neuestes.art, datum: neuestes.datum };
}

function heuteBriefingInhalt() {
  const k = _heuteBriefingKarte;
  if (!k) return;
  const liste = _heuteBriefings;
  const wahl = _heuteBriefingWahl;

  /* Segment Morgen/Abend im Kartenkopf */
  let segment = k.kopf.querySelector('.segment');
  if (!segment) {
    segment = heuteEl('div', 'segment');
    segment.setAttribute('role', 'group');
    segment.setAttribute('aria-label', 'Briefing-Art');
    for (const art of ['morgen', 'abend']) {
      const b = heuteEl('button', '', HEUTE_BRIEFING_ART[art]);
      b.type = 'button';
      b.dataset.art = art;
      b.addEventListener('click', () => heuteBriefingWaehle(art, null));
      segment.appendChild(b);
    }
    k.kopf.appendChild(segment);
  }
  segment.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(!!wahl && wahl.art === b.dataset.art)));

  const teile = [];
  const b = wahl ? liste.find(x => x.art === wahl.art && x.datum === wahl.datum) : null;
  const istHeute = !!wahl && wahl.datum === zeitTagInZone(new Date(), ZEIT_ZONE);
  if (!b && istHeute) {
    /* Heute noch nicht dran (z. B. Abendbriefing am Vormittag): kein Fehler. */
    teile.push(heuteEl('div', 'chip chip-neutral hb-status', 'Noch nicht zugestellt'));
    teile.push(heuteEl('p', 'hb-kopf', wahl.art === 'abend'
      ? 'Das Abendbriefing kommt um 21:00 Uhr.' : 'Das Morgenbriefing kommt um 07:00 Uhr.'));
  } else if (!b) {
    teile.push(heuteHtmlKnoten(zustandBlock('keine_daten', 'Kein Briefing für diesen Tag.',
      { titel: 'Kein ' + (wahl && wahl.art === 'abend' ? 'Abendbriefing' : 'Morgenbriefing') })));
  } else {
    const st = heuteBriefingStatus(b);
    teile.push(heuteEl('div', 'chip ' + st.klasse + ' hb-status', st.text));
    let gegliedert = null;
    try { gegliedert = b.textHtml ? heuteBriefingGliedern(b.textHtml) : null; } catch { gegliedert = null; }
    if (gegliedert) {
      const inhalt = heuteBriefingGegliedertKnoten(gegliedert);
      teile.push(inhalt);
      if (gegliedert.abschnitte.length > HEUTE_BRIEFING_MOBIL_ABSCHNITTE) {
        const alle = heuteEl('button', 'btn btn-ghost hb-alle', 'Alle Abschnitte');
        alle.type = 'button';
        alle.setAttribute('aria-expanded', 'false');
        alle.addEventListener('click', () => {
          const offen = inhalt.classList.toggle('offen');
          alle.setAttribute('aria-expanded', String(offen));
          alle.textContent = offen ? 'Weniger anzeigen' : 'Alle Abschnitte';
        });
        teile.push(alle);
      }
    } else if (b.textHtml) {
      /* Fallback: unbekanntes Format → Absätze wie bis CP1-6. */
      const text = heuteBriefingTextKnoten(heuteBriefingAbsaetze(b.textHtml));
      teile.push(text);
      const voll = heuteEl('button', 'btn btn-ghost hb-voll', 'Vollständig lesen');
      voll.type = 'button';
      voll.setAttribute('aria-expanded', 'false');
      voll.addEventListener('click', () => {
        const offen = text.classList.toggle('offen');
        voll.setAttribute('aria-expanded', String(offen));
        voll.textContent = offen ? 'Weniger anzeigen' : 'Vollständig lesen';
      });
      teile.push(voll);
    }
  }

  /* Tagesauswahl unter dem Text */
  const tage = [...new Set(liste.map(x => x.datum))].sort().reverse();
  const feld = heuteEl('label', 'field hb-tag');
  feld.appendChild(heuteEl('span', 'field-label', 'Tag'));
  const select = heuteEl('select', 'select');
  select.setAttribute('aria-label', 'Tag des Briefings');
  for (const d of tage) {
    const o = heuteEl('option', '', heuteTagKurz(d));
    o.value = d;
    if (wahl && wahl.datum === d) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => heuteBriefingWaehle(null, select.value));
  feld.appendChild(select);
  teile.push(feld);

  heuteFuellen(k.koerper, ...teile);
  /* „Vollständig lesen" nur zeigen, wenn die Kürzung greift (mobil 4 Zeilen). */
  const text = k.koerper.querySelector('.hb-text');
  const voll = k.koerper.querySelector('.hb-voll');
  if (text && voll) voll.hidden = text.scrollHeight <= text.clientHeight + 2;
}

function heuteBriefingBlock(k, liste) {
  _heuteBriefingKarte = k;
  if (!Array.isArray(liste)) {
    heuteFuellen(k.koerper, heuteHtmlKnoten(zustandBlock('fehler', 'Briefings nicht abrufbar.')));
    return;
  }
  _heuteBriefings = liste;
  _heuteBriefingWahl = heuteBriefingVorwahl(liste);
  if (!_heuteBriefingWahl) {
    heuteFuellen(k.koerper, heuteHtmlKnoten(zustandBlock('keine_daten', 'Noch kein Briefing gespeichert. Das erste Abendbriefing kommt um 21:00 Uhr, das erste Morgenbriefing um 07:00 Uhr.')));
    return;
  }
  heuteBriefingInhalt();
}

/* Klick auf Segment oder Tagesauswahl. null = diesen Teil der Wahl behalten. */
function heuteBriefingWaehle(art, datum) {
  if (!_heuteBriefingWahl) return;
  _heuteBriefingWahl = { art: art || _heuteBriefingWahl.art, datum: datum || _heuteBriefingWahl.datum };
  heuteBriefingInhalt();
}

/* ── Wetter (ab 640 px) ───────────────────────────────────────────────────── */

function heuteWetterFuellen(k, u) {
  const w = u && u.wetter;
  const a = u && u.astro;
  const ort = u && u.ort && u.ort.label ? u.ort.label : 'Standort unbekannt';
  const zeile = heuteEl('div', 'tu-wetter-zeile');
  const tag = a && a.sonnenaufgang && a.sonnenuntergang
    ? (() => { const jetzt = zeitUhr(new Date()); return jetzt >= a.sonnenaufgang && jetzt < a.sonnenuntergang; })()
    : heuteStunde() >= 7 && heuteStunde() < 18;
  const symbol = heuteEl('span', 'tu-wetter-symbol');
  symbol.appendChild(iconElement(tag ? 'sun' : 'moon'));
  const werte = heuteEl('div', 'tu-wetter-werte');
  if (!w || w.jetzt_grad == null) {
    const grad = heuteEl('div', 'tu-wetter-grad wert-fehlt', '—');
    grad.title = 'Quelle nicht erreichbar';
    werte.append(grad, heuteEl('div', 'tu-wetter-ort', ort));
  } else {
    werte.append(heuteEl('div', 'tu-wetter-grad', w.jetzt_grad + ' °C'),
      heuteEl('div', 'tu-wetter-ort', ort + ' · ' + (w.jetzt_text || '')));
  }
  zeile.append(symbol, werte);
  const teile = [zeile];
  if (w && Array.isArray(w.tage) && w.tage.length) {
    const namen = ['Heute', 'Morgen'];
    const tageText = w.tage.slice(0, 3).map((t, i) => (namen[i] || heuteWochentag(t.datum))
      + ' ' + (t.min != null && t.max != null ? t.min + '–' + t.max + '°' : '—')).join(' · ');
    const sonne = a && a.sonnenaufgang ? 'Sonne ' + a.sonnenaufgang + '–' + (a.sonnenuntergang || '–') + ' · ' : '';
    teile.push(heuteEl('div', 'tu-wetter-tage', sonne + tageText));
  }
  heuteFuellen(k.koerper, ...teile);
}

/* ── Datenquellen ─────────────────────────────────────────────────────────── */

/* A7 (Phase 3): Die Statusquelle mischt live geprüfte und gespeicherte
   Zustände. Ein gespeicherter Zustand ist keine Aussage über jetzt und darf
   nicht grün erscheinen. */
function heuteQuelleSystemstatus(status) {
  if (!status) {
    return { kurz: 'Systemstatus', quelle: 'Systemstatus (Core)', zustand: 'getrennt', stand: null,
      hinweis: 'Statusquelle nicht erreichbar.' };
  }
  const dienste = status.services || [];
  const live = dienste.filter(d => d.source === 'live');
  const gespeichert = dienste.filter(d => d.source !== 'live');
  const aeltester = gespeichert.map(d => d.checked_at).filter(Boolean).sort()[0] || null;
  const nichtOben = dienste.filter(d => d.status !== 'up').length;
  let satz = live.length + (live.length === 1 ? ' Dienst live geprüft' : ' Dienste live geprüft');
  if (gespeichert.length) {
    satz += ', ' + gespeichert.length + (gespeichert.length === 1 ? ' gespeicherter Zustand' : ' gespeicherte Zustände')
      + (aeltester ? ' (ältester vom ' + fmtDate(aeltester) + ')' : '');
  }
  satz += '.';
  if (nichtOben) satz += ' ' + nichtOben + (nichtOben === 1 ? ' Dienst' : ' Dienste') + ' nicht auf „läuft“.';
  return {
    kurz: 'Systemstatus', quelle: 'Systemstatus (Core)',
    zustand: status._stale || gespeichert.length ? 'degradiert' : 'aktuell',
    stand: status.timestamp || null, abgleich: aeltester, hinweis: satz,
  };
}

function heuteQuellenBewerten(quellen) {
  const rang = { getrennt: 0, unbekannt: 1, veraltet: 2, degradiert: 3, aktuell: 4, erreichbar: 4 };
  return quellen.map(q => ({ ...q, _code: q.zustand || (q.live ? 'aktuell' : datenstandZustand(q.stand, q.schwelleTage)) }))
    .sort((a, b) => (rang[a._code] ?? 9) - (rang[b._code] ?? 9));
}

function heuteQuellenFuellen(k, bewertet) {
  const aktuell = bewertet.filter(q => q._code === 'aktuell' || q._code === 'erreichbar').length;
  k.kopf.querySelector('.chip')?.remove();
  k.kopf.appendChild(heuteEl('span', 'chip ' + (aktuell === bewertet.length ? 'chip-ok' : 'chip-warn'),
    aktuell + ' von ' + bewertet.length + ' aktuell'));
  const reihe = heuteEl('div', 'chip-row');
  for (const q of bewertet) {
    let klasse = 'chip-neutral tu-quelle-ok';
    let text = q.kurz;
    if (q._code === 'getrennt') { klasse = 'chip-err'; text += ' · nicht erreichbar'; }
    else if (q._code === 'veraltet') { klasse = 'chip-warn'; text += ' · ' + datenstandAlterTage(q.stand) + ' Tage'; }
    else if (q._code === 'unbekannt') { klasse = 'chip-warn'; text += ' · Alter unbekannt'; }
    else if (q._code === 'degradiert') { klasse = 'chip-warn'; text += ' · eingeschränkt'; }
    const chip = heuteEl('span', 'chip ' + klasse);
    chip.appendChild(heuteEl('span', '', text));
    /* Die frühere Textkarte steckt vollständig im Tooltip. */
    chip.title = [q.quelle, zustandsEintrag(q._code).label,
      q.stand ? 'Datenstand ' + datenstandZeitpunktText(q.stand) : null, q.hinweis].filter(Boolean).join(' · ');
    reihe.appendChild(chip);
  }
  heuteFuellen(k.koerper, reihe);
}

/* ── Offene Punkte ────────────────────────────────────────────────────────── */

function heuteOffenFuellen(k, punkte) {
  if (!punkte.length) {
    heuteFuellen(k.koerper, heuteHtmlKnoten(zustandBlock('keine_daten', 'Keine offenen Punkte')));
    return;
  }
  const liste = heuteEl('ul', 'list');
  punkte.forEach((p, i) => {
    const li = heuteEl('li', 'list-row ohne-zeit tu-offen-zeile' + (i >= HEUTE_OFFEN_MAX ? ' tu-ueber' : ''));
    const text = heuteEl('span', 'zeile-text');
    text.append(heuteEl('span', 'zeile-titel tu-offen-titel', p.titel), heuteEl('span', 'zeile-sub tu-umbruch', p.text));
    li.appendChild(text);
    liste.appendChild(li);
  });
  const teile = [liste];
  if (punkte.length > HEUTE_OFFEN_MAX) {
    const alle = heuteEl('button', 'btn btn-ghost tu-alle', 'Alle anzeigen');
    alle.type = 'button';
    alle.addEventListener('click', () => { k.karte.classList.add('alle-offen'); alle.remove(); });
    teile.push(alle);
  }
  heuteFuellen(k.koerper, ...teile);
}

/* ── Laden ────────────────────────────────────────────────────────────────── */

async function loadHeute() {
  const c = document.getElementById('content');
  delete c.dataset.geladen;
  const wert = (r) => (r.status === 'fulfilled' ? r.value : null);

  /* 1. Gerüst mit Ladezuständen (§3.10) — DOM-Reihenfolge = mobile Reihenfolge. */
  const kurzzeile = heuteBandAufbauen();
  const raster = heuteEl('div', 'tu-raster');
  const kH = heuteKarte('tu-handlung', 'Handlungsbedarf', { navy: true, gesperrt: true });
  kH.koerper.appendChild(heuteSkelett('skeleton-zeile', 3));
  const kacheln = heuteEl('div', 'tiles-2 tu-kacheln');
  const tTermin = heuteTile('tu-kachel-termin', 'Nächster Termin', 'calendar');
  const tOrt = heuteTile('tu-kachel-ort', 'Wetter', 'sun');
  kacheln.append(tTermin, tOrt);
  const kW = heuteKarte('tu-wetter', 'Wetter');
  kW.koerper.appendChild(heuteSkelett('skeleton-wert'));
  const kG = heuteKarte('tu-gesundheit', 'Gesundheit', { ziel: 'health', zielText: 'Details' });
  const skG = heuteEl('div', 'tiles-3');
  for (let i = 0; i < 3; i++) skG.appendChild(heuteSkelett('skeleton-kachel'));
  kG.koerper.appendChild(skG);
  const kT = heuteKarte('tu-termine', 'Termine heute', { ziel: 'calendar', zielText: 'Kalender' });
  kT.koerper.appendChild(heuteSkelett('skeleton-zeile', 3));
  const kB = heuteKarte('tu-briefing', 'Briefing');
  kB.koerper.appendChild(heuteSkelett('skeleton-absatz'));
  const kQ = heuteKarte('tu-quellen', 'Datenquellen');
  kQ.koerper.appendChild(heuteSkelett('skeleton-chip', 4));
  const kO = heuteKarte('tu-offen', 'Offene Punkte');
  kO.koerper.appendChild(heuteSkelett('skeleton-zeile', 2));
  raster.append(kH.karte, kacheln, kW.karte, kG.karte, kT.karte, kB.karte, kQ.karte, kO.karte);
  c.replaceChildren(raster);

  /* 2. Abrufe — unverändert seit P2-5. */
  const [rUmfeld, rKalender, rAlerts, rHealth, rFahrzeuge, rStatus, rSp, rInsta, rKonten, rObjekte, rBriefing]
    = await Promise.allSettled([
      apiFetch('/api/heute/umfeld'),
      apiFetch('/api/calendar'),
      apiFetch('/api/health/alerts'),
      apiFetch('/api/health?days=3'),
      apiFetch('/api/fleet/vehicles?status=active'),
      apiFetch('/api/dashboard/status'),
      apiFetch('/api/sharepoint/sync-status'),
      apiFetch('/api/instagram/media'),
      apiFetch('/api/banking/accounts'),
      apiFetch('/api/assets/properties'),
      apiFetch('/api/briefing?tage=7'),
    ]);
  /* Inzwischen in einen anderen Bereich gewechselt: nichts überschreiben. */
  if (currentTab !== 'heute' || !c.contains(raster)) return;

  const umfeld = wert(rUmfeld);
  const kalender = wert(rKalender);
  const alerts = wert(rAlerts);
  const health = wert(rHealth);
  const fahrzeuge = wert(rFahrzeuge);
  const status = wert(rStatus);
  const spSync = wert(rSp);
  const insta = wert(rInsta);
  const konten = wert(rKonten);
  const objekte = wert(rObjekte);
  const briefing = wert(rBriefing);

  /* 3. Karten füllen — jede nur aus ihren eigenen Quellen. */
  const fehlend = [];
  if (!Array.isArray(alerts)) fehlend.push('Gesundheitswarnungen');
  if (!Array.isArray(fahrzeuge)) fehlend.push('TÜV-Fristen');
  const n = heuteHandlungFuellen(kH, [...heutePostenGesundheit(alerts), ...heutePostenFahrzeuge(fahrzeuge)], fehlend);
  heuteKachelnFuellen([tTermin, tOrt], kalender, umfeld);
  heuteWetterFuellen(kW, umfeld);
  heuteGesundheitFuellen(kG, health);
  heuteTermineFuellen(kT, kalender);
  heuteBriefingBlock(kB, briefing && briefing.briefings);

  const letzterKontoAbgleich = Array.isArray(konten)
    ? (konten.map(k => k.lastSyncAt).filter(Boolean).sort().slice(-1)[0] || null) : null;
  const letzteHealthMessung = Array.isArray(health) && health.length
    ? health.map(e => e.timestamp).filter(Boolean).sort().slice(-1)[0] : null;
  const quellen = heuteQuellenBewerten([
    { kurz: 'Kalender', quelle: 'Kalender (Microsoft 365)', zustand: Array.isArray(kalender) ? 'aktuell' : 'getrennt',
      live: Array.isArray(kalender), stand: new Date().toISOString(),
      hinweis: Array.isArray(kalender) ? kalender.length + ' Termine im 7-Tage-Fenster.' : 'Abruf fehlgeschlagen.' },
    { kurz: 'Gesundheit', quelle: 'Gesundheit (Oura, Withings)', stand: letzteHealthMessung, schwelleTage: 2,
      zustand: Array.isArray(health) ? undefined : 'getrennt', hinweis: 'Ein automatischer Abgleich findet nicht statt.' },
    { kurz: 'Banking', quelle: 'Bankkonten (FinTS)', stand: letzterKontoAbgleich,
      zustand: Array.isArray(konten) ? undefined : 'getrennt',
      hinweis: 'Stand des letzten Abgleichs, nicht des letzten Verbindungsaufbaus.' },
    { kurz: 'SharePoint', quelle: 'SharePoint-Dokumentenindex',
      stand: spSync ? (spSync.last_success_at || spSync.last_run?.finished_at || null) : null,
      zustand: spSync ? undefined : 'getrennt',
      hinweis: spSync && spSync.active_files != null ? Number(spSync.active_files).toLocaleString('de-DE') + ' Dateien im Index.' : undefined },
    { kurz: 'Instagram', quelle: 'Instagram-Medien', stand: insta ? (insta.datenstand || insta.fetched_at || null) : null,
      zustand: insta ? undefined : 'getrennt', hinweis: 'Abgleich nur manuell per /instasync im Telegram-Bot.' },
    heuteQuelleSystemstatus(status),
    { kurz: 'Fuhrpark', quelle: 'Fuhrpark (Fristen)', live: Array.isArray(fahrzeuge),
      zustand: Array.isArray(fahrzeuge) ? 'aktuell' : 'getrennt', stand: new Date().toISOString(),
      hinweis: Array.isArray(fahrzeuge) ? fahrzeuge.length + ' aktive Fahrzeuge.' : 'Abruf fehlgeschlagen.' },
    { kurz: 'Wetter', quelle: 'Standort und Wetter', live: !!(umfeld && umfeld.wetter),
      zustand: umfeld ? (umfeld.wetter ? 'aktuell' : 'degradiert') : 'getrennt',
      stand: umfeld && umfeld.wetter ? umfeld.wetter.abgerufen : null,
      hinweis: umfeld && umfeld.wetter ? 'Open-Meteo, zwischengespeichert für 10 Minuten.' : 'Wetterabruf fehlgeschlagen.' },
  ]);
  heuteQuellenFuellen(kQ, quellen);
  const banking = quellen.find(q => q.kurz === 'Banking');
  if (kurzzeile) kurzzeile.textContent = heuteKurzzeile(n, !!banking && banking._code === 'aktuell');

  /* §-556-Pflichten je Objekt — ein lesender Abruf je Objekt. */
  let pflichtenGesamt = null;
  if (Array.isArray(objekte) && objekte.length) {
    const pflichten = await Promise.allSettled(objekte.map(o =>
      apiFetch('/api/assets/properties/' + encodeURIComponent(o.code) + '/nk-period-obligations')));
    const gelungen = pflichten.filter(p => p.status === 'fulfilled');
    pflichtenGesamt = gelungen.length
      ? gelungen.reduce((m, p) => m + (Array.isArray(p.value) ? p.value.length : 0), 0) : null;
  }
  if (currentTab !== 'heute' || !c.contains(raster)) return;
  heuteOffenFuellen(kO, [
    { titel: '§556-Pflichten',
      text: pflichtenGesamt === null ? 'Nicht abrufbar — der Stand ist unbekannt.'
        : pflichtenGesamt === 0 ? 'Nicht eingerichtet. Keine Pflicht erfasst — das ist kein „keine Pflichten", sondern eine nicht in Betrieb genommene Funktion.'
        : pflichtenGesamt + ' Pflichten erfasst.' },
    { titel: 'Änderungen seit dem letzten Besuch',
      text: 'Nicht umgesetzt. Dafür müsste festgehalten werden, wann Sie zuletzt hier waren — eine solche Speicherung gibt es nicht.' },
    { titel: 'Automatischer Abgleich',
      text: 'Abgeschaltet. Banking, SharePoint und Instagram werden nicht selbsttätig aktualisiert; das Alter steht bei den Datenquellen.' },
    { titel: 'Offene Vorgänge',
      text: status && status.workflows
        ? (status.workflows.pending || 0) + ' offene Vorgänge erfasst — siehe Bereich Automatisierung.'
        : 'Nicht abrufbar.' },
  ]);

  stamp();
  /* Die Datenstand-Leiste bleibt hier leer: „Datenquellen" sagt dasselbe. */
  setDatenstand([]);
  c.dataset.geladen = '1';
}
