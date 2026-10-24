// Tages-P&L im Trading-Tab (Auftrag Trading Option A, 24.10.2026, Punkt 4).
// Liest die Funktion aus public/index.html selbst, damit der Test den
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
const zeile = (name) => {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} fehlt in index.html`);
  return html.slice(start, html.indexOf('\n', start));
};
const karte = new Function(
  `${zeile('fmtUsd')}\n${zeile('pnlColor')}\n${zeile('pnlPrefix')}\n${funktion('tradingTagesPnlKarte')}\nreturn tradingTagesPnlKarte;`)();

test('Paper-Konto mit 0: „nicht verfügbar" statt 0,00 $', () => {
  const t = karte({ paperMode: true, dailyPnl: 0 });
  assert.match(t, /nicht verfügbar/);
  assert.doesNotMatch(t, /0,00/);
});

test('Paper-Konto ohne Feld: ebenfalls „nicht verfügbar"', () => {
  assert.match(karte({ paperMode: true }), /nicht verfügbar/);
});

test('echter Wert wird angezeigt (Paper ungleich 0, Echtgeldkonto auch mit 0)', () => {
  assert.match(karte({ paperMode: true, dailyPnl: 12.5 }), /\+.*12,50/);
  assert.match(karte({ paperMode: false, dailyPnl: 0 }), /0,00/);
});

test('Trading-Tab nutzt die Karte', () => {
  assert.match(html, /\$\{tradingTagesPnlKarte\(status\)\}/);
});
