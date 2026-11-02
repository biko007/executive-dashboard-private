// Reisen-Tab neu (Owner-Auftrag 01.11.2026): Ableitungen gegen die Reisedatei v11.
// Liest public/js/reise-ableitung.js selbst, damit der Test den ausgelieferten
// Code prueft und keine Kopie. Die Reisedaten sind ein Auszug ohne Buchungscodes
// und Dokumentnummern (test/fixtures/reise-261107-winnipeg-v11.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../public/js/reise-ableitung.js', import.meta.url), 'utf8');
const R = new Function(`${js}
return { reiseCountdown, reiseChipAuswahl, reiseNaechsteFristen, reiseDatumsbereich,
  reiseBuchungEinordnen, reiseTagesleiste, reiseZeilenDatum, reiseZeitraumText, reiseTagKurz, reiseFlugText };`)();
const reise = JSON.parse(readFileSync(new URL('./fixtures/reise-261107-winnipeg-v11.json', import.meta.url), 'utf8'));
const HEUTE = '2026-11-02';
const { von, bis } = reise;

test('Kopfzeile: Zeitraum und Countdown vor, waehrend und nach der Reise', () => {
  assert.equal(R.reiseZeitraumText(von, bis), '07.11.–25.11.2026');
  assert.equal(R.reiseZeitraumText('2026-12-28', '2027-01-03'), '28.12.2026–03.01.2027');
  assert.deepEqual(R.reiseCountdown(von, bis, HEUTE), { art: 'vorher', text: 'in 5 Tagen' });
  assert.equal(R.reiseCountdown(von, bis, '2026-11-06').text, 'morgen');
  assert.equal(R.reiseCountdown(von, bis, '2026-11-07').text, 'Tag 1 von 19');
  assert.equal(R.reiseCountdown(von, bis, '2026-11-25').text, 'Tag 19 von 19');
  assert.deepEqual(R.reiseCountdown(von, bis, '2026-11-26'), { art: 'nachher', text: 'beendet' });
});

test('Chips: hoechstens drei, nur red/amber, rot zuerst, Rest in Dateireihenfolge', () => {
  const { sichtbar, rest } = R.reiseChipAuswahl(reise.chips);
  assert.deepEqual(sichtbar.map(c => c.text),
    ['Nacht 19.→20.11. SF offen', 'Hotels Santa Clara / LA offen', 'Inlandsflüge offen']);
  assert.equal(rest.length, 8);
  assert.equal(rest[0].text, 'Interkontinentalflüge gebucht');
  assert.ok(rest.some(c => c.text.startsWith('Senator')), 'vierter amber-Chip wandert ins Einklappbare');
  const mitRot = R.reiseChipAuswahl([{ text: 'a', ton: 'amber' }, { text: 'g', ton: 'green' }, { text: 'r', ton: 'red' }]);
  assert.deepEqual(mitRot.sichtbar.map(c => c.text), ['r', 'a']);
  assert.deepEqual(mitRot.rest.map(c => c.text), ['g']);
  assert.deepEqual(R.reiseChipAuswahl(undefined), { sichtbar: [], rest: [] });
});

test('Als Naechstes: 31.10. ueberfaellig rot, 02.11. heute, 04.11.', () => {
  const n = R.reiseNaechsteFristen(reise.fristen, HEUTE);
  assert.deepEqual(n.map(f => f.faellig), ['2026-10-31', '2026-11-02', '2026-11-04']);
  assert.deepEqual(n.map(f => f.ton), ['rot', 'gelb', 'gelb']);
  assert.deepEqual(n.map(f => f.rest), ['überfällig', 'heute', 'in 2 Tg.']);
  assert.match(n[2].titel, /^Hotels Santa Clara/, 'gleiches Datum: Dateireihenfolge');
  assert.equal(R.reiseTagKurz('2026-10-31'), 'Sa 31.10.');
  // erledigte und undatierte zaehlen nicht, fehlender Status gilt als offen
  const m = R.reiseNaechsteFristen([{ faellig: '2026-11-01', status: 'erledigt' }, { titel: 'ohne' },
    { faellig: '2026-11-20', titel: 'fern' }], HEUTE);
  assert.deepEqual(m.map(f => [f.titel, f.ton]), [['fern', '']]);
});

