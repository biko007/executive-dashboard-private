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
  'Vancouver', 'Victoria', 'Winnipeg', 'Toronto', 'Zürich', 'Frankfurt', 'München', 'Stuttgart',
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

/* CP2-0b: Ein Ort, der kein Flughafencode ist („Victoria Harbour" beim
   Wasserflugzeug), bleibt als Stadt lesbar statt in Großbuchstaben. */
function reiseStadtVonIata(code) {
  const roh = String(code || '').trim();
  const c = roh.toUpperCase();
  if (REISE_IATA_STADT[c]) return REISE_IATA_STADT[c];
  if (/^[A-Z]{3}$/.test(c)) return c;
  return reiseStadtImText(roh) || roh;
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

/* ── CP2-0b (13.11.2026): Reisen-Seite „Heute zuerst" (Prototyp v3) ────────
   Owner-Befund nach CP2-0: „sieht immer noch grauselig aus, Links im
   Tagesprogramm nicht anklickbar". Die Regeln hier liefern Stationenband,
   36-Stunden-Fenster, Reiseplan je Tag, Aktions-Chips, gruppierte Buchungen
   mit Summen und die Trennung Links/Kontakte. Weiterhin nur lesend. */

/* Heimatorte zählen für den Titel nicht als Station (Abfahrt/Ankunft). */
const REISE_HEIMAT = ['Zürich', 'Tuttlingen'];

/* '07.–25.11.2026', über Monatsgrenzen '30.10.–02.11.2026'. */
function reiseZeitraumKurz(von, bis) {
  if (!reiseIstTag(von)) return '';
  if (!reiseIstTag(bis) || bis === von) return `${von.slice(8, 10)}.${von.slice(5, 7)}.${von.slice(0, 4)}`;
  if (von.slice(0, 7) === bis.slice(0, 7)) return `${von.slice(8, 10)}.–${bis.slice(8, 10)}.${bis.slice(5, 7)}.${bis.slice(0, 4)}`;
  return reiseZeitraumText(von, bis);
}

/* Datumsspanne ohne Jahr für Band und Reiseplan: 'Sa 07.' oder '07.–10.'. */
function reiseSpanneKurz(von, bis) {
  if (!reiseIstTag(von)) return '';
  if (!reiseIstTag(bis) || von === bis) {
    return `${REISE_WOCHENTAG[new Date(Date.parse(von + 'T00:00:00Z')).getUTCDay()]} ${von.slice(8, 10)}.`;
  }
  const tm = t => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
  return von.slice(0, 7) === bis.slice(0, 7) ? `${von.slice(8, 10)}.–${bis.slice(8, 10)}.` : `${tm(von)}–${tm(bis)}`;
}

/* Stationen aus dem Reiseverlauf: aufeinanderfolgende Tage am selben Ort
   sind ein Aufenthalt. Ein Reisetag „A → B" gehört zu beiden Stationen; bei
   einem Nachtflug beginnt die Zielstation erst am Ankunftstag (LX41 LAX 24.
   → ZRH 25.). Zustand je Station: 'vorbei' | 'jetzt' | 'kommend'. Die
   aktuelle Station ist die letzte, deren Spanne heute enthält — an einem
   Reisetag also das Ziel (dort ist die Nacht). */
function reiseStationen(zeilen, heute) {
  const besuche = [];
  const dazu = (ort, von, bis) => {
    const letzte = besuche[besuche.length - 1];
    if (letzte && letzte.ort === ort) { if (bis > letzte.bis) letzte.bis = bis; return; }
    besuche.push({ ort, von, bis });
  };
  for (const z of Array.isArray(zeilen) ? zeilen : []) {
    if (!z || !z.ort) continue;
    const teile = String(z.ort).split(/\s*→\s*/).map(x => x.trim()).filter(Boolean);
    if (teile.length < 2) { dazu(teile[0], z.von, z.bis); continue; }
    const fluege = (z.fluege || []).map(f => f.flug).filter(Boolean);
    const letzter = fluege[fluege.length - 1];
    const nachtflug = letzter && reiseIstTag(letzter.an_datum) && letzter.an_datum > letzter.datum;
    teile.forEach((ort, i) => { if (!(nachtflug && i === teile.length - 1)) dazu(ort, z.von, z.von); });
  }
  let jetzt = -1;
  if (reiseIstTag(heute)) besuche.forEach((b, i) => { if (b.von <= heute && heute <= b.bis) jetzt = i; });
  return besuche.map((b, i) => ({
    ...b,
    zustand: jetzt >= 0 ? (i < jetzt ? 'vorbei' : i === jetzt ? 'jetzt' : 'kommend')
      : (reiseIstTag(heute) && b.bis < heute ? 'vorbei' : 'kommend'),
    spanne: reiseSpanneKurz(b.von, b.bis),
  }));
}

/* Titel „erste → letzte Station" ohne Heimatort am Anfang und Ende. */
function reiseTitelAusStationen(stationen, ersatz) {
  const liste = (Array.isArray(stationen) ? stationen : []).map(s => s.ort);
  let a = 0, b = liste.length - 1;
  while (a <= b && REISE_HEIMAT.includes(liste[a])) a++;
  while (b >= a && REISE_HEIMAT.includes(liste[b])) b--;
  if (a > b) return String(ersatz || '');
  return a === b ? liste[a] : `${liste[a]} → ${liste[b]}`;
}

/* Anlässe aus den Klammern des bisherigen Titels, je mit ihrem Ort:
   „Winnipeg (TobaGrown) → … → San Francisco (QCon)" →
   [{ ort: 'Winnipeg', anlass: 'TobaGrown' }, { ort: 'San Francisco', anlass: 'QCon' }]. */
function reiseAnlaesse(name) {
  const liste = [];
  for (const teil of String(name || '').split(/\s*→\s*/)) {
    const m = teil.match(/^\s*([^()]*?)\s*\(([^)]+)\)/);
    if (m) liste.push({ ort: m[1].trim(), anlass: m[2].trim() });
  }
  return liste;
}

