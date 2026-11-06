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
    setAttribute(k, v) { this.attribute[k] = v; },
    appendChild(k) { this.kinder.push(k); return k; },
    append(...k) { this.kinder.push(...k); },
    set textContent(v) { this.eigenerText = String(v); this.kinder = []; },
    get textContent() { return this.eigenerText + this.kinder.map(k => k.textContent).join(''); },
  });
  return { createElement: knoten, createElementNS: (_ns, tag) => knoten(tag) };
}
const rendern = new Function('document',
  `${funktion('heuteEl')}\nfunction iconElement(name) { return document.createElement('svg'); }\n` +
  `${funktion('heuteBriefingGegliedertKnoten')}\nreturn heuteBriefingGegliedertKnoten;`)(attrappe());

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

test('Vollständigkeit: jede Zeile der 13 Briefings steht in der Karte', () => {
  let geprueft = 0;
  for (const b of echte) {
    const karte = rendern(gliedern(b.textHtml)).textContent;
    assert.doesNotMatch(karte, /\p{Extended_Pictographic}/u, b.datum + ' ' + b.art + ': Emoji in der Karte');
    const kartenText = normal(karte);
    for (const z of originalZeilen(b.textHtml)) {
      assert.ok(kartenText.includes(z), `${b.datum} ${b.art}: fehlt „${z}“`);
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