test('Datumsparser: die Muster aus den Buchungen', () => {
  const p = t => R.reiseDatumsbereich(t, von, bis);
  assert.deepEqual(p('Hyatt Regency SF 15.–19.11. gebucht'),
    { von: '2026-11-15', bis: '2026-11-19', zeit_von: '', zeit_bis: '', muster: 'bereich' });
  assert.deepEqual(p('Konferenz Mo 16.–Mi 18.11. Do 19.11.: 9:00'), { von: '2026-11-16', bis: '2026-11-18', zeit_von: '', zeit_bis: '', muster: 'bereich' });
  assert.deepEqual(p('Sa 21.11. 9:00 – So 22.11. 17:00, Santa Clara'),
    { von: '2026-11-21', bis: '2026-11-22', zeit_von: '9:00', zeit_bis: '17:00', muster: 'bereich' });
  assert.deepEqual(p('3 × Adult, Mo 23.11.2026, Einlass 10:00; nicht erstattbar'),
    { von: '2026-11-23', bis: '2026-11-23', zeit_von: '10:00', zeit_bis: '', muster: 'tag' });
  assert.deepEqual(p('Check-in So 15.11. 16:00, Check-out Do 19.11. 12:00 (4 Nächte).'),
    { von: '2026-11-15', bis: '2026-11-19', zeit_von: '16:00', zeit_bis: '12:00', muster: 'checkin' });
  // ausserhalb des Reisezeitraums, Betraege und Telefonnummern sind kein Termin
  assert.equal(p('Seit 19.10. online keine Flugänderung'), null);
  assert.equal(p('Zimmer 3.388,26 + Steuern; +1 415-788-1234'), null);
  assert.equal(p('31.11. gibt es nicht'), null);
  assert.equal(p(''), null);
  // ueber den Jahreswechsel
  assert.equal(R.reiseDatumsbereich('Mi 02.01.', '2026-12-28', '2027-01-05').von, '2027-01-02');
  assert.deepEqual(R.reiseDatumsbereich('30.–02.01.', '2026-12-28', '2027-01-05').von, '2026-12-30');
});

test('Buchungen v11: Hyatt als Hotel, QCon/AGI/Lucas als Termin, SWISS nicht einzuordnen', () => {
  const e = reise.buchungen.map(b => R.reiseBuchungEinordnen(b, von, bis));
  assert.equal(e[0], null, 'SWISS-Flugbuchung: Fluege stehen schon aus fluege[]');
  assert.equal(e[1], null, 'CO2-Beitrag');
  assert.deepEqual([e[2].art, e[2].von, e[2].zeit_von, e[2].feld], ['termin', '2026-11-23', '10:00', 'tarif']);
  assert.deepEqual([e[3].art, e[3].von, e[3].bis, e[3].ort, e[3].label],
    ['hotel', '2026-11-15', '2026-11-19', 'San Francisco', 'Hyatt Regency San Francisco']);
  assert.deepEqual([e[4].art, e[4].von, e[4].bis, e[4].label], ['termin', '2026-11-16', '2026-11-18', 'QCon San Francisco']);
  assert.deepEqual([e[5].art, e[5].von, e[5].bis, e[5].ort], ['termin', '2026-11-21', '2026-11-22', 'Santa Clara']);
});