/* Uhrzeit aus einem Fristtitel: „bis 00:25", „, 10:30", „ca. 09:30". */
function reiseZeitImTitel(titel) {
  const m = String(titel || '').match(/(?:\b(bis|ab|um|ca\.)\s*)?(\d{1,2}):(\d{2})\b/);
  if (!m || Number(m[2]) > 23 || Number(m[3]) > 59) return null;
  return { zeit: `${m[2].padStart(2, '0')}:${m[3]}`, art: m[1] === 'bis' ? 'bis' : '' };
}

function reiseMinuten(zeit) {
  const m = String(zeit || '').match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/* Wortgrenzen-Suche ohne Groß-/Kleinschreibung. */
function reiseEnthaeltWort(text, wort) {
  if (!wort) return false;
  const w = String(wort).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^A-Za-z0-9])' + w + '($|[^A-Za-z0-9])', 'i').test(String(text || ''));
}

/* Text einer Buchung für Suchen (Anbieter, Tarif, Notiz). */
function reiseBuchungText(b) {
  return [b && b.anbieter, b && b.tarif, b && b.notiz].filter(Boolean).join(' ');
}

/* Index der Buchung zu einem Flug: Buchungscode in der Flugnotiz, sonst die
   Flugnummer im Text einer Flugbuchung. -1 = keine. */
function reiseBuchungZuFlug(flug, reise) {
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const notiz = String(flug?.notiz || '');
  let i = buchungen.findIndex(b => b && b.code && String(b.code).length >= 5 && reiseEnthaeltWort(notiz, b.code));
  if (i < 0 && flug?.flugnummer) {
    i = buchungen.findIndex(b => b && (b.art === 'flug' || !b.art) && reiseEnthaeltWort(reiseBuchungText(b), flug.flugnummer));
  }
  /* Zuletzt über die Gesellschaft der Flugnummer (LX → SWISS) — nur wenn es
     genau eine Flugbuchung dieser Gesellschaft gibt. Bei Air Canada sind es
     zwei; AC269 (Teil der SWISS-Buchung) bekäme sonst die falsche. */
  if (i < 0 && flug?.flugnummer) {
    const gesellschaft = REISE_FLUG_GESELLSCHAFT[String(flug.flugnummer).slice(0, 2)];
    const passend = gesellschaft ? buchungen.map((b, j) => ({ b, j }))
      .filter(({ b }) => b && b.art === 'flug' && String(b.anbieter || '').startsWith(gesellschaft)) : [];
    if (passend.length === 1) i = passend[0].j;
  }
  return i;
}

/* Index der Buchung, die ein Text nennt — über einen Buchungscode (ab fünf
   Zeichen) oder eine Flugnummer der Reise, deren Flug zu einer Buchung
   gehört. -1 = keine. */
function reiseBuchungImText(text, reise) {
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const s = String(text || '');
  const perCode = buchungen.findIndex(b => b && b.code && String(b.code).length >= 5 && reiseEnthaeltWort(s, b.code));
  if (perCode >= 0) return perCode;
  for (const f of Array.isArray(reise?.fluege) ? reise.fluege : []) {
    if (f && f.flugnummer && reiseEnthaeltWort(s, f.flugnummer)) {
      const i = reiseBuchungZuFlug(f, reise);
      if (i >= 0) return i;
    }
  }
  return -1;
}

/* Zimmer/Leistung einer Buchung: der Anbietertext nach dem Gedankenstrich,
   ohne Klammern und ohne Personenzahl („Signature Ofuro King"). */
function reiseBuchungLeistung(b) {
  const teile = String(b?.anbieter || '').split(/\s+[–—]\s+/);
  if (teile.length < 2) return '';
  return teile.slice(1).join(' · ').replace(/\s*\([^)]*\)/g, '').replace(/,\s*\d+\s+Erwachsene?r?$/, '').trim();
}

