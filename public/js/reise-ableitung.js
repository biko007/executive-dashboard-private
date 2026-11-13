/* ── Reisen-Tab: Ableitungen aus der Reisedatei (Schema bikosoc.reise/1) ────
   Owner-Auftrag 01.11.2026 „Reisen-Tab neu gestalten".

   Reine Funktionen ohne DOM und ohne Seitenzustand — die Darstellung steht in
   reise-ansicht.js, die Tests in test/reise-ableitung.test.mjs lesen genau
   diese Datei. Alle Tage sind ISO-Zeichenketten 'JJJJ-MM-TT', gerechnet wird
   in UTC-Mitternacht, damit keine Zeitzone und kein Sommerzeitwechsel einen
   Tag verschiebt. „heute" reicht der Aufrufer herein (Europe/Berlin).

   Das Schema bleibt unverändert. Wo der neue Aufbau ein Feld braucht, das es
   nicht gibt (Datum einer Buchung, Ort je Tag), wird es hier aus vorhandenen
   Feldern abgeleitet — nie erfunden. Was sich nicht ableiten lässt, bleibt
   weg oder wird als fortgeschrieben gekennzeichnet. */

/* Flughafen → Stadt. Bewusst klein: nur Flughäfen, die in Reisen des Owners
   vorkommen oder naheliegen. Unbekannte Codes erscheinen als Code. */
const REISE_IATA_STADT = {
  ZRH: 'Zürich', FRA: 'Frankfurt', MUC: 'München', STR: 'Stuttgart', BSL: 'Basel',
  YYZ: 'Toronto', YWG: 'Winnipeg', YVR: 'Vancouver', YYJ: 'Victoria', YUL: 'Montréal',
  SFO: 'San Francisco', SJC: 'San José', LAX: 'Los Angeles', JFK: 'New York',
  EWR: 'New York', ORD: 'Chicago', SEA: 'Seattle', BCN: 'Barcelona', LHR: 'London',
};

/* Städte, nach denen in Buchungstexten gesucht wird (Hotel- und Terminort).
   Mehrwortnamen stehen vor ihren Teilen, „San José" auch ohne Akzent. */
const REISE_STAEDTE = [
  'San Francisco', 'Santa Clara', 'San José', 'San Jose', 'Los Angeles', 'New York',
  'Vancouver', 'Winnipeg', 'Toronto', 'Zürich', 'Frankfurt', 'München', 'Stuttgart',
  'Chicago', 'Seattle', 'Barcelona', 'London',
];

const REISE_WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function reiseIstTag(tag) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(tag || ''))
    && !Number.isNaN(Date.parse(tag + 'T00:00:00Z'));
}

