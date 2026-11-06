#!/usr/bin/env node
/* Kontrastprüfung der erlaubten Paare (Spec-Dashboard-Design-v2 §1.6, Gate 4).
   Liest die Farbwerte aus public/css/design.css — keine zweite Liste, die
   sich von der Stilvorlage fortbewegen könnte. Text 4,5:1, UI/Statuspunkte 3:1.
   Aufruf: node test/e2e/kontrast-pruefen.mjs [--md]
   Exit 1, wenn ein TEXT-Paar unterschritten ist. Unterschrittene UI-Paare
   werden gemeldet (Spec: „cc meldet jede Abweichung"), brechen aber nicht ab,
   weil ihre Werte in der Spec verbindlich vorgegeben sind. */
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../../public/css/design.css', import.meta.url), 'utf8');
const wert = (name) => {
  const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})'));
  if (!m) throw new Error('Token --' + name + ' fehlt');
  return m[1];
};
const lum = (hex) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const T = (v) => ({ name: '--' + v, hex: wert(v) });
/* Halbtransparente Farbe (rgba) über einem Grund gemischt — für den
   Rand der Abmelde-Schaltfläche auf der Navy-Kopfzeile (CP1-5). */
const gemischt = (name, grundHex) => {
  const m = css.match(new RegExp('--' + name + ':\\s*rgba\\(([^)]+)\\)'));
  if (!m) throw new Error('Token --' + name + ' (rgba) fehlt');
  const [r, g, b, a] = m[1].split(',').map(Number);
  const grund = [1, 3, 5].map(i => parseInt(grundHex.slice(i, i + 2), 16));
  const hex = '#' + [r, g, b].map((v, i) => Math.round(a * v + (1 - a) * grund[i]).toString(16).padStart(2, '0')).join('').toUpperCase();
  return { name: '--' + name + ' über Navy', hex };
};
const H = (name, hex) => ({ name, hex });
const paare = [];
const add = (vg, hgs, soll, art) => hgs.forEach(hg => paare.push({ vg, hg, soll, art }));
for (const t of ['text', 'text-soft']) add(T(t), ['surface', 'surface-2', 'surface-3', 'bg'].map(T), 4.5, 'Text');
add(T('muted'), ['surface', 'surface-3'].map(T), 4.5, 'Text');
add(T('accent'), ['surface', 'surface-3'].map(T), 4.5, 'Text');
add(T('accent-dark'), ['bg', 'surface-2', 'accent-weak'].map(T), 4.5, 'Text');
add(T('on-accent'), [T('accent')], 4.5, 'Text');
add(T('on-navy'), [T('navy')], 4.5, 'Text');
add(T('on-navy-soft'), [T('navy')], 4.5, 'Text');
for (const s of ['green', 'gold', 'red']) add(T('on-' + s + '-weak'), [T(s + '-weak')], 4.5, 'Text');
add(T('border-strong'), ['surface', 'surface-3'].map(T), 3, 'UI');
/* Statuspunkte und Ränder: ok = --green, Fehler = --red, fällig = --on-gold-weak
   (--gold ist dafür zu hell, siehe design.css). */
for (const s of ['green', 'red']) add(T(s), [T(s + '-weak'), T('surface')], 3, 'UI');
add(T('on-gold-weak'), [T('gold-weak'), T('surface')], 3, 'UI');
add(T('accent'), [T('accent-weak')], 3, 'UI');
for (const [n, hex] of [['rot', '#E36F5C'], ['gold', '#E8B45A'], ['blau', '#7FA7DC']]) add(H('Punkt ' + n, hex), [T('navy')], 3, 'UI');

/* Kopfzeile Navy (CP1-5): Schriftzug, „Stand", Marke, Abmelde-Rand. */
add(H('Kopf: Schrift weiß', wert('on-navy')), [T('navy')], 4.5, 'Text');
add(H('Kopf: „Stand" --on-navy-soft', wert('on-navy-soft')), [T('navy')], 4.5, 'Text');
add(H('Kopf: Marke Navy-Icon', wert('navy')), [H('weißes Quadrat', wert('on-navy'))], 3, 'UI');
add(gemischt('kopf-rand', wert('navy')), [T('navy')], 3, 'UI');

/* Tagesbogen im Briefing (CP1-9): Legende im unteren Teil des Verlaufs
   (--surface bei 58 % bis --sky-bottom), nachts auf --night-top/--night-bottom.
   Wochentag mobil oben auf --sky-top in --text-soft. Gemessen am tatsächlichen
   Verlaufston prüft das cp1-abnahme.mjs (--nur=tagesbogen). */
for (const t of ['text', 'text-soft', 'muted']) add(H('Tagesbogen Legende tags --' + t, wert(t)), ['surface', 'sky-bottom'].map(T), 4.5, 'Text');
for (const t of ['on-navy', 'on-navy-soft']) add(H('Tagesbogen Legende nachts --' + t, wert(t)), ['night-top', 'night-bottom'].map(T), 4.5, 'Text');
add(H('Tagesbogen Wochentag mobil --text-soft', wert('text-soft')), [T('sky-top')], 4.5, 'Text');

const zeilen = paare.map(p => ({ ...p, r: ratio(p.vg.hex, p.hg.hex) }));
const fehlText = zeilen.filter(z => z.r < z.soll && z.art === 'Text');
const fehlUi = zeilen.filter(z => z.r < z.soll && z.art !== 'Text');
const zahl = (x) => x.toFixed(2).replace('.', ',');
if (process.argv.includes('--md')) {
  console.log('| Vordergrund | auf | Wert | Soll | Ergebnis |\n|---|---|---|---|---|');
  for (const z of zeilen) console.log(`| \`${z.vg.name}\` ${z.vg.hex} | \`${z.hg.name}\` ${z.hg.hex} | ${zahl(z.r)}:1 | ${String(z.soll).replace('.', ',')} ${z.art} | ${z.r >= z.soll ? 'erfüllt' : '**unterschritten**'} |`);
} else {
  for (const z of zeilen) console.log((z.r >= z.soll ? 'ok  ' : 'FEHL') + ' ' + z.art.padEnd(4) + ' ' + z.vg.name + ' auf ' + z.hg.name + ' ' + zahl(z.r));
}
console.error(zeilen.length + ' Paare · Text unterschritten: ' + fehlText.length + ' · UI unterschritten: ' + fehlUi.length);
process.exit(fehlText.length ? 1 : 0);