/* „von Jesse" aus „(von Jesse Lavoie gebucht)". */
function reiseBuchungVon(b) {
  const m = String(b?.anbieter || '').match(/\(von\s+([^\s)]+)[^)]*gebucht\)/i);
  return m ? m[1] : '';
}

/* ── Ereignisse je Tag ─────────────────────────────────────────────────────
   Aus der Tagesleiste (CP2-0): Abflüge und Ankünfte, Check-in/-out, Termine
   aus Buchungen und offene Termin-Fristen. Je Ereignis
     { tag, zeit, zeitArt ('', 'bis'), bisZeit, art ('flug'|'ankunft'|'checkin'|
       'checkout'|'termin'|'frist'), titel, unter, suchtext, flug?, buchung (Index|-1),
       eigeneBuchung (Index|-1), hotel? }
   Eine Termin-Frist, die einen Flug desselben Tages nennt, entfällt (Seair
   528 steht als Flug schon da). */
function reiseEreignisse(reise, von, bis) {
  const { zeilen } = reiseTagesleiste(reise, von, bis, '');
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const einordnung = buchungen.map(b => reiseBuchungEinordnen(b, von, bis));
  const liste = [];
  for (const z of zeilen) {
    if (z.von !== z.bis) continue;   // zusammengefasste Zeilen sind ruhige Tage ohne Ereignis
    const tag = z.von;
    for (const { flug: f } of z.fluege) {
      if (!f) continue;
      const ankunft = f.an_datum && f.an_datum !== f.datum && f.an_datum === tag;
      const bi = reiseBuchungZuFlug(f, reise);
      const code = bi >= 0 ? buchungen[bi].code : '';
      if (ankunft) {
        liste.push({ tag, zeit: f.an_ortszeit || '', art: 'ankunft', titel: `Ankunft ${reiseStadtVonIata(f.nach)}`,
          unter: `${f.flugnummer} aus ${reiseStadtVonIata(f.von)}`, suchtext: `${f.flugnummer} ${f.notiz || ''}`, flug: f, buchung: bi, eigeneBuchung: -1 });
        continue;
      }
      const an = f.an_ortszeit ? ` ${f.an_ortszeit}${f.an_datum && f.an_datum !== f.datum ? ' (+1)' : ''}` : '';
      const gleich = reiseStadtVonIata(f.von) === f.von && reiseStadtVonIata(f.nach) === f.nach;
      liste.push({ tag, zeit: f.ab_ortszeit || '', art: 'flug',
        titel: `${f.flugnummer} · ${f.von} → ${f.nach}${an}`,
        unter: [gleich ? '' : `${reiseStadtVonIata(f.von)} → ${reiseStadtVonIata(f.nach)}`, f.flugzeug, f.dauer && `Dauer ${f.dauer}`,
          code && `Buchung ${code}${reiseBuchungVon(buchungen[bi]) ? ` (${reiseBuchungVon(buchungen[bi])})` : ''}`].filter(Boolean).join(' · '),
        suchtext: `${f.flugnummer} ${f.betrieben_von || ''} ${f.notiz || ''}`, flug: f, buchung: bi, eigeneBuchung: -1 });
    }
    for (const h of z.hotels || []) {
      if (h.art === 'nacht') continue;
      const bi = einordnung.findIndex((e, i) => e && e.art === 'hotel' && e.label === h.label && (h.art === 'checkin' ? e.von : e.bis) === tag);
      const b = bi >= 0 ? buchungen[bi] : null;
      const e = bi >= 0 ? einordnung[bi] : null;
      liste.push({ tag, zeit: h.zeit || '', art: h.art, titel: `${h.art === 'checkin' ? 'Check-in' : 'Check-out'} ${h.label}`,
        unter: h.art === 'checkin' && b ? [reiseBuchungLeistung(b), e && reiseZeilenDatum({ von: e.von, bis: e.bis }), b.code].filter(Boolean).join(' · ') : '',
        suchtext: h.label, buchung: -1, eigeneBuchung: bi, hotel: { label: h.label, ort: h.ort } });
    }
    for (const tm of z.termine) {
      if (tm.quelle === 'buchung') {
        const bi = einordnung.findIndex((e, i) => e && e.art === 'termin' && e.label === tm.label && e.von <= tag && tag <= e.bis);
        liste.push({ tag, zeit: tm.zeit_von || '', bisZeit: tm.zeit_bis || '', art: 'termin', titel: tm.label,
          unter: '', suchtext: tm.label + ' ' + (bi >= 0 ? buchungen[bi].anbieter || '' : ''), buchung: -1, eigeneBuchung: bi });
        continue;
      }
      const z2 = reiseZeitImTitel(tm.label);
      const flugGleicherTag = z.fluege.some(x => x.flug && reiseEnthaeltWort(tm.label, x.flug.flugnummer));
      if (flugGleicherTag) continue;
      liste.push({ tag, zeit: z2 ? z2.zeit : '', zeitArt: z2 ? z2.art : '', art: 'frist', titel: tm.label,
        unter: reiseFristUnter(tm, reise), suchtext: `${tm.label}`, buchung: reiseBuchungImText(tm.label, reise), eigeneBuchung: -1 });
    }
  }
  return liste.map(e => ({ zeitArt: '', bisZeit: '', ...e }));
}