test('Tagesleiste v11: 07.11.–25.11. lueckenlos, Fluege 07.11. (2) und 24./25.11.', () => {
  const { zeilen } = R.reiseTagesleiste(reise, von, bis, HEUTE);
  // lueckenlos und ohne Ueberlappung
  assert.equal(zeilen[0].von, '2026-11-07');
  assert.equal(zeilen[zeilen.length - 1].bis, '2026-11-25');
  const tage = zeilen.reduce((n, z) => n + (Date.parse(z.bis) - Date.parse(z.von)) / 864e5 + 1, 0);
  assert.equal(tage, 19);

  const am = tag => zeilen.find(z => z.von <= tag && tag <= z.bis);
  const z07 = am('2026-11-07');
  assert.deepEqual(z07.fluege.map(f => f.text), ['LX4640 ZRH 13:20 → YYZ 16:15', 'AC269 YYZ 19:25 → YWG 22:14']);
  assert.equal(z07.ort, 'Zürich → Winnipeg');
  assert.ok(z07.termine.some(t => /Abfahrt Tuttlingen/.test(t.label)));
  assert.deepEqual(am('2026-11-24').fluege.map(f => f.text), ['LX41 LAX 19:30 → ZRH 15:35 (+1)']);
  assert.equal(am('2026-11-24').ort, 'Los Angeles → Zürich');
  assert.deepEqual(am('2026-11-25').fluege.map(f => f.text), ['LX41 Ankunft ZRH 15:35']);
  assert.equal(am('2026-11-25').ort, 'Zürich');
  const flugTage = zeilen.filter(z => z.fluege.length).map(z => z.von);
  assert.deepEqual(flugTage, ['2026-11-07', '2026-11-24', '2026-11-25']);

  // Ruhige Tage werden zusammengefasst; der Ort ist fortgeschrieben
  const z08 = am('2026-11-08');
  assert.deepEqual([z08.von, z08.bis, z08.ort, z08.fortgeschrieben], ['2026-11-08', '2026-11-09', 'Winnipeg', true]);
  assert.equal(R.reiseZeilenDatum(z08), '08.–09.11.');
  assert.equal(R.reiseZeilenDatum(z07), 'Sa 07.11.');

  // Hotel 15.–19.11. in San Francisco, belastbar
  assert.deepEqual([am('2026-11-15').hotel.art, am('2026-11-15').hotel.zeit], ['checkin', '16:00']);
  assert.equal(am('2026-11-17').hotel.art, 'nacht');
  assert.deepEqual([am('2026-11-19').hotel.art, am('2026-11-19').hotel.zeit], ['checkout', '12:00']);
  for (const t of ['2026-11-15', '2026-11-17', '2026-11-19']) {
    assert.deepEqual([am(t).ort, am(t).fortgeschrieben], ['San Francisco', false]);
  }
  assert.equal(am('2026-11-20').fortgeschrieben, true);

  // Termine: QCon, AGI, Lucas; Lucas-Frist doppelt nicht
  assert.ok(am('2026-11-16').termine.some(t => t.label === 'QCon San Francisco'));
  assert.ok(am('2026-11-18').termine.some(t => t.label === 'QCon San Francisco'));
  assert.ok(am('2026-11-19').termine.some(t => /QCon Trainings/.test(t.label)));
  const agi = am('2026-11-21').termine.find(t => /^AGI Summit/.test(t.label));
  assert.equal(agi.zeit_von, '9:00');
  assert.equal(am('2026-11-22').termine.find(t => /^AGI Summit/.test(t.label)).zeit_bis, '17:00');
  assert.equal(am('2026-11-21').ort, 'Santa Clara');
  const lucas = am('2026-11-23').termine.filter(t => /Lucas/.test(t.label));
  assert.equal(lucas.length, 1);
  assert.equal(lucas[0].quelle, 'buchung');
  assert.ok(am('2026-11-23').termine.some(t => /Check-in SWISS/.test(t.label)));
  // Fristen vor der Reise erscheinen nicht in der Leiste
  assert.ok(!zeilen.some(z => z.termine.some(t => /Check-in Air Canada/.test(t.label))));
});

test('Tagesleiste: heutiger Tag markiert, auch in einer zusammengefassten Zeile', () => {
  const { zeilen } = R.reiseTagesleiste(reise, von, bis, '2026-11-09');
  assert.deepEqual(zeilen.filter(z => z.heute).map(z => z.von), ['2026-11-08']);
  assert.equal(R.reiseTagesleiste(reise, von, bis, HEUTE).zeilen.some(z => z.heute), false);
  assert.deepEqual(R.reiseTagesleiste({}, undefined, undefined, HEUTE), { zeilen: [], eingeordnet: [] });
  // Reise ohne Daten: nur Tage, kein Ort
  const leer = R.reiseTagesleiste({}, '2026-11-07', '2026-11-08', HEUTE).zeilen;
  assert.deepEqual(leer.map(z => [z.von, z.bis, z.ort]), [['2026-11-07', '2026-11-08', '']]);
});
