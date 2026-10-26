// Briefing-Panel in der Tagesübersicht (Owner-Auftrag 26.10.2026, Punkt 5).
// Liest die Funktionen aus public/js/tagesuebersicht.js selbst, damit der Test
// den ausgelieferten Code prueft und keine Kopie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../public/js/tagesuebersicht.js', import.meta.url), 'utf8');
const funktion = (name) => {
  const start = js.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} fehlt in tagesuebersicht.js`);
  return js.slice(start, js.indexOf('\n}\n', start) + 2);
};
// esc() wie im Inline-Skript von index.html
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const html = new Function('esc', `${funktion('heuteBriefingHtml')}\nreturn heuteBriefingHtml;`)(esc);
const vorwahl = new Function(`${funktion('heuteBriefingVorwahl')}\nreturn heuteBriefingVorwahl;`)();

test('Rubriken werden fett, Inhalt bleibt maskiert', () => {
  assert.equal(html('<b>📆 Kalender</b>\n09:00 A &amp; B'), '<strong>📆 Kalender</strong>\n09:00 A &amp; B');
});

test('aus der Ablage gelangt kein fremdes Element in die Seite', () => {
  // Ein maskierter Termintitel mit Skript bleibt Text …
  assert.equal(html('&lt;script&gt;x&lt;/script&gt;'), '&lt;script&gt;x&lt;/script&gt;');
  // … und auch ein unmaskiert gespeichertes Element wird zu Text.
  const roh = html('<img src=x onerror=alert(1)><b>T</b>');
  assert.doesNotMatch(roh, /<img/);
  assert.match(roh, /&lt;img src=x onerror=alert\(1\)&gt;<strong>T<\/strong>/);
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
  assert.match(js, /heuteAbschnitt\('Briefing', heuteBriefingBlock\(/);
});