/* Untertitel einer Termin-Frist: nennt sie einen Flug, dessen Eckdaten
   („Flug Vancouver → San Francisco am So 15.11., 12:25"), sonst die Notiz. */
function reiseFristUnter(frist, reise) {
  const titel = String(frist.label || frist.titel || '');
  const f = (Array.isArray(reise?.fluege) ? reise.fluege : []).find(x => x && x.flugnummer && reiseEnthaeltWort(titel, x.flugnummer));
  if (f) return `Flug ${reiseStadtVonIata(f.von)} → ${reiseStadtVonIata(f.nach)} am ${reiseTagKurz(f.datum)}${f.ab_ortszeit ? ', ' + f.ab_ortszeit : ''}`;
  return String(frist.notiz || '');
}

/* „jetzt" am Reiseort: Tag und Minuten aus utcOffsetMin des jüngsten
   Briefings (wie reiseHeuteOrt); sonst die übergebenen Berliner Werte. */
function reiseJetztOrt(briefings, jetzt, berlinTag, berlinMinuten) {
  const ort = reiseHeuteOrt(briefings, jetzt, berlinTag);
  if (ort.quelle !== 'ortszeit') return { tag: berlinTag, minuten: berlinMinuten, quelle: 'berlin' };
  const liste = (Array.isArray(briefings) ? briefings : [])
    .filter(b => b && Number.isFinite(b.utcOffsetMin) && (b.gesendetAt || b.erzeugtAt))
    .sort((a, b) => String(b.gesendetAt || b.erzeugtAt).localeCompare(String(a.gesendetAt || a.erzeugtAt)));
  const d = new Date(jetzt.getTime() + liste[0].utcOffsetMin * 60000);
  return { tag: ort.tag, minuten: d.getUTCHours() * 60 + d.getUTCMinutes(), quelle: 'ortszeit', zeitzone: ort.zeitzone };
}

/* Die nächsten 36 Stunden: Ereignisse mit Uhrzeit und Aufgaben-Fristen mit
   Uhrzeit im Titel, deren Zeitpunkt in [jetzt, jetzt + 36 h] liegt — beides
   in Ortszeit gerechnet (die Zeiten der Reisedatei sind Ortszeiten). Höchstens
   `max`, chronologisch; je Eintrag zusätzlich `wann` ('heute'|'morgen'|Wochentag). */
function reiseNaechste36(ereignisse, reise, jetztTag, jetztMinuten, max = 4) {
  if (!reiseIstTag(jetztTag) || !Number.isFinite(jetztMinuten)) return [];
  const start = Date.parse(jetztTag + 'T00:00:00Z') / 60000 + jetztMinuten;
  const ende = start + 36 * 60;
  const kandidaten = [...(Array.isArray(ereignisse) ? ereignisse : [])];
  for (const f of Array.isArray(reise?.fristen) ? reise.fristen : []) {
    if ((f.status || 'offen') !== 'offen' || f.art !== 'aufgabe' || !reiseIstTag(f.faellig)) continue;
    const z = reiseZeitImTitel(f.titel);
    if (z) kandidaten.push({ tag: f.faellig, zeit: z.zeit, zeitArt: z.art, bisZeit: '', art: 'frist', titel: f.titel,
      unter: reiseFristUnter(f, reise), suchtext: f.titel, buchung: reiseBuchungImText(f.titel, reise), eigeneBuchung: -1 });
  }
  return kandidaten
    .map(e => ({ e, punkt: reiseMinuten(e.zeit) == null ? null : Date.parse(e.tag + 'T00:00:00Z') / 60000 + reiseMinuten(e.zeit) }))
    .filter(x => x.punkt != null && x.punkt >= start && x.punkt <= ende)
    .sort((a, b) => a.punkt - b.punkt)
    .slice(0, max)
    .map(({ e }) => {
      const d = reiseTageZwischen(jetztTag, e.tag);
      return { ...e, wann: d === 0 ? 'heute' : d === 1 ? 'morgen' : REISE_WOCHENTAG[new Date(Date.parse(e.tag + 'T00:00:00Z')).getUTCDay()] };
    });
}

/* Frist-Hinweis der Checkliste: 'überfällig', 'heute', 'bis Fr' (bis sechs
   Tage), sonst 'bis So 15.'. */
function reiseFristBisText(frist, heute) {
  if (frist.einstufung === 'ueberfaellig') return 'überfällig';
  const tage = reiseTageZwischen(heute, frist.faellig);
  if (tage == null) return '';
  if (tage <= 0) return 'heute';
  const wt = REISE_WOCHENTAG[new Date(Date.parse(frist.faellig + 'T00:00:00Z')).getUTCDay()];
  return tage <= 6 ? `bis ${wt}` : `bis ${wt} ${frist.faellig.slice(8, 10)}.`;
}

