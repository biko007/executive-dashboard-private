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
