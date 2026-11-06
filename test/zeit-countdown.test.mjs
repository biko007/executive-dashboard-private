// Countdown "Nächster Termin" (Owner-Befund 06.11.2026, CP1-6).
// Laedt public/js/zeit.js selbst (ausgelieferter Code, keine Kopie) und prueft
// die Berechnung zweimal in je einem eigenen Prozess: einmal mit TZ=UTC (so
// laeuft der VPS) und einmal mit TZ=Europe/Berlin (so laeuft der Browser).
// Das Ergebnis muss gleich sein, weil nur mit Zeitstempeln gerechnet wird.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ZEIT_JS = fileURLToPath(new URL('../public/js/zeit.js', import.meta.url));

/* Im Kindprozess: zeit.js laden, Graph-Termin wie aus /api/calendar
   interpretieren, Countdown und Anzeige-Uhrzeit zurueckgeben. */
const KIND = `
const js = require('fs').readFileSync(process.argv[1], 'utf8');
const z = new Function(js + '\\nreturn { graphZeitpunkt, zeitBisText, zeitUhr, kalenderZeitraum };')();
// So liefert /api/calendar den Termin "14:00 Berlin" am 06.11.2026 (MEZ, +01:00).
const ev = { isAllDay: false,
  start: { dateTime: '2026-11-06T13:00:00.0000000', timeZone: 'UTC' },
  end:   { dateTime: '2026-11-06T14:00:00.0000000', timeZone: 'UTC' } };
const start = z.graphZeitpunkt(ev.start);
const jetzt = Date.parse('2026-11-06T09:02:00+01:00');   // 09:02 Europe/Berlin
console.log(JSON.stringify({
  uhr: z.zeitUhr(start),
  bis: z.zeitBisText(start.getTime(), jetzt),
  bisKurz: z.zeitBisText(start.getTime(), Date.parse('2026-11-06T13:35:00+01:00')),
  bisVorbei: z.zeitBisText(start.getTime(), Date.parse('2026-11-06T14:10:00+01:00')),
  bisWeit: z.zeitBisText(start.getTime(), Date.parse('2026-11-05T13:00:00+01:00')),
  zeitText: z.kalenderZeitraum(ev).zeitText,
}));`;

const lauf = (tz) => JSON.parse(execFileSync(process.execPath, ['-e', KIND, ZEIT_JS],
  { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));

for (const tz of ['UTC', 'Europe/Berlin']) {
  test(`Termin 14:00 Berlin, jetzt 09:02 Berlin → "in 5 h" (Prozess-TZ ${tz})`, () => {
    const r = lauf(tz);
    assert.equal(r.uhr, '14:00');
    assert.equal(r.zeitText, '14:00–15:00');
    assert.equal(r.bis, 'in 5 h');
    assert.equal(r.bisKurz, 'in 25 Min.');
    assert.equal(r.bisVorbei, '');
    assert.equal(r.bisWeit, '');
  });
}