/* „Zu erledigen": offene Aufgaben — überfällige zuerst, dann kommende.
   Termin-Fristen stehen im 36-Stunden-Fenster und im Reiseplan. */
function reiseZuErledigen(g, heute, max = 5) {
  const istAufgabe = f => f.art !== 'termin';
  return [...g.ueberfaellig.filter(istAufgabe), ...g.kommend.filter(istAufgabe)].slice(0, max)
    .map(f => ({ ...f, bis: reiseFristBisText(f, heute) }));
}

/* Offene Unterkünfte aus Aufgaben-Fristen („Hotels Santa Clara (20.–22.11.)
   und Los Angeles (22.–24.11.) buchen", „Hotel SF: Nacht 19.→20.11.
   entscheiden"): je Spanne { tag (erste Nacht), text }. Nur offene,
   nicht vergangene Fristen. */
function reiseOffeneUnterkuenfte(g, reiseVon) {
  const liste = [];
  for (const f of [...g.ueberfaellig, ...g.kommend]) {
    const titel = String(f.titel || '');
    if (!/hotel|nacht|unterkunft/i.test(titel) || /check-?out|late/i.test(titel)) continue;
    const muster = /(\d{1,2})\.\s*(?:–|-|→)\s*(\d{1,2})\.(\d{1,2})\./g;
    for (const m of titel.matchAll(muster)) {
      const tag = reiseDatumAus(m[1], m[3], '', reiseVon);
      if (!tag) continue;
      const davor = titel.slice(0, m.index);
      const stadt = reiseStadtImText(davor.split(/\bund\b/).pop());
      const spanne = `${m[1].padStart(2, '0')}.${titel.slice(m.index).includes('→') && /Nacht/i.test(titel) ? '→' : '–'}${m[2].padStart(2, '0')}.`;
      liste.push({ tag, text: /Nacht/i.test(titel) && !stadt ? `Nacht ${spanne} noch offen` : `Hotel ${stadt || ''} ${spanne} noch offen`.replace(/\s+/g, ' ') });
    }
  }
  return liste;
}

/* ── Reiseplan: eine Zeile je Tag ab heute ─────────────────────────────────
   Je Tag { von, bis, ort, wechsel, ereignisse[], unterkunft, offen[], heute }.
   Ort mit Wechsel („Victoria → Vancouver") hat `wechsel`. Unterkunft
   (Hotel + Spanne) nur am Tag nach dem Check-in und an Tagen ohne anderes
   Ereignis. Aufeinanderfolgende Tage mit denselben Buchungsterminen (AGI
   Summit Tag 1/2) werden ein Block „21.–22.". Vergangene Tage (vor heute)
   stehen in `vergangen` mit Kurztext „Zürich → Winnipeg · TobaGrown · 5 Tage". */
function reisePlan(t, reise, heute) {
  const von = t.start_date, bis = t.end_date;
  const { zeilen } = reiseTagesleiste(reise, von, bis, heute);
  const ereignisse = reiseEreignisse(reise, von, bis);
  const g = reiseFristenGliedern(reise, heute);
  const offen = reiseOffeneUnterkuenfte(g, von);
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const hotels = buchungen.map(b => reiseBuchungEinordnen(b, von, bis)).filter(e => e && e.art === 'hotel');
  const tage = [];
  for (const z of zeilen) {
    for (let tag = z.von; tag <= z.bis; tag = reiseTagPlus(tag, 1)) {
      const evs = ereignisse.filter(e => e.tag === tag)
        .sort((a, b) => (reiseMinuten(a.zeit) ?? 9999) - (reiseMinuten(b.zeit) ?? 9999));
      const hotel = hotels.find(h => h.von < tag && tag < h.bis) || null;
      const ohneAnderes = !evs.length;
      const unterkunft = hotel && (ohneAnderes || tag === reiseTagPlus(hotel.von, 1))
        ? { text: hotel.label.replace(/\s+(San Francisco|Vancouver)$/, ''), spanne: reiseSpanneKurz(hotel.von, hotel.bis).replace(/^\D+/, '') } : null;
      tage.push({ von: tag, bis: tag, ort: z.ort, wechsel: /→/.test(z.ort || ''), ereignisse: evs, unterkunft,
        offen: offen.filter(o => o.tag === tag).map(o => o.text), heute: tag === heute });
    }
  }
  // Mehrtägige gleiche Buchungstermine zu einem Block zusammenfassen
  const schluessel = d => d.ereignisse.filter(e => e.art === 'termin').map(e => e.titel).join('|');
  const bloecke = [];
  for (const d of tage) {
    const v = bloecke[bloecke.length - 1];
    if (v && !v.heute && !d.heute && v.ort === d.ort && !d.wechsel && schluessel(d) && schluessel(d) === schluessel(v)
        && reiseTagPlus(v.bis, 1) === d.von) {
      v.bis = d.von;
      v.tage = (v.tage || 1) + 1;
      for (const e of d.ereignisse) if (e.art !== 'termin') v.ereignisse.push(e);
      v.offen = [...new Set([...v.offen, ...d.offen])];
      continue;
    }
    bloecke.push({ ...d, ereignisse: [...d.ereignisse] });
  }
  const aktiv = reiseIstTag(heute) && von <= heute && heute <= bis;
  const vergangen = aktiv ? bloecke.filter(b => b.bis < heute) : [];
  const rest = bloecke.filter(b => !vergangen.includes(b));
  let kurz = '';
  if (vergangen.length) {
    const stationen = reiseStationen(zeilen, heute).filter(s => s.bis < heute);
    const anlaesse = reiseAnlaesse(t.name).filter(a => stationen.some(s => s.ort === a.ort)).map(a => a.anlass);
    const n = reiseTageZwischen(vergangen[0].von, vergangen[vergangen.length - 1].bis) + 1;
    const weg = stationen.length > 1 ? `${stationen[0].ort} → ${stationen[stationen.length - 1].ort}` : (stationen[0] || {}).ort || '';
    kurz = [weg, anlaesse.join(', '), `${n} ${n === 1 ? 'Tag' : 'Tage'}`].filter(Boolean).join(' · ');
  }
  return { vergangen, rest, kurz, spanneVergangen: vergangen.length ? reiseSpanneKurz(vergangen[0].von, vergangen[vergangen.length - 1].bis) : '' };
}