/* Tage von `a` bis `b`; positiv heisst: b liegt später. */
function reiseTageZwischen(a, b) {
  if (!reiseIstTag(a) || !reiseIstTag(b)) return null;
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

function reiseTagPlus(tag, tage) {
  const d = new Date(Date.parse(tag + 'T00:00:00Z'));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/* 'Sa 07.11.' */
function reiseTagKurz(tag) {
  if (!reiseIstTag(tag)) return '';
  const wt = REISE_WOCHENTAG[new Date(Date.parse(tag + 'T00:00:00Z')).getUTCDay()];
  return `${wt} ${tag.slice(8, 10)}.${tag.slice(5, 7)}.`;
}

/* '07.11.–25.11.2026'; bei Jahreswechsel trägt auch der Beginn sein Jahr. */
function reiseZeitraumText(von, bis) {
  if (!reiseIstTag(von)) return '';
  const tm = t => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
  if (!reiseIstTag(bis) || bis === von) return tm(von) + von.slice(0, 4);
  const anfang = von.slice(0, 4) === bis.slice(0, 4) ? tm(von) : tm(von) + von.slice(0, 4);
  return `${anfang}–${tm(bis)}${bis.slice(0, 4)}`;
}

/* Countdown für die Kopfzeile: vor der Reise „in N Tagen", während der Reise
   „Tag X von Y", danach „beendet". */
function reiseCountdown(von, bis, heute) {
  const bisTag = reiseIstTag(bis) ? bis : von;
  const vor = reiseTageZwischen(heute, von);
  const nach = reiseTageZwischen(heute, bisTag);
  if (vor == null || nach == null) return { art: 'unbekannt', text: '' };
  if (vor > 0) return { art: 'vorher', text: vor === 1 ? 'morgen' : `in ${vor} Tagen` };
  if (nach >= 0) {
    const gesamt = reiseTageZwischen(von, bisTag) + 1;
    return { art: 'waehrend', text: `Tag ${1 - vor} von ${gesamt}` };
  }
  return { art: 'nachher', text: 'beendet' };
}

/* Höchstens `max` Chips sichtbar: zuerst alle roten, dann die gelben (amber),
   jeweils in Dateireihenfolge. Alles andere — grün, blau, gedämpft und
   überzählige rot/gelb — kommt in „Erledigt & Hinweise", in Dateireihenfolge. */
function reiseChipAuswahl(chips, max = 3) {
  const liste = Array.isArray(chips) ? chips.filter(c => c && c.text) : [];
  const warnend = [...liste.filter(c => c.ton === 'red'), ...liste.filter(c => c.ton === 'amber')];
  const sichtbar = warnend.slice(0, max);
  const rest = liste.filter(c => !sichtbar.includes(c));
  return { sichtbar, rest };
}

/* Farbe und Resttext einer Frist — dieselbe Logik wie im Fristenblock:
   überfällig rot, bis sieben Tage gelb. */
function reiseFristLage(faellig, heute) {
  const tage = reiseTageZwischen(heute, faellig);
  if (tage == null) return { tage: null, ton: '', rest: '' };
  if (tage < 0) return { tage, ton: 'rot', rest: 'überfällig' };
  if (tage === 0) return { tage, ton: 'gelb', rest: 'heute' };
  return { tage, ton: tage <= 7 ? 'gelb' : '', rest: tage === 1 ? 'morgen' : `in ${tage} Tg.` };
}

/* Die nächsten `n` offenen Fristen nach Fälligkeit. Eine Frist ohne Status
   gilt als offen (das Schema kennt nur offen/erledigt); ohne gültiges Datum
   zählt sie nicht. Gleiches Datum: Dateireihenfolge. */
function reiseNaechsteFristen(fristen, heute, n = 3) {
  return (Array.isArray(fristen) ? fristen : [])
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => (f.status || 'offen') === 'offen' && reiseIstTag(f.faellig))
    .sort((x, y) => x.f.faellig.localeCompare(y.f.faellig) || x.index - y.index)
    .slice(0, n)
    .map(({ f }) => ({ ...f, ...reiseFristLage(f.faellig, heute) }));
}

/* ── Datumsparser für Buchungstexte ───────────────────────────────────────
   Buchungen haben im Schema kein Datum. Die Texte des Reiseassistenten
   nennen es aber zuverlässig in wenigen Formen:
     „Check-in So 15.11. 16:00, Check-out Do 19.11. 12:00"
     „15.–19.11."  „Mo 16.–Mi 18.11."  „Sa 21.11. 9:00 – So 22.11. 17:00"
     „Mo 23.11.2026, Einlass 10:00"
   Ohne Jahr gilt das Reisejahr; ein Monat vor dem Reisebeginnmonat gehört
   bei einer Reise über den Jahreswechsel ins Folgejahr. */

const REISE_WT = '(?:(?:Mo|Di|Mi|Do|Fr|Sa|So)\\.?\\s+)?';
const REISE_UHR = '(\\d{1,2}:\\d{2})';
const REISE_MUSTER_CHECKIN = new RegExp(`check-?in\\D{0,12}?(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})?(?:\\s*${REISE_UHR})?`, 'i');
const REISE_MUSTER_CHECKOUT = new RegExp(`check-?out\\D{0,12}?(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})?(?:\\s*${REISE_UHR})?`, 'i');
const REISE_MUSTER_BEREICH = new RegExp(
  `${REISE_WT}(\\d{1,2})\\.(?:(\\d{1,2})\\.)?(\\d{4})?(?:\\s+${REISE_UHR})?\\s*[–—-]\\s*`
  + `${REISE_WT}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})?(?:\\s+${REISE_UHR})?`);
const REISE_MUSTER_TAG = new RegExp(
  `${REISE_WT}(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})?(?:[,\\s]+(?:Einlass|ab|um)?\\s*${REISE_UHR})?`);

function reiseDatumAus(tag, monat, jahr, reiseVon) {
  const t = Number(tag), m = Number(monat);
  if (!(t >= 1 && t <= 31 && m >= 1 && m <= 12)) return null;
  let j = Number(jahr);
  if (!jahr) {
    j = Number(reiseVon.slice(0, 4));
    if (m < Number(reiseVon.slice(5, 7))) j += 1;
  }
  const iso = `${j}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
  // 31.11. o. ä. rollt in Date.parse nicht still weiter — gegenprüfen
  const d = new Date(Date.parse(iso + 'T00:00:00Z'));
  return d.getUTCDate() === t && d.getUTCMonth() + 1 === m ? iso : null;
}

/* Ersten Datumsbereich in `text` suchen. Ergebnis
   { von, bis, zeit_von, zeit_bis, muster } oder null. Ein Treffer muss sich
   mit dem Reisezeitraum überschneiden — sonst ist es ein Datum aus einer
   Notiz („Seit 19.10. online keine Flugänderung"), kein Buchungstermin. */
function reiseDatumsbereich(text, reiseVon, reiseBis) {
  const s = String(text || '');
  if (!s || !reiseIstTag(reiseVon)) return null;
  const bisReise = reiseIstTag(reiseBis) ? reiseBis : reiseVon;
  const imZeitraum = r => r && r.von && r.bis && r.von <= r.bis && r.bis >= reiseVon && r.von <= bisReise;
  /* Alle Treffer eines Musters, nicht nur der erste: Notizen nennen oft vorn
     ein Buchungs- oder Bestätigungsdatum („gebucht 02.11., Termin Di 24.11.")
     — das liegt vor der Reise und darf den eigentlichen Termin nicht verdecken
     (Review 02.11.2026). */
  const alle = muster => [...s.matchAll(new RegExp(muster.source, muster.flags + 'g'))];

  for (const ein of alle(REISE_MUSTER_CHECKIN)) {
    for (const aus of alle(REISE_MUSTER_CHECKOUT)) {
      const r = { von: reiseDatumAus(ein[1], ein[2], ein[3], reiseVon), bis: reiseDatumAus(aus[1], aus[2], aus[3], reiseVon),
        zeit_von: ein[4] || '', zeit_bis: aus[4] || '', muster: 'checkin' };
      if (imZeitraum(r)) return r;
    }
  }

  for (const b of alle(REISE_MUSTER_BEREICH)) {
    // „15.–19.11." nennt den Monat nur einmal; bei „28.–02.12." ist es der Vormonat
    let monatVon = b[2] || b[6];
    if (!b[2] && Number(b[1]) > Number(b[5])) monatVon = String(Number(b[6]) === 1 ? 12 : Number(b[6]) - 1);
    /* Steht das Jahr nur am Ende („28.12.–02.01.2027"), gehört ein späterer
       Beginnmonat ins Vorjahr — sonst wäre der Beginn nach dem Ende. */
    let jahrVon = b[3];
    if (!jahrVon && b[7]) jahrVon = String(Number(monatVon) > Number(b[6]) ? Number(b[7]) - 1 : Number(b[7]));
    const r = { von: reiseDatumAus(b[1], monatVon, jahrVon, reiseVon), bis: reiseDatumAus(b[5], b[6], b[7], reiseVon),
      zeit_von: b[4] || '', zeit_bis: b[8] || '', muster: 'bereich' };
    if (imZeitraum(r)) return r;
  }

  for (const e of alle(REISE_MUSTER_TAG)) {
    const tag = reiseDatumAus(e[1], e[2], e[3], reiseVon);
    const r = { von: tag, bis: tag, zeit_von: e[4] || '', zeit_bis: '', muster: 'tag' };
    if (imZeitraum(r)) return r;
  }
  return null;
}

/* Erste Stadt aus REISE_STAEDTE, die im Text vorkommt (früheste Fundstelle). */
function reiseStadtImText(text) {
  const s = String(text || '');
  let beste = null;
  for (const stadt of REISE_STAEDTE) {
    const pos = s.indexOf(stadt);
    if (pos >= 0 && (beste == null || pos < beste.pos)) beste = { stadt, pos };
  }
  if (!beste) return '';
  return beste.stadt === 'San Jose' ? 'San José' : beste.stadt;
}

function reiseStadtVonIata(code) {
  const c = String(code || '').toUpperCase();
  return REISE_IATA_STADT[c] || c;
}

const REISE_HOTEL_WORT = /\b(hotel|hyatt|regency|hilton|marriott|sheraton|westin|hostel|motel|resort|inn)\b/i;

/* Eine Buchung in die Tagesleiste einordnen. Gesucht wird in `anbieter`, dann
   `tarif`, dann `notiz` — das erste Feld mit einem Treffer zählt. Hotel ist,
   was im Anbieter wie ein Hotel heisst oder ein Check-in/Check-out-Muster hat;
   alles andere ist ein Termin. null = nicht einzuordnen, dann steht die
   Buchung nur als Karte unter „Buchungen". */
function reiseBuchungEinordnen(buchung, reiseVon, reiseBis) {
  if (!buchung) return null;
  const anbieter = String(buchung.anbieter || '');
  const label = anbieter.split(/\s+[–—-]\s+/)[0] || anbieter || 'Buchung';
  /* Ort: das Feld `ort` (seit 02.11.2026), sonst zuerst der Anbietername,
     dann die übrigen Texte der Buchung. */
  const ort = (typeof buchung.ort === 'string' && buchung.ort.trim())
    || reiseStadtImText(anbieter) || reiseStadtImText(`${buchung.tarif || ''} ${buchung.notiz || ''}`);
  /* `art` aus der Datei hat Vorrang. Flüge stehen über fluege[] in der
     Leiste, „sonstiges" gehört nicht hinein — beide nur als Karte. */
  if (buchung.art === 'flug' || buchung.art === 'sonstiges') return null;
  const artFeld = buchung.art === 'hotel' || buchung.art === 'termin' ? buchung.art : null;

  /* Explizites Datum (von/bis, seit 02.11.2026) vor dem Textparser. Liegt es
     außerhalb der Reise, erscheint die Buchung nur als Karte. */
  if (reiseIstTag(buchung.von)) {
    const bis = reiseIstTag(buchung.bis) && buchung.bis >= buchung.von ? buchung.bis : buchung.von;
    const ende = reiseIstTag(reiseBis) ? reiseBis : reiseVon;
    if (bis < reiseVon || buchung.von > ende) return null;
    return {
      art: artFeld || (REISE_HOTEL_WORT.test(anbieter) ? 'hotel' : 'termin'), feld: 'von',
      von: buchung.von, bis, zeit_von: buchung.zeit_von || '', zeit_bis: buchung.zeit_bis || '',
      muster: 'feld', label, ort,
    };
  }

  for (const feld of ['anbieter', 'tarif', 'notiz']) {
    const r = reiseDatumsbereich(buchung[feld], reiseVon, reiseBis);
    if (!r) continue;
    const art = artFeld || (r.muster === 'checkin' || REISE_HOTEL_WORT.test(anbieter) ? 'hotel' : 'termin');
    return { art, feld, ...r, label, ort };
  }
  return null;
}

/* Flugzeile „LX4640 ZRH 13:20 → YYZ 16:15". */
function reiseFlugText(f, art) {
  if (art === 'an') return `${f.flugnummer} Ankunft ${f.nach} ${f.an_ortszeit || ''}`.trim();
  const ab = `${f.von} ${f.ab_ortszeit || ''}`.trim();
  const an = `${f.nach} ${f.an_ortszeit || ''}`.trim() + (f.an_datum && f.an_datum !== f.datum ? ' (+1)' : '');
  return `${f.flugnummer} ${ab} → ${an}`;
}

/* ── Tagesleiste ──────────────────────────────────────────────────────────
   Ein Eintrag je Tag von `von` bis `bis`; aufeinanderfolgende Tage ohne
   eigenes Ereignis mit gleichem Ort und gleichem Hotel werden zu einer Zeile.

   Ort je Tag, in dieser Rangfolge:
     1. Flugtag: Abflugstadt → Ankunftsstadt; Ankunftstag eines Nachtflugs:
        Ankunftsstadt
     2. Hotelnacht, Check-in- oder Check-out-Tag: Stadt aus der Hotelbuchung
     3. Termin aus einer Buchung, deren Text eine Stadt nennt
     4. sonst der letzte bekannte Ort, fortgeschrieben und gekennzeichnet
   Ohne jeden bekannten Ort bleibt der Ort leer.

   Termine: eingeordnete Buchungen sowie alle offenen Fristen, die in den
   Reisezeitraum fallen. Eine Frist entfällt, wenn am selben Tag eine Buchung
   desselben Anbieters steht (Lucas Museum: Buchung und Frist „Einlass").

   Ergebnis: [{ von, bis, ort, fortgeschrieben, fluege[], hotel, hotels[], termine[],
   heute, ruhig }]. Die Rohinformation `eingeordnet` nennt je Buchung, ob und
   wie sie eingeordnet wurde (für Report und Test). */
function reiseTagesleiste(reise, von, bis, heute) {
  if (!reiseIstTag(von)) return { zeilen: [], eingeordnet: [] };
  const ende = reiseIstTag(bis) && bis >= von ? bis : von;
  const fluege = Array.isArray(reise?.fluege) ? reise.fluege : [];
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const fristen = Array.isArray(reise?.fristen) ? reise.fristen : [];

  const eingeordnet = buchungen.map(b => ({ buchung: b, ergebnis: reiseBuchungEinordnen(b, von, ende) }));
  const hotels = eingeordnet.filter(x => x.ergebnis?.art === 'hotel');
  const terminBuchungen = eingeordnet.filter(x => x.ergebnis?.art === 'termin');

  const tage = [];
  let letzterOrt = '';
  for (let tag = von; tag <= ende; tag = reiseTagPlus(tag, 1)) {
    const ab = fluege.filter(f => f.datum === tag);
    const an = fluege.filter(f => f.an_datum && f.an_datum !== f.datum && f.an_datum === tag);
    const tagFluege = [...an.map(f => ({ text: reiseFlugText(f, 'an'), flug: f })),
      ...ab.map(f => ({ text: reiseFlugText(f, 'ab'), flug: f }))];

    /* Alle Hotels des Tages — beim Hotelwechsel sind es zwei (Review
       02.11.2026). Check-out steht vor Check-in; `hotel` ist das Hotel, in dem
       die Nacht verbracht wird, und liefert den Ort. */
    const tagHotels = hotels
      .filter(x => x.ergebnis.von <= tag && tag <= x.ergebnis.bis)
      .map(x => ({
        label: x.ergebnis.label, ort: x.ergebnis.ort,
        art: tag === x.ergebnis.von ? 'checkin' : tag === x.ergebnis.bis ? 'checkout' : 'nacht',
        zeit: tag === x.ergebnis.von ? x.ergebnis.zeit_von : tag === x.ergebnis.bis ? x.ergebnis.zeit_bis : '',
      }))
      .sort((x, y) => (x.art === 'checkout' ? 0 : 1) - (y.art === 'checkout' ? 0 : 1));
    const hotel = tagHotels.find(x => x.art !== 'checkout') || tagHotels[0] || null;

    const termine = terminBuchungen
      .filter(x => x.ergebnis.von <= tag && tag <= x.ergebnis.bis)
      .map(x => ({
        label: x.ergebnis.label, quelle: 'buchung', ort: x.ergebnis.ort,
        zeit_von: tag === x.ergebnis.von ? x.ergebnis.zeit_von : '',
        zeit_bis: tag === x.ergebnis.bis ? x.ergebnis.zeit_bis : '',
      }));
    const anbieterWorte = termine.map(t => (t.label.split(/\s+/)[0] || '').toLowerCase()).filter(w => w.length >= 4);
    for (const f of fristen) {
      if ((f.status || 'offen') !== 'offen' || f.faellig !== tag) continue;
      // Aufgaben (fristen[].art, seit 02.11.2026) stehen nur unter „Als Nächstes"
      if (f.art === 'aufgabe') continue;
      const titel = String(f.titel || '').toLowerCase();
      if (anbieterWorte.some(w => titel.includes(w))) continue;
      termine.push({ label: f.titel, quelle: 'frist', notiz: f.notiz || '' });
    }

    let ort = '', fortgeschrieben = false;
    if (ab.length) {
      const start = reiseStadtVonIata(ab[0].von);
      const ziel = reiseStadtVonIata(ab[ab.length - 1].nach);
      ort = start === ziel ? ziel : `${start} → ${ziel}`;
      const letzter = ab[ab.length - 1];
      letzterOrt = letzter.an_datum && letzter.an_datum !== letzter.datum ? '' : ziel;
    } else if (an.length) {
      ort = letzterOrt = reiseStadtVonIata(an[an.length - 1].nach);
    } else if (hotel?.ort) {
      ort = letzterOrt = hotel.ort;
    } else if (termine.find(t => t.ort)) {
      ort = letzterOrt = termine.find(t => t.ort).ort;
    } else if (letzterOrt) {
      ort = letzterOrt;
      fortgeschrieben = true;
    }

    const ruhig = !tagFluege.length && !termine.length && tagHotels.every(x => x.art === 'nacht');
    tage.push({ tag, ort, fortgeschrieben, fluege: tagFluege, hotel, hotels: tagHotels, termine, ruhig });
  }

  // Ruhige Tage mit gleichem Ort und gleichem Hotel zusammenfassen
  const zeilen = [];
  for (const t of tage) {
    const vorige = zeilen[zeilen.length - 1];
    const gleich = vorige && vorige.ruhig && t.ruhig && vorige.ort === t.ort
      && vorige.fortgeschrieben === t.fortgeschrieben
      && (vorige.hotel?.label || '') === (t.hotel?.label || '');
    if (gleich) {
      vorige.bis = t.tag;
      vorige.heute = vorige.heute || t.tag === heute;
    } else {
      zeilen.push({ von: t.tag, bis: t.tag, ort: t.ort, fortgeschrieben: t.fortgeschrieben,
        fluege: t.fluege, hotel: t.hotel, hotels: t.hotels, termine: t.termine, ruhig: t.ruhig, heute: t.tag === heute });
    }
  }
  return { zeilen, eingeordnet };
}

/* Datum einer Zeile: 'Sa 07.11.' oder zusammengefasst '08.–09.11.'. */
function reiseZeilenDatum(zeile) {
  if (zeile.von === zeile.bis) return reiseTagKurz(zeile.von);
  const tm = t => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
  const anfang = zeile.von.slice(5, 7) === zeile.bis.slice(5, 7) ? zeile.von.slice(8, 10) + '.' : tm(zeile.von);
  return `${anfang}–${tm(zeile.bis)}`;
}

/* ── CP2-0 (13.11.2026): Reisen-Karte entlasten ────────────────────────────
   Owner-Befund: „fast überfrachtet, doppelt, Hinweise was noch fehlen würde
   noch und nöchter". Die Regeln hier entscheiden, was die Karte zeigt; nichts
   davon verändert die Reisedatei. */

/* Bezugsdatum einer Frist: das späteste Datum des Ereignisses, auf das sie
   sich bezieht. Gesucht wird
     1. eine Flugnummer aus fluege[] in Titel oder Notiz (Check-in „24 h vor
        LX4640" → Abflugtag des LX4640; bei Nachtflug der Ankunftstag),
     2. ein Buchungscode aus buchungen[] in Titel oder Notiz, wenn die Buchung
        ein Datum (von/bis) trägt,
     3. Tagesangaben „TT.MM." im Titel („Unterkunft … bis 15.11. klären",
        „Hotels Santa Clara (20.–22.11.)", „Nacht 19.→20.11.").
   Die Notiz zählt für Daten nicht mit: dort stehen Bearbeitungsvermerke
   („12.11.: Fairmont gebucht"), keine Bezugsereignisse. Ergebnis: ISO-Tag
   oder null (kein erkennbares Bezugsereignis). */
function reiseFristBezug(frist, reise) {
  const titel = String(frist?.titel || '');
  const text = titel + ' ' + String(frist?.notiz || '');
  const von = reise?.von || (reiseIstTag(frist?.faellig) ? frist.faellig : '');
  const daten = [];
  const wort = (w) => new RegExp('(^|[^A-Za-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9])');
  for (const f of Array.isArray(reise?.fluege) ? reise.fluege : []) {
    if (!f || !f.flugnummer || !reiseIstTag(f.datum)) continue;
    if (wort(String(f.flugnummer)).test(text)) daten.push(reiseIstTag(f.an_datum) ? f.an_datum : f.datum);
  }
  for (const b of Array.isArray(reise?.buchungen) ? reise.buchungen : []) {
    if (!b || !b.code || String(b.code).length < 5 || !reiseIstTag(b.von)) continue;
    if (wort(String(b.code)).test(text)) daten.push(reiseIstTag(b.bis) ? b.bis : b.von);
  }
  if (reiseIstTag(von)) {
    for (const m of titel.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/g)) {
      const tag = reiseDatumAus(m[1], m[2], m[3], von);
      if (tag) daten.push(tag);
    }
  }
  return daten.length ? daten.sort().pop() : null;
}

/* Einstufung einer Frist am Tag `heute`:
     erledigt     — Status erledigt
     kommend      — offen, fällig heute oder später
     vergangen    — offen, fällig vor heute, und das Bezugsereignis ist vorbei
                    (Bezug < heute); ein Termin ohne Bezug ist sein eigenes
                    Ereignis und mit seinem Datum vorbei
     ueberfaellig — offen, fällig vor heute, Bezug heute oder später — oder
                    kein erkennbarer Bezug (im Zweifel bleibt sie offen)
   Ohne gültiges Fälligkeitsdatum: kommend (sie wird nirgends versteckt). */
function reiseFristEinstufung(frist, reise, heute) {
  if ((frist?.status || 'offen') === 'erledigt') return 'erledigt';
  if (!reiseIstTag(frist?.faellig) || !reiseIstTag(heute) || frist.faellig >= heute) return 'kommend';
  const bezug = reiseFristBezug(frist, reise);
  if (bezug) return bezug < heute ? 'vergangen' : 'ueberfaellig';
  return frist.art === 'termin' ? 'vergangen' : 'ueberfaellig';
}

/* Alle Fristen nach Einstufung, je Gruppe nach Fälligkeit (gleiches Datum:
   Dateireihenfolge), mit Farbe und Resttext. Überfällige sind rot, vergangene
   nie. `offen` = überfällig + kommend (Zähler im Kopf). */
function reiseFristenGliedern(reise, heute) {
  const gruppen = { ueberfaellig: [], kommend: [], vergangen: [], erledigt: [] };
  (Array.isArray(reise?.fristen) ? reise.fristen : [])
    .map((f, index) => ({ f, index }))
    .sort((x, y) => String(x.f.faellig || '9999').localeCompare(String(y.f.faellig || '9999')) || x.index - y.index)
    .forEach(({ f }) => {
      const art = reiseFristEinstufung(f, reise, heute);
      const lage = reiseFristLage(f.faellig, heute);
      gruppen[art].push({ ...f, ...lage, einstufung: art,
        ton: art === 'vergangen' || art === 'erledigt' ? '' : lage.ton,
        rest: art === 'vergangen' ? 'vorbei' : art === 'erledigt' ? 'erledigt' : lage.rest });
    });
  return { ...gruppen, offen: gruppen.ueberfaellig.length + gruppen.kommend.length };
}

/* „heute" der Reise in Ortszeit, wie der Tagesbogen (CP1-12): aus
   utcOffsetMin des jüngsten Briefings, das ihn trägt. Ohne solches Briefing
   der übergebene Berliner Tag. Ein Briefing älter als 2 Tage zählt nicht
   (der Ort könnte nicht mehr stimmen). */
function reiseHeuteOrt(briefings, jetzt, berlinTag) {
  const liste = (Array.isArray(briefings) ? briefings : [])
    .filter(b => b && Number.isFinite(b.utcOffsetMin) && (b.gesendetAt || b.erzeugtAt))
    .sort((a, b) => String(b.gesendetAt || b.erzeugtAt).localeCompare(String(a.gesendetAt || a.erzeugtAt)));
  const b = liste[0];
  if (!b || !(jetzt instanceof Date)) return { tag: berlinTag, quelle: 'berlin' };
  const alter = jetzt.getTime() - Date.parse(b.gesendetAt || b.erzeugtAt);
  if (!(alter >= 0 && alter <= 2 * 86400000)) return { tag: berlinTag, quelle: 'berlin' };
  const tag = new Date(jetzt.getTime() + b.utcOffsetMin * 60000).toISOString().slice(0, 10);
  return { tag, quelle: 'ortszeit', zeitzone: b.zeitzone || '' };
}

/* Aktuelle Station: Ort der letzten Verlaufszeile, die heute oder früher
   beginnt und einen Ort hat. Ein Reisetag mit Ortswechsel („Victoria →
   Vancouver") ist keine eindeutige Station → ''. Außerhalb der Reise ''. */
function reiseAktuelleStation(zeilen, heute) {
  const liste = Array.isArray(zeilen) ? zeilen : [];
  if (!liste.length || !reiseIstTag(heute) || heute < liste[0].von || heute > liste[liste.length - 1].bis) return '';
  const davor = liste.filter(z => z.von <= heute && z.ort);
  const z = davor[davor.length - 1];
  if (!z || /→/.test(z.ort)) return '';
  return z.ort;
}

/* Vergangene Verlaufszeilen (bis < heute) als eine Zeile zusammenfassen:
   „Sa 07.–Mi 11. · 4 Stationen" — Stationen = Zahl der Verlaufszeilen. */
function reiseVerlaufFalten(zeilen, heute) {
  const liste = Array.isArray(zeilen) ? zeilen : [];
  const vergangen = reiseIstTag(heute) ? liste.filter(z => z.bis < heute) : [];
  const rest = liste.filter(z => !vergangen.includes(z));
  if (!vergangen.length) return { vergangen, rest, text: '' };
  const a = vergangen[0].von, b = vergangen[vergangen.length - 1].bis;
  const kurz = (t, mitMonat) => {
    const wt = REISE_WOCHENTAG[new Date(Date.parse(t + 'T00:00:00Z')).getUTCDay()];
    return `${wt} ${t.slice(8, 10)}.` + (mitMonat ? `${t.slice(5, 7)}.` : '');
  };
  const gleich = a.slice(0, 7) === b.slice(0, 7);
  const datum = a === b ? reiseTagKurz(a) : `${kurz(a, !gleich)}–${kurz(b, !gleich)}`;
  const n = vergangen.length;
  return { vergangen, rest, text: `${datum} · ${n} ${n === 1 ? 'Station' : 'Stationen'}` };
}

/* Statuschip einer Buchung: nur, wenn der Stand vom Normalfall abweicht.
   Bestätigt, bezahlt, gebucht, ausgestellt, reserviert sind Normalfall —
   ebenso ein Vielfliegerstatus im Feld status (v11: „Senator"). */
function reiseBuchungStatusChip(buchung) {
  const s = String(buchung?.status || '').trim();
  if (/^storniert/i.test(s)) return { text: s, klasse: 'chip-err' };
  if (/^(offen|vorschlag|warteliste|angefragt|unbestätigt)/i.test(s)) return { text: s, klasse: 'chip-warn' };
  return null;
}

/* Art einer Buchung für das Icon: das Feld `art`, sonst wie in der
   Tagesleiste eingeordnet (Hotel/Termin), sonst „sonstiges". */
function reiseBuchungArt(buchung, reiseVon, reiseBis) {
  if (['flug', 'hotel', 'termin', 'sonstiges'].includes(buchung?.art)) return buchung.art;
  const e = reiseBuchungEinordnen(buchung, reiseVon, reiseBis);
  return e ? e.art : 'sonstiges';
}

/* Datum einer Buchung für die zweite Zeile: von/bis, sonst aus den Texten
   (wie in der Tagesleiste), sonst ''. „13.–15.11." oder „Mo 23.11.". */
function reiseBuchungDatum(buchung, reiseVon, reiseBis) {
  let von = reiseIstTag(buchung?.von) ? buchung.von : '';
  let bis = von && reiseIstTag(buchung?.bis) && buchung.bis >= von ? buchung.bis : von;
  if (!von) {
    const e = reiseBuchungEinordnen(buchung, reiseVon, reiseBis);
    if (e) { von = e.von; bis = e.bis; }
  }
  if (!von) return '';
  return von === bis ? reiseTagKurz(von) : reiseZeilenDatum({ von, bis });
}
