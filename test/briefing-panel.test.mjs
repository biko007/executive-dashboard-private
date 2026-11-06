// Briefing-Panel in der Tagesübersicht (Owner-Auftrag 26.10.2026, Punkt 5).
// Liest die Funktionen aus public/js/tagesuebersicht.js selbst, damit der Test
// den ausgelieferten Code prueft und keine Kopie.
//
// CP1 (05.11.2026, Spec-Dashboard-Design-v2 §3.7): Der Text wird nicht mehr
// als HTML-Zeichenkette eingesetzt, sondern als DOM mit textContent gebaut.
// heuteBriefingAbsaetze() zerlegt den gespeicherten Telegram-Text dafuer in
// Absaetze aus Stuecken { text, fett }. Geprueft wird weiter dasselbe:
// Rubriken, Maskierung, Vorwahl, Abruf.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../public/js/tagesuebersicht.js', import.meta.url), 'utf8');
const funktion = (name) => {
  const start = js.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} fehlt in tagesuebersicht.js`);
  return js.slice(start, js.indexOf('\n}\n', start) + 2);
};
const absaetze = new Function(`${funktion('heuteBriefingAbsaetze')}\nreturn heuteBriefingAbsaetze;`)();
const vorwahl = new Function(`${funktion('heuteBriefingVorwahl')}\nreturn heuteBriefingVorwahl;`)();

test('Rubriken werden fett, Absaetze aus Leerzeilen, einfache Umbrueche zu Leerzeichen', () => {
  assert.deepEqual(absaetze('<b>📆 Kalender</b>\n09:00 A &amp; B\n10:00 C\n\n<b>🌤 Wetter</b>\nJetzt: 2°C'), [
    [{ text: '📆 Kalender', fett: true }, { text: ' 09:00 A & B 10:00 C', fett: false }],
    [{ text: '🌤 Wetter', fett: true }, { text: ' Jetzt: 2°C', fett: false }],
  ]);
});

test('aus der Ablage gelangt kein fremdes Element in die Seite', () => {
  // Ein maskierter Termintitel mit Skript bleibt Text …
  assert.deepEqual(absaetze('&lt;script&gt;x&lt;/script&gt;'),
    [[{ text: '<script>x</script>', fett: false }]]);
  // … und auch ein unmaskiert gespeichertes Element wird zu Text; nur <b> zaehlt.
  assert.deepEqual(absaetze('<img src=x onerror=alert(1)><b>T</b>'),
    [[{ text: '<img src=x onerror=alert(1)>', fett: false }, { text: 'T', fett: true }]]);
  // Der Baustein, der daraus DOM macht, setzt ausschliesslich textContent.
  const knoten = funktion('heuteBriefingTextKnoten');
  assert.doesNotMatch(knoten, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(knoten, /textContent/);
});

test('Vorwahl ist das jüngste Briefing', () => {
  const liste = [
    { art: 'morgen', datum: '2026-10-26', gesendetAt: '2026-10-26T06:00:10Z', erzeugtAt: '2026-10-26T06:00:00Z' },
    { art: 'abend', datum: '2026-10-26', gesendetAt: '2026-10-26T20:00:10Z', erzeugtAt: '2026-10-26T20:00:00Z' },
    { art: 'abend', datum: '2026-10-25', gesendetAt: null, erzeugtAt: '2026-10-25T20:00:00Z' },
  ];
  assert.deepEqual(vorwahl(liste), { art: 'abend', datum: '2026-10-26' });
  assert.equal(vorwahl([]), null);
});

test('Tagesübersicht ruft die Briefings ab und zeigt das Panel', () => {
  assert.match(js, /apiFetch\('\/api\/briefing\?tage=7'\)/);
  assert.match(js, /heuteKarte\('tu-briefing', 'Briefing'/);
  assert.match(js, /heuteBriefingBlock\(/);
});

// ── CP1-7/CP1-8 (06.11.2026): Briefing gegliedert, vollständig mit Wetter ──
// Fixture: die 13 echten Briefings vom 31.10.–06.11.2026 (7 Morgen, 6 Abend),
// Mailadressen, Kontensumme und Gewicht maskiert.
const gliedern = new Function(
  `${funktion('heuteBriefingGliedern')}\n${funktion('heuteBriefingWetter')}\n${funktion('heuteBriefingIcon')}\nreturn heuteBriefingGliedern;`)();
const echte = JSON.parse(readFileSync(new URL('./fixtures/briefings-20261106.json', import.meta.url), 'utf8'));

/* Kleine DOM-Attrappe: genug für heuteEl/textContent, damit der Test den
   ausgelieferten Baustein rendert und dessen textContent prüft. */
function attrappe() {
  const knoten = (tag) => ({
    tag, className: '', kinder: [], eigenerText: '', attribute: {},
    style: { display: '', transform: '', eigenschaften: {}, setProperty(k, v) { this.eigenschaften[k] = v; } },
    setAttribute(k, v) { this.attribute[k] = v; },
    appendChild(k) { this.kinder.push(k); return k; },
    append(...k) { this.kinder.push(...k); },
    set textContent(v) { this.eigenerText = String(v); this.kinder = []; },
    get textContent() { return this.eigenerText + this.kinder.map(k => k.textContent).join(''); },
  });
  return { createElement: knoten, createElementNS: (_ns, tag) => knoten(tag), createTextNode: (t) => ({ textContent: String(t) }) };
}
const TB_FUNKTIONEN = ['heuteTagesbogenLesen', 'heuteTagesbogenPunkt', 'heuteTagesbogenMondPfad',
  'heuteTagesbogenGeometrie', 'heuteJetztMinuten', 'heuteSvg', 'heuteTagesbogenKnoten', 'heuteBriefingKopfKnoten'];
const baukasten = (doc) => new Function('document',
  `${funktion('heuteEl')}\nfunction iconElement(name) { return document.createElement('svg'); }\n` +
  TB_FUNKTIONEN.map(funktion).join('\n') +
  `\n${funktion('heuteBriefingGegliedertKnoten')}\nreturn { heuteBriefingGegliedertKnoten, ${TB_FUNKTIONEN.join(', ')} };`)(doc);
const bau = baukasten(attrappe());
const MITTAG = 12 * 60 + 20, ABENDS = 19 * 60 + 30;
const rendern = (g, jetzt = MITTAG) => bau.heuteBriefingGegliedertKnoten(g, jetzt);
/* Alle Knoten unterhalb von k, die pruefe() erfüllen (Attrappe). */
const finde = (k, pruefe, treffer = []) => {
  if (pruefe(k)) treffer.push(k);
  for (const c of k.kinder || []) finde(c, pruefe, treffer);
  return treffer;
};
const klasse = (k) => String(k.className || (k.attribute && k.attribute.class) || '');
const mitKlasse = (wurzel, name) => finde(wurzel, k => klasse(k).split(' ').includes(name));

const MORGEN = ['Posteingang', 'Kalender', 'Reisen (7 Tage)', 'Offene cc-Aufträge (24 h)', 'Gesundheit',
  'Fuhrpark — Fristen', 'NK-Fristen (30 Tage)', 'Banking', 'Trading (Paper)'];
const OHNE_POST = MORGEN.slice(1);
const ABEND = ['cc-Aufträge heute', 'Termine morgen', 'Fristen (14 Tage)'];
const W = (ort, rest) => ['Wetter — ' + ort, ...rest];
const ERWARTET = {
  '2026-11-06 morgen': W('Tuttlingen', MORGEN), '2026-11-05 morgen': W('Tuttlingen', MORGEN),
  '2026-11-04 morgen': W('Ratschings', OHNE_POST), '2026-11-03 morgen': W('Ratschings', MORGEN),
  '2026-11-02 morgen': W('Lesina', MORGEN), '2026-11-01 morgen': W('Lesina', OHNE_POST),
  '2026-10-31 morgen': W('Amsteg', MORGEN),
  '2026-11-05 abend': [...ABEND, 'Sonstiges'], '2026-11-04 abend': [...ABEND, 'Sonstiges'],
  '2026-11-03 abend': [...ABEND, 'Sonstiges'], '2026-11-02 abend': [...ABEND, 'Sonstiges'],
  '2026-11-01 abend': ABEND, '2026-10-31 abend': ABEND,
};

test('die 13 echten Briefings werden in die erwarteten Abschnitte zerlegt, Wetter zuerst', () => {
  assert.equal(echte.length, 13);
  for (const b of echte) {
    const g = gliedern(b.textHtml);
    const schluessel = b.datum + ' ' + b.art;
    assert.ok(g, schluessel + ': nicht zerlegt');
    assert.deepEqual(g.abschnitte.map(a => a.titel), ERWARTET[schluessel], schluessel);
    assert.doesNotMatch(JSON.stringify(g), /\p{Extended_Pictographic}/u, schluessel);
    for (const a of g.abschnitte) {
      assert.match(a.icon, /^(mail|calendar|list-checks|wallet|trending-up|plane|building|car|heart-pulse|clock|info|sun|cloud)$/);
    }
  }
});

/* Vollständigkeit (CP1-8): jede nicht-leere Zeile des Originals steht im
   gerenderten Text der Karte, in ihrer Reihenfolge. Normalisierung beider
   Seiten: Emojis und Steuerzeichen entfernen, Leerraum entfernen, dazu die
   Trennzeichen, die das Layout durch Zeilen und Spalten ersetzt
   (• · : , — und die Klammern um eine Dauer). Ein führendes "• "/"- " der
   Originalzeile ist Aufzählungszeichen und zählt nicht mit. */
const normal = (t) => t
  .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\p{Cc}]/gu, '')
  .replace(/[\s•·:,—()]/gu, '');
const originalZeilen = (textHtml) => textHtml
  .replace(/<\/?b>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .split('\n').map(z => z.replace(/^\s*[•-]\s+/, '')).map(normal).filter(Boolean);

/* Wörter und Zahlen einer Kopfzeile (normalisiert) ohne Aufgang/Untergang. */
const kopfWoerter = (textHtml, zNormal) => {
  const roh = textHtml.replace(/<\/?b>/g, '').split('\n').find(r => normal(r) === zNormal) || '';
  return roh.replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, ' ').split(/[\s•·,—()]+/u)
    .filter(w => w && !/^(Aufgang|Untergang)$/.test(w)).map(normal).filter(Boolean);
};

test('Vollständigkeit: jede Zeile der 13 Briefings steht in der Karte', () => {
  let geprueft = 0;
  for (const b of echte) {
    const karte = rendern(gliedern(b.textHtml)).textContent;
    assert.doesNotMatch(karte, /\p{Extended_Pictographic}/u, b.datum + ' ' + b.art + ': Emoji in der Karte');
    const kartenText = normal(karte);
    /* Kopfzeile als Tagesbogen (CP1-9): Werte stehen in Datum, Ort und
       Legende, die Wörter Aufgang/Untergang ersetzt die Legende durch
       „07:17 – 17:01". Geprüft wird dort jedes übrige Wort und jede Zahl. */
    const kopfZeilen = new Set(originalZeilen(b.textHtml.split('\n').slice(0, b.textHtml.split('\n').findIndex((z, i) => i > 0 && /^<b>/.test(z))).join('\n')));
    for (const z of originalZeilen(b.textHtml)) {
      const ok = kartenText.includes(z) || (kopfZeilen.has(z) && kopfWoerter(b.textHtml, z).every(w => kartenText.includes(w)));
      assert.ok(ok, `${b.datum} ${b.art}: fehlt „${z}“`);
      geprueft++;
    }
  }
  assert.ok(geprueft > 300, 'zu wenige Zeilen geprüft: ' + geprueft);
});

test('Wetter strukturiert, Kopfzeile vollständig mit Sonne und Mond', () => {
  const g = gliedern(echte.find(b => b.datum === '2026-11-06' && b.art === 'morgen').textHtml);
  assert.deepEqual(g.kopf, ['Freitag, 6. November 2026 — 07:00 Uhr', 'Tuttlingen',
    'Sonne Aufgang 07:17 · Untergang 17:01', 'Abnehmende Sichel (9%)', 'Mond Aufgang 04:11 · Untergang 15:31']);
  const w = g.abschnitte[0];
  assert.equal(w.art, 'wetter');
  assert.equal(w.icon, 'cloud');
  assert.deepEqual(w.jetzt, { wert: '2 °C', zustand: 'Nebel' });
  assert.deepEqual(w.tage, [
    { label: 'Heute', wert: '1–7 °C', sub: 'Wind 6 · Regen 0 mm · UV 2' },
    { label: 'Morgen', wert: '3–8 °C', sub: 'Wind 5 · Regen 0 mm · UV 1' },
    { label: 'Überm.', wert: '3–8 °C', sub: 'Wind 8 · Regen 0 mm · UV 2' },
  ]);
  assert.deepEqual(w.nach, ['Druck: 1024 hPa (→ stabil)']);
  // 31.10.: sonnig → Sonnensymbol, Regenhinweis bleibt an seiner Stelle.
  const s = gliedern(echte.find(b => b.datum === '2026-10-31' && b.art === 'morgen').textHtml).abschnitte[0];
  assert.equal(s.icon, 'sun');
  assert.deepEqual(s.vor, ['Regen ab 19:00']);
  const abend = gliedern(echte.find(b => b.datum === '2026-11-05' && b.art === 'abend').textHtml);
  assert.deepEqual(abend.kopf, ['Abendbriefing — Donnerstag, 5. November 2026']);
});

test('Einträge: Kalendertag, Zeit, Ihre Aktion, Frist und Ton werden erkannt', () => {
  const g = gliedern(echte.find(b => b.datum === '2026-11-06' && b.art === 'morgen').textHtml);
  const ab = (t) => g.abschnitte.find(a => a.titel === t);
  const kal = ab('Kalender').eintraege;
  assert.deepEqual(kal[0], { tag: 'Fr 06.11.', zeit: '14:00–15:00', titel: 'BvCW-Vorstand "FORUM"', sub: '1 Std.', ton: '' });
  assert.deepEqual(kal[1], { tag: '', zeit: '18:00–23:55', titel: 'FoTA Mitgliederversammlung', sub: '5,9 Std.', ton: '' });
  assert.deepEqual(kal[2], { tag: 'Mo 09.11.', zeit: 'ganztägig', titel: 'Tausch Soleflüssigkeit', sub: '1 Tag', ton: '' });
  const cc = ab('Offene cc-Aufträge (24 h)').eintraege[0];
  assert.equal(cc.titel, 'SWT 18213 abgelegt: N24 Reststrom Oktober 2026, Faktor 1 bestätigt');
  assert.match(cc.sub, /^Ihre Aktion: Wenn die sieben/);
  const nk = ab('NK-Fristen (30 Tage)').eintraege[0];
  assert.equal(nk.titel, 'N24 — Doris: Rückmeldung v5 + Rückstandsfragen (wartet auf Antwort)');
  assert.equal(nk.sub, 'in 1 Tag (07.11.)');
  const fz = ab('Fuhrpark — Fristen').eintraege;
  assert.equal(fz[0].ton, 'rot');
  assert.equal(fz[1].ton, 'gelb');
  assert.match(ab('Posteingang').eintraege[1].sub, /^→ Neueste: "/);
  assert.match(ab('Offene cc-Aufträge (24 h)').eintraege[1].sub, /Performance & Reports > Statements/);
});

test('unbekanntes Format: null, damit der vollständige Text als Absätze erscheint', () => {
  assert.equal(gliedern(''), null);
  assert.equal(gliedern('Nur ein Satz ohne Rubrik.'), null);
  assert.equal(gliedern('Vorspann vor der Rubrik\n<b>Kalender</b>\n• A'), null);
  const inhalt = funktion('heuteBriefingInhalt');
  assert.match(inhalt, /try \{ gegliedert = b\.textHtml \? heuteBriefingGliedern\(b\.textHtml\) : null; \} catch/);
  assert.match(inhalt, /heuteBriefingTextKnoten\(heuteBriefingAbsaetze\(b\.textHtml\)\)/);
  // Nichts wird gekürzt oder versteckt (CP1-8).
  assert.doesNotMatch(inhalt, /hb-voll|hb-alle|Vollständig lesen|Alle Abschnitte/);
  const css = readFileSync(new URL('../public/css/tagesuebersicht.css', import.meta.url), 'utf8');
  const briefingCss = css.slice(css.indexOf('/* ── Briefing'), css.indexOf('/* ── Datenquellen'));
  assert.doesNotMatch(briefingCss, /line-clamp|text-overflow: ellipsis|hb-ueber|display: none/);
});

test('gegliederte Darstellung setzt Fremdtexte nur per textContent', () => {
  const knoten = funktion('heuteBriefingGegliedertKnoten');
  assert.doesNotMatch(knoten, /innerHTML|insertAdjacentHTML|outerHTML/);
  const g = gliedern('<b>📆 Kalender</b>\n• &lt;img src=x onerror=alert(1)&gt;');
  assert.equal(g.abschnitte[0].eintraege[0].titel, '<img src=x onerror=alert(1)>');
});

// ── CP1-9 (06.11.2026): Tagesbogen mit Sonnen- und Mondbahn ──
const lesen = bau.heuteTagesbogenLesen;
const kopfVon = (datum, art) => gliedern(echte.find(b => b.datum === datum && b.art === art).textHtml).kopf;

/* Erwartung je Fixture-Briefing: Sonne, Mond, Prozent, Richtung, Bahn.
   Abendbriefings tragen in der Kopfzeile nur das Datum → Textzeile (null). */
const TB_ERWARTET = {
  '2026-11-06 morgen': ['Tuttlingen', '07:17', '17:01', '04:11', '15:31', 9, 'abnehmend', true],
  '2026-11-05 morgen': ['Tuttlingen', '07:16', '17:02', '02:56', '15:15', 16, 'abnehmend', true],
  '2026-11-04 morgen': ['Ratschings', '07:02', '16:56', '01:29', '14:48', 25, 'abnehmend', true],
  '2026-11-03 morgen': ['Ratschings', '07:00', '16:58', '', '14:29', 35, 'abnehmend', false],
  '2026-11-02 morgen': ['Lesina', '06:32', '16:52', '00:01', '13:37', 46, 'abnehmend', true],
  '2026-11-01 morgen': ['Lesina', '06:30', '16:54', '22:44', '13:04', 58, 'abnehmend', false],
  '2026-10-31 morgen': ['Amsteg', '07:06', '17:13', '21:34', '13:12', 69, 'abnehmend', false],
};

test('Tagesbogen: Kopfzeilen aller 13 Briefings liefern Sonne, Mond, Prozent und Richtung', () => {
  let bogen = 0, text = 0;
  for (const b of echte) {
    const schluessel = b.datum + ' ' + b.art;
    const d = lesen(gliedern(b.textHtml).kopf);
    const e = TB_ERWARTET[schluessel];
    if (!e) { assert.equal(d, null, schluessel + ': Abendkopf ohne Sonne muss Textzeile bleiben'); text++; continue; }
    assert.ok(d, schluessel + ': nicht gelesen');
    assert.deepEqual([d.ort, d.sonneAufText, d.sonneUnterText, d.mond.aufText, d.mond.unterText, d.mond.prozent, d.mond.richtung, d.mond.bahn], e, schluessel);
    bogen++;
  }
  assert.deepEqual([bogen, text], [7, 6]);
  const d = lesen(kopfVon('2026-11-06', 'morgen'));
  assert.deepEqual([d.wochentag, d.tagMonat, d.jahr, d.zeit, d.sonneAuf, d.sonneUnter, d.mond.phase],
    ['Freitag', '6. November', '2026', '07:00', 437, 1021, 'Abnehmende Sichel']);
  assert.equal(lesen(['Montag, 2. November 2026 — 07:00 Uhr', 'X', 'Sonne Aufgang 07:00 · Untergang 17:00', 'Zunehmende Sichel (9%)']).mond.richtung, 'zunehmend');
  assert.equal(lesen(['Montag, 2. November 2026 — 07:00 Uhr', 'X', 'Sonne Aufgang 07:00 · Untergang 17:00', 'Erstes Viertel (50%)']).mond.richtung, 'zunehmend');
  assert.equal(lesen(['Montag, 2. November 2026 — 07:00 Uhr', 'X', 'Sonne Aufgang 07:00 · Untergang 17:00', 'Vollmond (100%)']).mond.richtung, '');
});

test('Tagesbogen: Geometrie der Bahnen bei u = 0, 0,5 und 1', () => {
  const d = lesen(kopfVon('2026-11-06', 'morgen'));
  const g = bau.heuteTagesbogenGeometrie(d, MITTAG);
  /* Fenster 03:41–17:31 (frühester Aufgang 04:11 − 30, spätester Untergang 17:01 + 30). */
  const X = (t) => 20 + (t - 221) / (1051 - 221) * 560;
  const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' ≠ ' + b);
  nah(g.S.x1, X(437)); nah(g.S.x2, X(1021)); nah(g.M.x1, X(251)); nah(g.M.x2, X(931));
  const P = bau.heuteTagesbogenPunkt;
  for (const [b, ry] of [[g.S, 104], [g.M, 66]]) {
    nah(P(b, 0).x, b.x1); nah(P(b, 0).y, 118);
    nah(P(b, 0.5).x, b.cx); nah(P(b, 0.5).y, 118 - ry);
    nah(P(b, 1).x, b.x2); assert.ok(Math.abs(P(b, 1).y - 118) < 1e-9);
  }
  assert.equal(g.S.d, 'M165.7 118 A197.0 104 0 0 1 559.8 118');
  nah(g.uS, (740 - 437) / (1021 - 437));
  // Ohne Mondbahn bestimmt die Sonne allein das Fenster.
  const ohne = bau.heuteTagesbogenGeometrie(lesen(kopfVon('2026-11-03', 'morgen')), MITTAG);
  assert.equal(ohne.M, null);
  nah(ohne.S.x1, 20 + 30 / (1048 - 390) * 560);   // Fenster 06:30–17:28
});

test('Tagesbogen: Mondsichel bei 0 %, 9 % abnehmend, 50 %, 91 % zunehmend, 100 %', () => {
  const m = bau.heuteTagesbogenMondPfad;
  assert.equal(m(0, false), 'M0,-13 A13,13 0 0 1 0,13 A10.00,13 0 0 0 0,-13 Z');
  assert.equal(m(0.09, true), 'M0,-13 A13,13 0 0 0 0,13 A10.00,13 0 0 1 0,-13 Z');
  assert.equal(m(0.5, false), 'M0,-13 A13,13 0 0 1 0,13 A0.00,13 0 0 1 0,-13 Z');
  assert.equal(m(0.91, false), 'M0,-13 A13,13 0 0 1 0,13 A10.00,13 0 0 1 0,-13 Z');
  assert.equal(m(1, false), 'M0,-13 A13,13 0 0 1 0,13 A10.00,13 0 0 1 0,-13 Z');
  // Zwischenwert unterhalb der Begrenzung: 35 % abnehmend → rx = 13 · 0,3
  assert.equal(m(0.35, true), 'M0,-13 A13,13 0 0 0 0,13 A3.90,13 0 0 1 0,-13 Z');
});

test('Tagesbogen: Tag/Nacht, Jetzt-Chip, Sonne nur tags, Sterne nur nachts', () => {
  const d = lesen(kopfVon('2026-11-06', 'morgen'));
  const tag = bau.heuteTagesbogenGeometrie(d, MITTAG);
  assert.deepEqual([tag.nacht, tag.sonneOben, tag.mondOben, tag.chipText], [false, true, true, 'jetzt 12:20']);
  assert.equal(tag.chipX, ((tag.pS.x - 14) / 572 * 100).toFixed(1) + '%');
  const nacht = bau.heuteTagesbogenGeometrie(d, ABENDS);
  assert.deepEqual([nacht.nacht, nacht.sonneOben, nacht.mondOben, nacht.chipText, nacht.chipX], [true, false, false, 'Nacht · 19:30', '50.0%']);
  const frueh = bau.heuteTagesbogenGeometrie(d, 5 * 60);   // Mond oben, Sonne nicht
  assert.deepEqual([frueh.nacht, frueh.mondOben], [true, true]);
  assert.equal(frueh.chipX, ((frueh.pM.x - 14) / 572 * 100).toFixed(1) + '%');
  assert.equal(bau.heuteTagesbogenGeometrie(d, 437).nacht, false);   // genau Sonnenaufgang = Tag

  for (const [jetzt, istNacht] of [[MITTAG, false], [ABENDS, true]]) {
    const karte = rendern(gliedern(echte.find(b => b.datum === '2026-11-06' && b.art === 'morgen').textHtml), jetzt);
    const [tb] = mitKlasse(karte, 'tb');
    assert.ok(tb, 'Tagesbogen fehlt');
    assert.equal(klasse(tb).includes('nacht'), istNacht);
    assert.equal(mitKlasse(tb, 'tb-sterne')[0].style.display, istNacht ? '' : 'none');
    assert.equal(mitKlasse(tb, 'tb-sonne')[0].style.display, istNacht ? 'none' : '');
    assert.equal(mitKlasse(karte, 'hb-kopf').length, 0, 'Textzeile neben dem Bogen');
    const t = tb.textContent;
    assert.match(t, /Freitag · 07:00 Uhr/);
    assert.match(t, /Tuttlingen · 9 h 44 min Tageslicht/);
    assert.match(t, /Sonne 07:17 – 17:01/);
    assert.match(t, /Mond 04:11 – 15:31 · Abnehmende Sichel · 9 %/);
    assert.match(t, istNacht ? /Nacht · 19:30/ : /jetzt 12:20/);
  }
  // Mondzeiten nicht als Bogen darstellbar: keine Mondbahn, Zeiten wörtlich in der Legende.
  const k3 = mitKlasse(rendern(gliedern(echte.find(b => b.datum === '2026-11-03' && b.art === 'morgen').textHtml)), 'tb')[0];
  assert.equal(mitKlasse(k3, 'tb-mond').length, 0);
  assert.match(k3.textContent, /Mond Untergang 14:29 · Abnehmende Sichel · 35 %/);
  const k31 = mitKlasse(rendern(gliedern(echte.find(b => b.datum === '2026-10-31' && b.art === 'morgen').textHtml)), 'tb')[0];
  assert.match(k31.textContent, /Mond Aufgang 21:34 · Untergang 13:12 · Abnehmender Mond · 69 %/);
});

test('Tagesbogen: Fallback auf die Textzeile, ohne Mond nur Sonne', () => {
  const kopfText = (kopf) => {
    const k = bau.heuteBriefingKopfKnoten(kopf, MITTAG);
    return klasse(k) === 'hb-kopf' ? k.textContent : null;
  };
  // Abendkopf, unbekannte Zeile, fehlende Sonne, unlesbarer Titel → Textzeile mit dem vollen Text
  assert.equal(kopfText(['Abendbriefing — Donnerstag, 5. November 2026']), 'Abendbriefing — Donnerstag, 5. November 2026');
  assert.equal(kopfText(['Freitag, 6. November 2026 — 07:00 Uhr', 'Tuttlingen']), 'Freitag, 6. November 2026 — 07:00 Uhr · Tuttlingen');
  assert.ok(kopfText(['Freitag, 6. November 2026 — 07:00 Uhr', 'Tuttlingen', 'Sonne Aufgang 07:17 · Untergang 17:01', 'Unbekannt', 'Noch was']));
  assert.ok(kopfText(['Freitag, 6. November 2026', 'Tuttlingen', 'Sonne Aufgang 07:17 · Untergang 17:01']));
  assert.ok(kopfText(['Freitag, 6. November 2026 — 07:00 Uhr', 'Tuttlingen', 'Sonne Aufgang 17:17 · Untergang 07:01']));
  // Nur der Mond fehlt → Bogen ohne Mondbahn und ohne Mondlegende
  const ohneMond = bau.heuteBriefingKopfKnoten(['Freitag, 6. November 2026 — 07:00 Uhr', 'Tuttlingen', 'Sonne Aufgang 07:17 · Untergang 17:01'], MITTAG);
  assert.equal(klasse(ohneMond), 'tb');
  assert.equal(mitKlasse(ohneMond, 'tb-mond').length + mitKlasse(ohneMond, 'tb-mond-fertig').length, 0);
  assert.doesNotMatch(ohneMond.textContent, /Mond/);
  // Fehler beim Bauen (hier: kein SVG möglich) blockiert nichts → Textzeile
  const kaputt = attrappe();
  kaputt.createElementNS = () => { throw new Error('kein SVG'); };
  const k = baukasten(kaputt).heuteBriefingKopfKnoten(kopfVon('2026-11-06', 'morgen'), MITTAG);
  assert.equal(klasse(k), 'hb-kopf');
  assert.match(k.textContent, /Mond Aufgang 04:11/);
});

test('Tagesbogen: nur textContent und createElementNS, jetzt in Europe/Berlin', () => {
  for (const n of ['heuteTagesbogenKnoten', 'heuteBriefingKopfKnoten', 'heuteSvg']) {
    assert.doesNotMatch(funktion(n), /innerHTML|insertAdjacentHTML|outerHTML/, n);
  }
  assert.match(funktion('heuteSvg'), /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg'/);
  // 11:20 UTC = 12:20 Berlin (MEZ), 18:30 UTC = 19:30 Berlin
  assert.equal(bau.heuteJetztMinuten(new Date('2026-11-06T11:20:00Z')), MITTAG);
  assert.equal(bau.heuteJetztMinuten(new Date('2026-11-06T18:30:00Z')), ABENDS);
  assert.equal(bau.heuteJetztMinuten(new Date('2026-11-06T23:05:00Z')), 5);   // 00:05 Berlin
});