/* ── Aktions-Chips ─────────────────────────────────────────────────────────
   Nur geprüfte Adressen: http(s) für Webseiten, tel: nur aus Ziffern und +.
   Alles andere (javascript:, data:, relative Pfade) → ''. */
function reiseSichereUrl(url) {
  const s = String(url || '').trim();
  if (/^tel:\+?[0-9]{3,20}$/.test(s)) return s;
  if (!/^https?:\/\//i.test(s)) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch { return ''; }
}

function reiseTelUrl(telefon) {
  const ziffern = String(telefon || '').split('/')[0].replace(/[^+0-9]/g, '');
  return ziffern.length >= 6 ? reiseSichereUrl('tel:' + ziffern) : '';
}

/* Schlüsselwörter, über die ein Ereignis zu einem Link oder Kontakt findet.
   Mehrwortnamen vor ihren Teilen. Flugnummern bringen ihre Gesellschaft mit. */
const REISE_SCHLUESSEL = ['AGI Summit', 'Lucas Museum', 'Air Canada', 'QCon', 'Seair', 'Fairmont', 'Hyatt', 'SWISS'];
const REISE_FLUG_GESELLSCHAFT = { AC: 'Air Canada', LX: 'SWISS' };
const REISE_HOTEL_LINK = /\b(hotel|hyatt|fairmont|unterkunft|resort|inn)\b/i;

/* Links und Kontakte der Reise trennen: Einträge mit URL und ohne Telefon/
   Person → Links; mit Telefon oder Person (Mailadresse) → Kontakte, ihre URL
   zusätzlich unter Links. Einträge ohne URL und ohne Telefon sind Kontakte. */
function reiseLinksUndKontakte(kontakte) {
  const links = [], personen = [];
  for (const k of Array.isArray(kontakte) ? kontakte : []) {
    if (!k || !k.name) continue;
    const url = reiseSichereUrl(k.url);
    const person = Boolean(k.telefon || k.email);
    if (url) links.push({ titel: k.name, url, notiz: k.notiz || '' });
    if (person || !url) personen.push(k);
  }
  return { links, kontakte: personen };
}

/* Chip-Text eines Links aus seinem Titel. */
function reiseLinkText(titel, istHotel) {
  const s = String(titel || '');
  if (/Tagesprogramm/i.test(s)) return 'Tagesprogramm';
  if (/Programm|Training/i.test(s)) return 'Programm';
  if (/Ticket/i.test(s)) return 'Tickets';
  if (istHotel || REISE_HOTEL_LINK.test(s)) return 'Hotel';
  return 'Website';
}

/* Adresse aus einem Kontakt: Teil nach dem Gedankenstrich im Namen, wenn er
   wie eine Adresse aussieht („Santa Clara Convention Center, 5001 Great
   America Pkwy"); bei Hotels auch eine Hausnummer-Angabe aus der Notiz
   („1038 Canada Place"). */
function reiseKontaktAdresse(k, istHotel) {
  const teile = String(k?.name || '').split(/\s+[–—]\s+/);
  const rest = teile.slice(1).join(', ');
  if (rest && (/\d/.test(rest) || /Plaza|Center|Street|Avenue|Park/i.test(rest))) return `${teile[0]}, ${rest}`;
  if (istHotel) {
    const m = String(k?.notiz || '').match(/\b\d{1,5}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}/);
    if (m) return `${teile[0]}, ${m[0]}`;
  }
  return '';
}

