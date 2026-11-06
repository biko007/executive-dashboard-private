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

// ── CP1-7 (06.11.2026): Briefing gegliedert statt Telegram-Text ────────────
// Fixture: die 13 echten Briefings vom 31.10.–06.11.2026 (7 Morgen, 6 Abend),
// Mailadressen, Kontensumme und Gewicht maskiert.
const gliedern = new Function(
  `${funktion('heuteBriefingGliedern')}\n${funktion('heuteBriefingIcon')}\nreturn heuteBriefingGliedern;`)();
const echte = JSON.parse(readFileSync(new URL('./fixtures/briefings-20261106.json', import.meta.url), 'utf8'));

const MORGEN = ['Posteingang', 'Kalender', 'Reisen (7 Tage)', 'Offene cc-Aufträge (24 h)', 'Gesundheit',
  'Fuhrpark — Fristen', 'NK-Fristen (30 Tage)', 'Banking', 'Trading (Paper)'];
const OHNE_POST = MORGEN.slice(1);
const ABEND = ['cc-Aufträge heute', 'Termine morgen', 'Fristen (14 Tage)'];
const ERWARTET = {
  '2026-11-06 morgen': MORGEN, '2026-11-05 morgen': MORGEN, '2026-11-04 morgen': OHNE_POST,
  '2026-11-03 morgen': MORGEN, '2026-11-02 morgen': MORGEN, '2026-11-01 morgen': OHNE_POST,
  '2026-10-31 morgen': MORGEN,
  '2026-11-05 abend': [...ABEND, 'Sonstiges'], '2026-11-04 abend': [...ABEND, 'Sonstiges'],
  '2026-11-03 abend': [...ABEND, 'Sonstiges'], '2026-11-02 abend': [...ABEND, 'Sonstiges'],
  '2026-11-01 abend': ABEND, '2026-10-31 abend': ABEND,
};

test('die 13 echten Briefings werden in die erwarteten Abschnitte zerlegt', () => {
  assert.equal(echte.length, 13);
  for (const b of echte) {
    const g = gliedern(b.textHtml);
    const schluessel = b.datum + ' ' + b.art;
    assert.ok(g, schluessel + ': nicht zerlegt');
    assert.deepEqual(g.abschnitte.map(a => a.titel), ERWARTET[schluessel], schluessel);
    // Kein Emoji mehr in irgendeinem angezeigten Text.
    assert.doesNotMatch(JSON.stringify(g), /\p{Extended_Pictographic}/u, schluessel);
    // Jeder Abschnitt hat Inhalt und ein Symbol aus dem Sprite.
    for (const a of g.abschnitte) {
      assert.ok(a.eintraege.length || a.text.length, schluessel + ' / ' + a.titel + ' leer');
      assert.match(a.icon, /^(mail|calendar|list-checks|wallet|trending-up|plane|building|car|heart-pulse|clock|info)$/);
    }
  }
});

test('Wetter wird ausgeblendet, Kopfzeile ohne Emojis', () => {
  const g = gliedern(echte.find(b => b.datum === '2026-11-06' && b.art === 'morgen').textHtml);
  assert.deepEqual(g.ausgeblendet, ['Wetter — Tuttlingen']);
  assert.ok(!g.abschnitte.some(a => /Wetter/.test(a.titel)));
  assert.equal(g.kopf, 'Freitag, 6. November 2026 · Tuttlingen · Sonne 07:17–17:01 · Abnehmende Sichel (9%)');
  const abend = gliedern(echte.find(b => b.datum === '2026-11-05' && b.art === 'abend').textHtml);
  assert.equal(abend.kopf, 'Donnerstag, 5. November 2026');
});

test('Einträge: Kalendertag, Ihre Aktion, Frist und Ton werden erkannt', () => {
  const g = gliedern(echte.find(b => b.datum === '2026-11-06' && b.art === 'morgen').textHtml);
  const ab = (t) => g.abschnitte.find(a => a.titel === t);
  assert.deepEqual(ab('Kalender').eintraege[1], { titel: 'FoTA Mitgliederversammlung', sub: 'Fr 06.11. · 18:00–23:55 · 5,9 Std.', ton: '' });
  assert.deepEqual(ab('Kalender').eintraege[2], { titel: 'Tausch Soleflüssigkeit', sub: 'Mo 09.11. · ganztägig · 1 Tag', ton: '' });
  const cc = ab('Offene cc-Aufträge (24 h)').eintraege[0];
  assert.equal(cc.titel, 'SWT 18213 abgelegt: N24 Reststrom Oktober 2026, Faktor 1 bestätigt');
  assert.match(cc.sub, /^Ihre Aktion: Wenn die sieben/);
  assert.deepEqual(ab('NK-Fristen (30 Tage)').eintraege[0],
    { titel: 'N24 — Doris: Rückmeldung v5 + Rückstandsfragen (wartet auf Antwort)', sub: 'in 1 Tag (07.11.)', ton: '' });
  assert.deepEqual(ab('Fuhrpark — Fristen').eintraege[0], { titel: 'Tesla Model 3', sub: 'TÜV überfällig seit 9 Tagen', ton: 'rot' });
  assert.equal(ab('Fuhrpark — Fristen').eintraege[1].ton, 'gelb');
  // Zusatz "→ Neueste: …" gehört zum Posteingangseintrag davor.
  assert.match(ab('Posteingang').eintraege[1].sub, /^Neueste: "/);
  // Maskierte Zeichen aus Telegram-HTML sind wieder Klartext.
  assert.match(cc.sub + ab('Offene cc-Aufträge (24 h)').eintraege[1].sub, /Performance & Reports > Statements/);
});

test('unbekanntes Format: null, damit die Absatz-Anzeige greift', () => {
  assert.equal(gliedern(''), null);
  assert.equal(gliedern('Nur ein Satz ohne Rubrik.'), null);
  assert.equal(gliedern('Vorspann vor der Rubrik\n<b>Kalender</b>\n• A'), null);
  assert.equal(gliedern('<b>🌤 Wetter — X</b>\nJetzt: 2°C'), null);   // nur Wetter → nichts zu zeigen
  // Die Karte fällt dann auf heuteBriefingAbsaetze zurück, ohne Fehler.
  const inhalt = funktion('heuteBriefingInhalt');
  assert.match(inhalt, /try \{ gegliedert = b\.textHtml \? heuteBriefingGliedern\(b\.textHtml\) : null; \} catch/);
  assert.match(inhalt, /heuteBriefingTextKnoten\(heuteBriefingAbsaetze\(b\.textHtml\)\)/);
});

test('gegliederte Darstellung setzt Fremdtexte nur per textContent', () => {
  const knoten = funktion('heuteBriefingGegliedertKnoten');
  assert.doesNotMatch(knoten, /innerHTML|insertAdjacentHTML|outerHTML/);
  // Ein Titel mit Markup bleibt Text.
  const g = gliedern('<b>📆 Kalender</b>\n• &lt;img src=x onerror=alert(1)&gt;');
  assert.equal(g.abschnitte[0].eintraege[0].titel, '<img src=x onerror=alert(1)>');
});
