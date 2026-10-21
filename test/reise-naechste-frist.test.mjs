// Naechste Frist im Kopf der Reisekarte (Auftrag Reisen-Tab 18.10.2026, Punkt 1).
// Liest die Funktionen aus public/index.html selbst, damit der Test den
// ausgelieferten Code prueft und keine Kopie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const funktion = (name) => {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} fehlt in index.html`);
  return html.slice(start, html.indexOf('\n}\n', start) + 2);
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmtDate = (iso) => iso.split('-').reverse().join('.');
const reiseNaechsteFrist = new Function('esc', 'fmtDate',
  `${funktion('reiseTage')}\n${funktion('reiseNaechsteFrist')}\nreturn reiseNaechsteFrist;`)(esc, fmtDate);

const HEUTE = '2026-10-21';

test('frueheste offene Frist gewinnt, erledigte zaehlen nicht', () => {
  const t = reiseNaechsteFrist({ fristen: [
    { faellig: '2026-10-31', titel: 'LX41 pruefen', status: 'offen' },
    { faellig: '2026-10-20', titel: 'schon erledigt', status: 'erledigt' },
    { faellig: '2026-10-25', titel: 'Vancouver buchen', status: 'offen' },
  ] }, HEUTE);
  assert.match(t, /Nächste Frist 25\.10\.2026 \(in 4 Tg\.\): Vancouver buchen/);
  assert.match(t, /badge-yellow/);
});

test('ueberfaellige Frist steht rot oben', () => {
  const t = reiseNaechsteFrist({ fristen: [
    { faellig: '2026-10-19', titel: 'Check', status: 'offen' },
    { faellig: '2026-11-06', titel: 'Check-in' },
  ] }, HEUTE);
  assert.match(t, /badge-red/);
  assert.match(t, /überfällig seit 2 Tg\./);
});

test('ohne offene oder datierte Frist kein Hinweis; Titel wird maskiert', () => {
  assert.equal(reiseNaechsteFrist({ fristen: [{ titel: 'ohne Datum' }] }, HEUTE), '');
  assert.equal(reiseNaechsteFrist({}, HEUTE), '');
  const t = reiseNaechsteFrist({ fristen: [{ faellig: '2026-12-30', titel: '<b>x</b>' }] }, HEUTE);
  assert.ok(!t.includes('<b>'));
  assert.match(t, /badge-muted/);
});