function reiseKarteUrl(adresse) {
  return adresse ? reiseSichereUrl('https://maps.apple.com/?q=' + encodeURIComponent(adresse)) : '';
}

/* Datumsformen eines Tages, nach denen in Linktiteln gesucht wird. */
function reiseDatumsformen(tag) {
  if (!reiseIstTag(tag)) return [];
  return [reiseTagKurz(tag), `${tag.slice(8, 10)}.${tag.slice(5, 7)}.`];
}

/* Aktions-Chips eines Ereignisses. Ergebnis in fester Reihenfolge, je
   { art, text, url?, buchung? }:
     buchung  — das Ereignis nennt eine Flugnummer/einen Buchungscode einer
                Buchung (interner Sprung, kein ↗)
     link     — Tagesprogramm/Programm/Tickets/Hotel/Website: Link aus
                /api/links, den Kontakten der Reise oder der eigenen Buchung,
                dessen Titel ein Schlüsselwort des Ereignisses enthält; trägt
                ein solcher Titel das Datum des Ereignisses, hat er Vorrang
     karte    — bekannte Adresse (Hotel, Veranstaltungsort aus Kontakten)
     anrufen  — Kontakt mit Telefonnummer (tel:)
   Ohne Schlüsselwort kein Link: ein Datum allein ordnet nichts zu (sonst
   bekäme „Essen mit Ron Gershoni" am 17.11. das QCon-Tagesprogramm). */
function reiseAktionenFuer(ereignis, reise, apiLinks) {
  const e = ereignis || {};
  /* Check-out und Ankunft: Hotel, Karte, Telefon bzw. Buchung stehen schon
     am Check-in bzw. am Abflug — ein zweites Mal wäre nur Wiederholung. */
  if (e.art === 'checkout' || e.art === 'ankunft') return [];
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const kontakte = Array.isArray(reise?.kontakte) ? reise.kontakte : [];
  const aktionen = [];

  const bi = Number.isInteger(e.buchung) && e.buchung >= 0 ? e.buchung
    : reiseBuchungImText(`${e.titel || ''} ${e.flug ? e.flug.flugnummer + ' ' + (e.flug.notiz || '') : ''}`, reise);
  if (bi >= 0 && buchungen[bi]) aktionen.push({ art: 'buchung', text: 'Buchung', buchung: bi });

  const eigene = Number.isInteger(e.eigeneBuchung) && e.eigeneBuchung >= 0 ? buchungen[e.eigeneBuchung] : null;
  const istHotel = e.art === 'checkin' || e.art === 'checkout' || eigene?.art === 'hotel';
  let text = `${e.titel || ''} ${e.suchtext || ''} ${eigene ? eigene.anbieter || '' : ''}`;
  const nummer = e.flug ? String(e.flug.flugnummer || '') : (String(e.titel || '').match(/\b([A-Z]{2})\d{2,4}\b/) || [])[0] || '';
  const gesellschaft = REISE_FLUG_GESELLSCHAFT[nummer.slice(0, 2)];
  if (gesellschaft) text += ' ' + gesellschaft;
  const schluessel = REISE_SCHLUESSEL.filter(w => reiseEnthaeltWort(text, w));

  if (schluessel.length) {
    const passt = titel => schluessel.some(w => reiseEnthaeltWort(titel, w));
    const formen = reiseDatumsformen(e.tag);
    const mitDatum = titel => formen.some(f => String(titel || '').includes(f));
    const hatDatum = titel => /\b\d{1,2}\.\d{1,2}\./.test(String(titel || ''));
    const kandidaten = [
      ...(Array.isArray(apiLinks) ? apiLinks : []).map(l => ({ titel: l.label || l.spName || l.localName || '', url: reiseSichereUrl(l.spWebUrl || l.url), quelle: 'links' })),
      ...reiseLinksUndKontakte(kontakte).links.map(l => ({ titel: l.titel, url: l.url, quelle: 'kontakt' })),
    ].filter(k => k.url && passt(k.titel));
    const eigenerLink = eigene && reiseSichereUrl(eigene.verwalten_url) ? { titel: eigene.anbieter, url: reiseSichereUrl(eigene.verwalten_url), quelle: 'buchung' } : null;
    const wahl = kandidaten.find(k => mitDatum(k.titel)) || eigenerLink || kandidaten.find(k => !hatDatum(k.titel));
    if (wahl) aktionen.push({ art: 'link', text: reiseLinkText(wahl.titel, istHotel && wahl.quelle === 'buchung'), url: wahl.url, titel: wahl.titel });

    const kontakt = kontakte.find(k => k && passt(k.name) && reiseKontaktAdresse(k, istHotel))
      || null;
    let adresse = kontakt ? reiseKontaktAdresse(kontakt, istHotel) : '';
    if (!adresse && istHotel && e.hotel) adresse = [e.hotel.label, e.hotel.ort && !e.hotel.label.includes(e.hotel.ort) ? e.hotel.ort : ''].filter(Boolean).join(', ');
    const karte = reiseKarteUrl(adresse);
    if (karte) aktionen.push({ art: 'karte', text: 'Karte', url: karte });

    const tel = kontakte.find(k => k && k.telefon && passt(k.name));
    const telUrl = tel ? reiseTelUrl(tel.telefon) : '';
    if (telUrl) aktionen.push({ art: 'anrufen', text: 'Anrufen', url: telUrl });
  }
  return aktionen;
}

