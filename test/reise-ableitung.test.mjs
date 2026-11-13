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
  reiseBuchungEinordnen, reiseTagesleiste, reiseZeilenDatum, reiseZeitraumText, reiseTagKurz, reiseFlugText,
  reiseFristBezug, reiseFristEinstufung, reiseFristenGliedern, reiseHeuteOrt, reiseAktuelleStation, reiseVerlaufFalten,
  reiseBuchungStatusChip, reiseBuchungArt, reiseBuchungDatum };`)();
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

test('Review 02.11.: Treffer ausserhalb der Reise verdeckt den Termin nicht', () => {
  const r = R.reiseDatumsbereich('gebucht 02.11., Termin Di 24.11. 14:00', von, bis);
  assert.deepEqual([r.von, r.zeit_von, r.muster], ['2026-11-24', '14:00', 'tag']);
  const b = R.reiseDatumsbereich('Angebot vom 20.–22.10., Aufenthalt 10.–12.11.', von, bis);
  assert.deepEqual([b.von, b.bis], ['2026-11-10', '2026-11-12']);
});

test('Review 02.11.: Datumsbereich ueber den Jahreswechsel mit Jahr nur am Ende', () => {
  const r = R.reiseDatumsbereich('Hotel 28.12.–02.01.2027', '2026-12-27', '2027-01-05');
  assert.deepEqual([r.von, r.bis, r.muster], ['2026-12-28', '2027-01-02', 'bereich']);
});

test('Review 02.11.: Hotelwechsel am selben Tag zeigt Check-out und Check-in', () => {
  const reiseH = { buchungen: [
    { anbieter: 'Hotel Toronto', notiz: 'Check-in 08.11. 15:00, Check-out 10.11. 11:00' },
    { anbieter: 'Hotel Winnipeg', notiz: 'Check-in 10.11. 16:00, Check-out 12.11. 11:00' },
  ] };
  const { zeilen } = R.reiseTagesleiste(reiseH, '2026-11-07', '2026-11-12', HEUTE);
  const z = zeilen.find(x => x.von === '2026-11-10');
  assert.deepEqual(z.hotels.map(h => [h.art, h.label]), [['checkout', 'Hotel Toronto'], ['checkin', 'Hotel Winnipeg']]);
  assert.equal(z.ort, 'Winnipeg');
  assert.equal(z.ruhig, false);
});

test('Schema-Erweiterung 02.11.: explizite Felder vor dem Textparser', () => {
  const b = (x) => R.reiseBuchungEinordnen(x, von, bis);
  // von/bis/zeit/ort/art aus der Datei
  assert.deepEqual(b({ anbieter: 'Lucas Museum', von: '2026-11-23', zeit_von: '10:00', art: 'termin', ort: 'Los Angeles' }),
    { art: 'termin', feld: 'von', von: '2026-11-23', bis: '2026-11-23', zeit_von: '10:00', zeit_bis: '',
      muster: 'feld', label: 'Lucas Museum', ort: 'Los Angeles' });
  // art aus der Datei schlägt die Namenserkennung
  assert.equal(b({ anbieter: 'Hotel-Restaurant Abendessen', von: '2026-11-17', art: 'termin' }).art, 'termin');
  assert.equal(b({ anbieter: 'Airbnb Santa Clara', von: '2026-11-20', bis: '2026-11-22', art: 'hotel' }).art, 'hotel');
  // flug/sonstiges nie in die Leiste, Datum ausserhalb der Reise auch nicht
  assert.equal(b({ anbieter: 'United', von: '2026-11-15', art: 'flug' }), null);
  assert.equal(b({ anbieter: 'Versicherung', von: '2026-11-15', art: 'sonstiges' }), null);
  assert.equal(b({ anbieter: 'Vorab', von: '2026-10-01' }), null);
  // ort ohne Datum: Parser liefert das Datum, ort kommt aus dem Feld
  assert.equal(b({ anbieter: 'Lucas Museum', tarif: 'Mo 23.11.2026, Einlass 10:00', ort: 'Los Angeles' }).ort, 'Los Angeles');
});

test('Schema-Erweiterung: Winnipeg-Variante mit neuen Feldern', () => {
  const mitFeldern = structuredClone(reise);
  for (const f of mitFeldern.fristen) {
    if (/entscheiden|vereinbaren|buchen|prüfen|Abbuchung|tauschen/.test(f.titel)) f.art = 'aufgabe';
  }
  const lucas = mitFeldern.buchungen.find(x => /Lucas/.test(x.anbieter));
  Object.assign(lucas, { von: '2026-11-23', zeit_von: '10:00', art: 'termin', ort: 'Los Angeles' });
  const hyatt = mitFeldern.buchungen.find(x => /Hyatt/.test(x.anbieter));
  Object.assign(hyatt, { von: '2026-11-15', bis: '2026-11-19', zeit_von: '16:00', zeit_bis: '12:00', art: 'hotel', ort: 'San Francisco' });

  const { zeilen } = R.reiseTagesleiste(mitFeldern, von, bis, HEUTE);
  const am = tag => zeilen.find(z => z.von <= tag && tag <= z.bis);
  // Aufgaben-Fristen raus → die Winnipeg-Woche ist wieder eine Zeile
  assert.deepEqual([am('2026-11-10').von, am('2026-11-10').bis, am('2026-11-10').ort], ['2026-11-08', '2026-11-14', 'Winnipeg']);
  assert.equal(R.reiseZeilenDatum(am('2026-11-10')), '08.–14.11.');
  // Lucas mit ort → 23.11. Los Angeles, belastbar
  assert.deepEqual([am('2026-11-23').ort, am('2026-11-23').fortgeschrieben], ['Los Angeles', false]);
  // Termine ohne art bleiben (Abfahrt, Check-in-Fristen), Aufgaben nicht
  assert.ok(am('2026-11-07').termine.some(t => /Abfahrt/.test(t.label)));
  assert.ok(!zeilen.some(z => z.termine.some(t => /First-Upgrade/.test(t.label))));
  // Hotel unverändert
  assert.deepEqual([am('2026-11-15').hotel.art, am('2026-11-15').hotel.zeit], ['checkin', '16:00']);
  // Als Nächstes zeigt Aufgaben weiter
  assert.deepEqual(R.reiseNaechsteFristen(mitFeldern.fristen, HEUTE).map(f => f.faellig), ['2026-10-31', '2026-11-02', '2026-11-04']);
});

// ── CP2-0 (13.11.2026): Reisen-Karte entlastet ──
// v11 (Stand 02.11.) für die Vergangen-Regel; v20 = Auszug der Reisedatei vom 13.11.
// (ohne Buchungscodes, Tickets, Dokumente, Kontakte; Mailadressen maskiert).
const v20 = JSON.parse(readFileSync(new URL('./fixtures/reise-261107-winnipeg-v20.json', import.meta.url), 'utf8'));
const STICHTAG = '2026-11-12';
const titelVon = (liste) => liste.map(f => f.titel);

test('Vergangen-Regel v11, Stichtag 12.11.: Check-in-Frist vergangen, Rest offen', () => {
  const check = reise.fristen.find(f => f.titel === 'Online-Check-in Air Canada öffnet');
  assert.equal(R.reiseFristBezug(check, reise), '2026-11-07');            // „24 h vor LX4640" → Abflug 07.11.
  assert.equal(R.reiseFristEinstufung(check, reise, STICHTAG), 'vergangen');
  assert.equal(R.reiseFristEinstufung(check, reise, '2026-11-07'), 'ueberfaellig');   // am Flugtag noch offen
  const g = R.reiseFristenGliedern(reise, STICHTAG);
  assert.deepEqual(titelVon(g.vergangen), ['Online-Check-in Air Canada öffnet']);
  // Bezug in der Zukunft → überfällig, nicht vergangen
  assert.equal(R.reiseFristBezug(reise.fristen.find(f => f.titel.startsWith('LX41:')), reise), '2026-11-25');
  assert.equal(R.reiseFristBezug(reise.fristen.find(f => f.titel.startsWith('Hotels Santa Clara')), reise), '2026-11-24');   // spätestes Datum im Titel
  assert.equal(R.reiseFristBezug(reise.fristen.find(f => f.titel.startsWith('Hotel SF')), reise), '2026-11-20');
  // Kein erkennbares Bezugsereignis, kein Termin → im Zweifel offen
  const abfahrt = reise.fristen.find(f => f.titel.startsWith('Abfahrt Tuttlingen'));
  assert.equal(R.reiseFristBezug(abfahrt, reise), null);
  assert.equal(R.reiseFristEinstufung(abfahrt, reise, STICHTAG), 'ueberfaellig');
  assert.deepEqual([g.ueberfaellig.length, g.kommend.length, g.vergangen.length, g.offen], [6, 7, 1, 13]);
  assert.ok(g.vergangen.every(f => f.ton === '' && f.rest === 'vorbei'));
  assert.ok(g.ueberfaellig.every(f => f.ton === 'rot'));
});

test('Unterkunft-Frist bleibt offen bis zum Ende ihres Zeitraums (15.11.)', () => {
  for (const titel of ['Unterkunft Vancouver ab 13.11. bis 15.11. klären', 'Unterkunft 10.–15.11. klären']) {
    const f = { faellig: '2026-11-10', titel, status: 'offen', art: 'aufgabe' };
    const r = { ...reise, fristen: [...reise.fristen, f] };
    assert.equal(R.reiseFristBezug(f, r), '2026-11-15', titel);
    assert.equal(R.reiseFristEinstufung(f, r, STICHTAG), 'ueberfaellig', titel);
    assert.equal(R.reiseFristEinstufung(f, r, '2026-11-15'), 'ueberfaellig', titel);
    assert.equal(R.reiseFristEinstufung(f, r, '2026-11-16'), 'vergangen', titel);
  }
  // Vor ihrer Fälligkeit ist sie kommend
  assert.equal(R.reiseFristEinstufung({ faellig: '2026-11-13', titel: 'Unterkunft Vancouver ab 13.11. bis 15.11. klären', status: 'offen' }, reise, STICHTAG), 'kommend');
});

test('v20 (13.11.): Kommend/Überfällig-Zählung, Termine ohne Bezug vergehen mit ihrem Datum', () => {
  const g = R.reiseFristenGliedern(v20, STICHTAG);
  assert.equal(v20.fristen.filter(f => f.status !== 'erledigt').length, 16);
  assert.deepEqual(titelVon(g.vergangen), ['Online-Check-in Air Canada öffnet', 'Abfahrt Tuttlingen ca. 09:30',
    'Online-Check-in Air Canada XCODEX öffnet (24 h vor AC293)']);
  assert.deepEqual(titelVon(g.ueberfaellig), ['Hotels Santa Clara (20.–22.11.) und Los Angeles (22.–24.11.) buchen – je 2 Betten (mit Bernd Huber)',
    'Flug San José → Los Angeles (So 22.11.) buchen', 'Hotel SF: Nacht 19.→20.11. entscheiden (Hyatt-Reservierung nicht änderbar → ggf. separate Buchung)']);
  assert.deepEqual([g.ueberfaellig.length, g.kommend.length, g.vergangen.length, g.erledigt.length, g.offen], [3, 10, 3, 5, 13]);
  assert.deepEqual(g.kommend.slice(0, 3).map(f => [f.faellig, f.rest]), [['2026-11-13', 'morgen'], ['2026-11-13', 'morgen'], ['2026-11-14', 'in 2 Tg.']]);
  // „Alle Fristen" zählt die nicht erledigten: 3 + 10 + 3 = 16
  assert.equal(g.ueberfaellig.length + g.kommend.length + g.vergangen.length, 16);
});

test('Aktuelle Station am 12.11.: Victoria; Reisetag mit Ortswechsel ohne Station; außerhalb leer', () => {
  const z = (tag) => R.reiseTagesleiste(v20, v20.von, v20.bis, tag).zeilen;
  assert.equal(R.reiseAktuelleStation(z(STICHTAG), STICHTAG), 'Victoria');
  assert.equal(R.reiseAktuelleStation(z('2026-11-16'), '2026-11-16'), 'San Francisco');
  assert.equal(R.reiseAktuelleStation(z('2026-11-15'), '2026-11-15'), '');   // Vancouver → San Francisco
  assert.equal(R.reiseAktuelleStation(z('2026-11-30'), '2026-11-30'), '');
  assert.equal(R.reiseAktuelleStation(R.reiseTagesleiste(reise, von, bis, STICHTAG).zeilen, STICHTAG), 'Winnipeg');   // v11 kannte Victoria noch nicht
  assert.equal(R.reiseCountdown(v20.von, v20.bis, STICHTAG).text, 'Tag 6 von 19');
});

test('Zusammenfassungszeile vergangener Tage', () => {
  const zeilen = R.reiseTagesleiste(v20, v20.von, v20.bis, STICHTAG).zeilen;
  const f = R.reiseVerlaufFalten(zeilen, STICHTAG);
  assert.equal(f.text, 'Sa 07.–Di 10. · 4 Stationen');
  assert.equal(f.vergangen.length + f.rest.length, zeilen.length);
  assert.ok(f.rest[0].heute && f.rest[0].von <= STICHTAG && STICHTAG <= f.rest[0].bis);
  // Inhalt unverändert: dieselben Zeilenobjekte
  assert.deepEqual([...f.vergangen, ...f.rest], zeilen);
  assert.equal(R.reiseVerlaufFalten(zeilen, '2026-11-07').text, '');   // erster Tag: nichts vergangen
  const nov = R.reiseVerlaufFalten([{ von: '2026-10-30', bis: '2026-10-31' }, { von: '2026-11-01', bis: '2026-11-01' }, { von: '2026-11-02', bis: '2026-11-02' }], '2026-11-02');
  assert.equal(nov.text, 'Fr 30.10.–So 01.11. · 2 Stationen');
  assert.equal(R.reiseVerlaufFalten([{ von: '2026-11-07', bis: '2026-11-07' }, { von: '2026-11-08', bis: '2026-11-08' }], '2026-11-08').text, 'Sa 07.11. · 1 Station');
});

test('Buchungsstatus-Chip nur bei Abweichung; Art und Datum der Zeile', () => {
  const chip = (status) => R.reiseBuchungStatusChip({ status });
  for (const s of ['bestätigt', 'bezahlt', 'gebucht', 'Senator', '', undefined]) assert.equal(chip(s), null, String(s));
  assert.deepEqual(chip('storniert'), { text: 'storniert', klasse: 'chip-err' });
  assert.deepEqual(chip('offen'), { text: 'offen', klasse: 'chip-warn' });
  assert.deepEqual(chip('Vorschlag'), { text: 'Vorschlag', klasse: 'chip-warn' });
  assert.equal(v20.buchungen.filter(b => R.reiseBuchungStatusChip(b)).length, 0);   // alle 17 im Normalfall
  const art = v20.buchungen.map(b => R.reiseBuchungArt(b, v20.von, v20.bis));
  assert.deepEqual([...new Set(art)].sort(), ['flug', 'hotel', 'sonstiges', 'termin']);
  const fairmont = v20.buchungen.find(b => /^Fairmont/.test(b.anbieter));
  assert.equal(R.reiseBuchungDatum(fairmont, v20.von, v20.bis), '13.–15.11.');
  assert.equal(R.reiseBuchungDatum(v20.buchungen.find(b => /^Lucas/.test(b.anbieter)), v20.von, v20.bis), 'Mo 23.11.');
  assert.equal(R.reiseBuchungArt(reise.buchungen.find(b => /^Hyatt/.test(b.anbieter)), von, bis), 'hotel');   // v11 ohne Feld art
});

test('heute der Reise in Ortszeit aus dem jüngsten Briefing mit utcOffsetMin', () => {
  const b = [{ datum: '2026-11-12', gesendetAt: '2026-11-12T15:00:00Z', utcOffsetMin: -480, zeitzone: 'America/Vancouver' },
    { datum: '2026-11-11', gesendetAt: '2026-11-11T15:00:00Z' }];
  assert.deepEqual(R.reiseHeuteOrt(b, new Date('2026-11-13T05:00:00Z'), '2026-11-13'), { tag: '2026-11-12', quelle: 'ortszeit', zeitzone: 'America/Vancouver' });
  assert.equal(R.reiseHeuteOrt(b, new Date('2026-11-12T22:00:00Z'), '2026-11-12').tag, '2026-11-12');
  assert.deepEqual(R.reiseHeuteOrt([b[1]], new Date('2026-11-13T05:00:00Z'), '2026-11-13'), { tag: '2026-11-13', quelle: 'berlin' });
  assert.equal(R.reiseHeuteOrt(b, new Date('2026-11-20T05:00:00Z'), '2026-11-20').quelle, 'berlin');   // Briefing zu alt
  assert.equal(R.reiseHeuteOrt(null, new Date(), '2026-11-13').tag, '2026-11-13');
});

/* ── CP2-0b (13.11.2026): Reisen-Seite „Heute zuerst" ─────────────────────
   Fixture v20-voll: Auszug der Reisedatei vom 13.11. mit Kontakten und
   Buchungstexten; Buchungscodes durch BKnn ersetzt, Mailadressen, Ticket-,
   Kunden- und Mitgliedsnummern maskiert. Stichtag 12.11. 20:00 Ortszeit. */
const V3 = new Function(`${js}
return { reiseStationen, reiseTitelAusStationen, reiseAnlaesse, reiseZeitraumKurz, reiseTagesleiste, reiseEreignisse,
  reiseNaechste36, reiseAktionenFuer, reiseSummen, reiseLinksUndKontakte, reiseSichereUrl, reisePlan, reiseBuchungsgruppen,
  reiseBuchungZeilenDatum, reiseZuErledigen, reiseFristenGliedern, reiseJetztOrt, reiseStadtVonIata, reiseTelUrl };`)();
const voll = JSON.parse(readFileSync(new URL('./fixtures/reise-261107-winnipeg-v20-voll.json', import.meta.url), 'utf8'));
const RV = voll.reise;
const TAG = '2026-11-12', UHR = 20 * 60;
const zeilenV3 = V3.reiseTagesleiste(RV, voll.start_date, voll.end_date, TAG).zeilen;
const ereignisseV3 = V3.reiseEreignisse(RV, voll.start_date, voll.end_date);
const ereignis = (titel) => ereignisseV3.find(e => e.titel.startsWith(titel));

test('v3: Stationen aus dem Verlauf — 8 Stationen, Victoria aktuell; Titel, Anlässe, Zeitraum', () => {
  const st = V3.reiseStationen(zeilenV3, TAG);
  assert.deepEqual(st.map(s => `${s.ort} ${s.spanne}`), ['Zürich Sa 07.', 'Winnipeg 07.–10.', 'Victoria 10.–13.', 'Vancouver 13.–15.',
    'San Francisco 15.–20.', 'Santa Clara 21.–22.', 'Los Angeles 23.–24.', 'Zürich Mi 25.']);
  assert.deepEqual(st.map(s => s.zustand), ['vorbei', 'vorbei', 'jetzt', 'kommend', 'kommend', 'kommend', 'kommend', 'kommend']);
  assert.equal(V3.reiseTitelAusStationen(st, voll.name), 'Winnipeg → Los Angeles');
  assert.equal(V3.reiseTitelAusStationen([{ ort: 'Zürich' }, { ort: 'Tuttlingen' }], 'Ersatz'), 'Ersatz');
  assert.deepEqual(V3.reiseAnlaesse(voll.name).map(a => a.anlass), ['TobaGrown', 'QCon', 'AGI Summit']);
  assert.equal(V3.reiseZeitraumKurz(voll.start_date, voll.end_date), '07.–25.11.2026');
  // Reisetag: das Ziel ist die aktuelle Station; vor/nach der Reise keine
  assert.equal(V3.reiseStationen(zeilenV3, '2026-11-15').find(s => s.zustand === 'jetzt').ort, 'San Francisco');
  assert.ok(V3.reiseStationen(zeilenV3, '2026-11-30').every(s => s.zustand === 'vorbei'));
  assert.equal(V3.reiseStadtVonIata('Victoria Harbour'), 'Victoria');
  assert.equal(V3.reiseStadtVonIata('YVR'), 'Vancouver');
});

test('v3: die nächsten 36 Stunden ab 12.11. 20:00 Ortszeit — Seair, Fairmont, Essensbestellung', () => {
  const n = V3.reiseNaechste36(ereignisseV3, RV, TAG, UHR);
  assert.deepEqual(n.map(e => [e.wann, e.zeitArt, e.zeit, e.titel.slice(0, 20)]), [
    ['morgen', '', '10:30', 'Seair 528 · Victoria'],
    ['morgen', '', '15:00', 'Check-in Fairmont Pa'],
    ['Sa', 'bis', '00:25', 'Essensbestellung AC5']]);
  assert.equal(n[2].unter, 'Flug Vancouver → San Francisco am So 15.11., 12:25');
  // Die Termin-Frist „Seair 528 …, 10:30" steht nicht doppelt neben dem Flug
  assert.equal(ereignisseV3.filter(e => /Seair 528/.test(e.titel)).length, 1);
  // Fenstergrenzen: 36 h ab 13.11. 13:00 reichen bis 15.11. 01:00
  assert.deepEqual(V3.reiseNaechste36(ereignisseV3, RV, '2026-11-13', 13 * 60).map(e => e.zeit), ['15:00', '00:25']);
  assert.deepEqual(V3.reiseNaechste36(ereignisseV3, RV, '2026-11-25', 16 * 60), []);   // nach der Ankunft: leer
  assert.equal(V3.reiseNaechste36(ereignisseV3, RV, '2026-11-20', 8 * 60)[0].titel, 'AGI Summit Silicon Valley');   // 21.11. 09:00 liegt im Fenster
  assert.deepEqual(V3.reiseNaechste36(ereignisseV3, RV, TAG, null), []);
});

test('v3: Summe je Währung aus den Buchungsbeträgen der Fixture', () => {
  const nachgerechnet = {};
  for (const b of RV.buchungen) if (b.preis != null) nachgerechnet[b.waehrung] = (nachgerechnet[b.waehrung] || 0) + Math.round(b.preis * 100);
  const summen = V3.reiseSummen(RV.buchungen);
  assert.deepEqual(summen.map(s => [s.waehrung, Math.round(s.betrag * 100)]), Object.entries(nachgerechnet));
  assert.deepEqual(summen, [{ waehrung: 'CHF', betrag: 7331.75 }, { waehrung: 'CAD', betrag: 4069.98 }, { waehrung: 'USD', betrag: 8231.63 }]);
  assert.deepEqual(V3.reiseSummen([{ preis: 0.1, waehrung: 'EUR' }, { preis: 0.2, waehrung: 'EUR' }, { preis: 5 }, { waehrung: 'EUR' }]),
    [{ waehrung: 'EUR', betrag: 0.3 }]);   // in Cent gerechnet, ohne Währung zählt nicht
});

test('v3: Aktions-Chips — Tagesprogramm, Buchung, Hotel + Karte, kein Chip ohne Zuordnung', () => {
  const art = (e) => V3.reiseAktionenFuer(e, RV).map(a => a.text);
  const qcon = V3.reiseAktionenFuer(ereignis('QCon Tag 1'), RV);
  assert.deepEqual(qcon.map(a => [a.text, a.titel]), [['Tagesprogramm', 'QCon Mo 16.11. – Tagesprogramm']]);
  assert.equal(qcon[0].url, RV.kontakte.find(k => k.name === 'QCon Mo 16.11. – Tagesprogramm').url);
  const ac564 = V3.reiseAktionenFuer(ereignis('AC564'), RV).find(a => a.art === 'buchung');
  assert.match(RV.buchungen[ac564.buchung].anbieter, /^Air Canada AC564/);   // in der Reisedatei CQFPL5, hier maskiert
  const fairmont = V3.reiseAktionenFuer(ereignis('Check-in Fairmont'), RV);
  assert.deepEqual(fairmont.map(a => a.text), ['Hotel', 'Karte', 'Anrufen']);
  assert.match(fairmont[1].url, /^https:\/\/maps\.apple\.com\/\?q=Fairmont%20Pacific%20Rim%20Vancouver%2C%201038%20Canada%20Place$/);
  assert.equal(fairmont[2].url, 'tel:+16046955300');
  assert.deepEqual(art({ tag: '2026-11-17', titel: 'Essen mit Ron Gershoni (Jetty)', art: 'termin' }), []);
  assert.deepEqual(art(ereignis('Training') || ereignis('QCon Training')), ['Programm']);
  assert.deepEqual(art(ereignis('Lucas Museum')).slice(0, 2), ['Tickets', 'Karte']);
  assert.deepEqual(art(ereignis('Check-out Fairmont')), []);   // steht schon am Check-in
  // Datum allein ordnet nichts zu, Schlüsselwort allein nimmt den Link ohne fremdes Datum
  assert.deepEqual(art({ tag: '2026-11-16', titel: 'Abendessen', art: 'termin' }), []);
  assert.equal(V3.reiseAktionenFuer({ tag: '2026-11-25', titel: 'QCon Nachlese', art: 'termin' }, RV)[0].titel, 'QCon San Francisco – Programm mit Räumen');
  // Links aus /api/links zählen mit; eine javascript:-Adresse ergibt keinen Chip
  const api = [{ label: 'QCon Mo 16.11. Folien', spWebUrl: 'https://example.sharepoint.com/folien' }];
  assert.equal(V3.reiseAktionenFuer(ereignis('QCon Tag 1'), RV, api)[0].url, 'https://example.sharepoint.com/folien');
  const boese = { ...RV, kontakte: [{ name: 'QCon Mo 16.11. – Tagesprogramm', url: 'javascript:alert(1)' }], buchungen: [] };
  assert.deepEqual(V3.reiseAktionenFuer({ tag: '2026-11-16', titel: 'QCon Tag 1', art: 'termin' }, boese), []);
});

test('v3: Links und Kontakte getrennt; URL-Prüfung lehnt javascript: ab', () => {
  const { links, kontakte } = V3.reiseLinksUndKontakte(RV.kontakte);
  assert.equal(links.length, 14);
  assert.deepEqual(kontakte.map(k => k.name.split(/\s[–(]/)[0]), ['Jesse Lavoie', 'SWISS Service Center', 'Troy', 'Seair Seaplanes', 'Fairmont Pacific Rim Vancouver']);
  // Telefon + URL: unter Kontakte, URL zusätzlich unter Links; nur URL: nur Links
  assert.ok(links.some(l => l.titel === 'SWISS Service Center'));
  assert.ok(!kontakte.some(k => /QCon/.test(k.name)));
  assert.ok(!links.some(l => /Fairmont/.test(l.titel)));
  for (const schlecht of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,x', '/dashboard/x', '//boese.example', 'tel:+1-800-ABC', 'ftp://x']) {
    assert.equal(V3.reiseSichereUrl(schlecht), '', schlecht);
  }
  assert.equal(V3.reiseSichereUrl('https://qconsf.com/schedule/nov2026#day-319'), 'https://qconsf.com/schedule/nov2026#day-319');
  assert.equal(V3.reiseSichereUrl('tel:+41848700700'), 'tel:+41848700700');
  assert.equal(V3.reiseTelUrl('+1 604 695 5300 / +1 800 000'), 'tel:+16046955300');
  assert.deepEqual(V3.reiseLinksUndKontakte([{ name: 'X', url: 'javascript:alert(1)' }]), { links: [], kontakte: [{ name: 'X', url: 'javascript:alert(1)' }] });
});

test('v3: Reiseplan — vergangene Tage gefaltet, heute zuerst, AGI als Block, Unterkunft, offene Hotels', () => {
  const p = V3.reisePlan(voll, RV, TAG);
  assert.equal(p.spanneVergangen, '07.–11.');
  assert.equal(p.kurz, 'Zürich → Winnipeg · TobaGrown · 5 Tage');
  assert.deepEqual([p.rest[0].von, p.rest[0].heute, p.rest[0].ort], [TAG, true, 'Victoria']);
  const tag = (von) => p.rest.find(d => d.von === von);
  assert.deepEqual(tag('2026-11-13').ereignisse.map(e => e.zeit), ['10:30', '15:00']);
  assert.equal(tag('2026-11-13').wechsel, true);
  assert.deepEqual(tag('2026-11-14').unterkunft, { text: 'Fairmont Pacific Rim', spanne: '13.–15.' });
  assert.equal(tag('2026-11-13').unterkunft, null);   // Check-in-Tag: steht als Ereignis da
  assert.deepEqual(tag('2026-11-16').unterkunft, { text: 'Hyatt Regency', spanne: '15.–19.' });
  const agi = tag('2026-11-21');
  assert.deepEqual([agi.bis, agi.tage, agi.ereignisse.filter(e => e.art === 'termin').length], ['2026-11-22', 2, 1]);
  assert.deepEqual(tag('2026-11-19').offen, ['Nacht 19.→20. noch offen']);
  assert.deepEqual(tag('2026-11-20').offen, ['Hotel Santa Clara 20.–22. noch offen']);
  assert.deepEqual(agi.offen, ['Hotel Los Angeles 22.–24. noch offen']);
  assert.equal(p.rest[p.rest.length - 1].ereignisse[0].titel, 'Ankunft Zürich');
});

test('v3: Buchungen gruppiert, Programmpunkte unter ihrer Buchung, Datum der Zeile', () => {
  const g = V3.reiseBuchungsgruppen(RV, voll.start_date, voll.end_date);
  assert.deepEqual(g.map(x => [x.titel, x.zeilen.length]), [['Flüge', 4], ['Unterkünfte', 2], ['Tickets', 3], ['Sonstiges', 1]]);
  assert.equal(g.reduce((n, x) => n + x.zeilen.reduce((m, z) => m + 1 + z.teile.length, 0), 0), 17);   // nichts geht verloren
  const qcon = g[2].zeilen.find(z => /^QCon/.test(z.buchung.anbieter));
  assert.equal(qcon.teile.length, 5);
  const datum = (z) => V3.reiseBuchungZeilenDatum(z, RV, voll.start_date, voll.end_date);
  assert.deepEqual(g[0].zeilen.map(datum), ['07.11. / 24.11.', 'Di 10.11.', 'Fr 13.11.', 'So 15.11.']);
  assert.equal(datum(qcon), '16.–19.11.');
});

test('v3: Zu erledigen — Aufgaben, überfällig zuerst, Fristtext', () => {
  const g = V3.reiseFristenGliedern(RV, TAG);
  const z = V3.reiseZuErledigen(g, TAG);
  assert.deepEqual(z.map(f => f.bis), ['überfällig', 'überfällig', 'überfällig', 'bis Fr', 'bis So']);
  assert.match(z[3].titel, /^Treffen mit Troy/);
  assert.ok(z.every(f => f.art !== 'termin'));
  assert.equal(V3.reiseZuErledigen(g, TAG, 9).find(f => f.faellig === '2026-11-20').bis, 'bis Fr 20.');
});

test('v3: jetzt am Reiseort aus utcOffsetMin, sonst Berliner Werte', () => {
  const b = [{ gesendetAt: '2026-11-12T06:00:00Z', utcOffsetMin: -480, zeitzone: 'America/Vancouver' }];
  assert.deepEqual(V3.reiseJetztOrt(b, new Date('2026-11-13T04:00:00Z'), '2026-11-13', 300),
    { tag: '2026-11-12', minuten: 1200, quelle: 'ortszeit', zeitzone: 'America/Vancouver' });
  assert.deepEqual(V3.reiseJetztOrt([], new Date('2026-11-13T04:00:00Z'), '2026-11-13', 300), { tag: '2026-11-13', minuten: 300, quelle: 'berlin' });
});