/* ── Buchungen gruppiert ───────────────────────────────────────────────────
   Gruppen Flüge / Unterkünfte / Tickets / Sonstiges nach reiseBuchungArt.
   Ein Programmpunkt ohne Betrag, der denselben Code wie eine Buchung mit
   Betrag trägt (QCon Tag 1–3, AGI Tag 1/2), ist Teil dieser Buchung: er steht
   in deren Details, nicht als eigene Zeile. */
const REISE_GRUPPEN = [['flug', 'Flüge', 'plane'], ['hotel', 'Unterkünfte', 'bed'], ['termin', 'Tickets', 'ticket'], ['sonstiges', 'Sonstiges', 'file-text']];

function reiseBuchungsgruppen(reise, von, bis) {
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  const mitBetrag = new Set(buchungen.filter(b => b && b.code && b.preis != null).map(b => b.code));
  const zeilen = [];
  buchungen.forEach((b, index) => {
    if (!b) return;
    const teil = b.preis == null && b.code && mitBetrag.has(b.code) && b.art === 'termin';
    if (teil) {
      const eltern = zeilen.find(z => z.buchung.code === b.code && z.buchung.preis != null);
      if (eltern) { eltern.teile.push(index); return; }
    }
    let art = reiseBuchungArt(b, von, bis);
    /* Ein Ticket ohne eigenes Datum (QCon-, AGI-Ticket) hat art 'sonstiges';
       seine Programmpunkte machen es zum Ticket. */
    if (art === 'sonstiges' && buchungen.some(x => x !== b && x.code === b.code && x.art === 'termin')) art = 'termin';
    zeilen.push({ index, buchung: b, art, teile: [] });
  });
  // Teile, deren Hauptbuchung erst später in der Datei steht
  for (const z of [...zeilen]) {
    const b = z.buchung;
    if (b.preis == null && b.code && mitBetrag.has(b.code) && b.art === 'termin') {
      const eltern = zeilen.find(x => x !== z && x.buchung.code === b.code && x.buchung.preis != null);
      if (eltern) { eltern.teile.push(z.index); zeilen.splice(zeilen.indexOf(z), 1); }
    }
  }
  return REISE_GRUPPEN.map(([art, titel, icon]) => ({ art, titel, icon, zeilen: zeilen.filter(z => z.art === art) }))
    .filter(g => g.zeilen.length);
}

/* Datum einer Buchungszeile: wie reiseBuchungDatum; bei Flugbuchungen ohne
   Datum die Tage ihrer Flüge („07.11. / 24.11."); bei Tickets mit Teilen
   deren Spanne. */
function reiseBuchungZeilenDatum(zeile, reise, von, bis) {
  const b = zeile.buchung;
  const eigen = reiseBuchungDatum(b, von, bis);
  if (eigen) return eigen;
  const buchungen = Array.isArray(reise?.buchungen) ? reise.buchungen : [];
  if (zeile.teile.length) {
    const tage = zeile.teile.map(i => buchungen[i]).filter(x => reiseIstTag(x?.von)).map(x => x.von).sort();
    if (tage.length) return tage[0] === tage[tage.length - 1] ? reiseTagKurz(tage[0]) : reiseZeilenDatum({ von: tage[0], bis: tage[tage.length - 1] });
  }
  const tage = [...new Set((Array.isArray(reise?.fluege) ? reise.fluege : [])
    .filter(f => f && reiseIstTag(f.datum) && reiseBuchungZuFlug(f, reise) === zeile.index).map(f => f.datum))].sort();
  if (!tage.length) return '';
  const tm = t => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
  // Hin- und Rückflug einer Buchung: nur Beginn und Ende der Flugtage
  return tage.length === 1 ? reiseTagKurz(tage[0]) : `${tm(tage[0])} / ${tm(tage[tage.length - 1])}`;
}

/* Summe je Währung in Cent gerechnet (keine Gleitkomma-Reste), Reihenfolge
   des ersten Auftretens. Nur Buchungen mit Betrag und Währung. */
function reiseSummen(buchungen) {
  const summen = new Map();
  for (const b of Array.isArray(buchungen) ? buchungen : []) {
    if (!b || b.preis == null || !b.waehrung || !Number.isFinite(Number(b.preis))) continue;
    summen.set(b.waehrung, (summen.get(b.waehrung) || 0) + Math.round(Number(b.preis) * 100));
  }
  return [...summen].map(([waehrung, cent]) => ({ waehrung, betrag: cent / 100 }));
}
