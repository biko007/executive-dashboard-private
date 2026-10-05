/* ═══════════════════════════════════════════════════════════════════════════
   Zeit — Graph-Zeitstempel, Zeitzone, Ganztagstermine
   Paket P1-5 (Befund F der Owner-Spec vom 04.10.2026)

   KERN DES FEHLERS
   Microsoft Graph liefert Termine so:

     "start": { "dateTime": "2026-10-05T22:00:00.0000000", "timeZone": "UTC" }

   Der String hat KEIN Zonensuffix. `new Date(string)` interpretiert ihn
   deshalb in der Zone der Laufzeitumgebung:

     - im Browser (Europe/Berlin) -> 05.10. 22:00 Ortszeit  = FALSCH
     - im Core (Server auf Etc/UTC) -> 05.10. 22:00 UTC     = zufaellig richtig

   Daher zeigte das Dashboard "05.10. 22:00-21:30", waehrend das
   Telegram-Briefing fuer denselben Termin "Di 06.10. 00:00 (23.5h)" meldete.
   Richtig ist: 06.10.2026, 00:00-23:30 Europe/Berlin.

   Diese Datei interpretiert den Zeitstempel MIT der mitgelieferten Zone,
   unabhaengig von der Laufzeitumgebung. Dieselbe Logik liegt im
   executive-agent (index.ts, Abschnitt "Kalender-Zeitlogik") — die
   Funktionsnamen und Rueckgabewerte sind absichtlich identisch, damit
   Dashboard und Briefing denselben Termin gleich darstellen. Ein
   Gleichheitstest vergleicht beide Umsetzungen gegen dieselbe
   Graph-Antwort.

   GANZTAGSTERMINE
   Graph setzt bei `isAllDay: true` Mitternacht und ein EXKLUSIVES Ende:
   ein einzelner Tag am 20.10. hat start 20.10.T00:00 und end 21.10.T00:00.
   Die Datumsanteile sind dann woertlich zu nehmen und NICHT umzurechnen —
   eine Umrechnung wuerde den Tag verschieben.

   Abhaengigkeit: `esc` aus dem Inline-Skript in index.html (nur in
   kalenderMeetingLink verwendet, Aufruf erst nach dem Seitenaufbau).
   ═══════════════════════════════════════════════════════════════════════════ */

const ZEIT_ZONE = 'Europe/Berlin';

/* Verschiebung der Zonenzeit gegenueber UTC zum gegebenen Zeitpunkt.
   Beruecksichtigt Sommer-/Winterzeit, weil Intl die Zone zum Zeitpunkt
   auswertet (am 25.10.2026 wechselt Europe/Berlin von +02:00 auf +01:00). */
function zeitZonenOffsetMs(utcMs, zone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const teil of dtf.formatToParts(new Date(utcMs))) p[teil.type] = teil.value;
  const alsUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return alsUtc - utcMs;
}

/* Naiven Zeitstempel ("2026-10-05T22:00:00") in der angegebenen Zone
   interpretieren. Zwei Durchlaeufe, damit auch Zeitpunkte unmittelbar an der
   Zeitumstellung richtig aufgeloest werden. */
function zeitNaivInZone(naiv, zone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(naiv || ''));
  if (!m) return null;
  const alsWaereUtc = Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6] || 0),
  );
  let t = alsWaereUtc - zeitZonenOffsetMs(alsWaereUtc, zone);
  t = alsWaereUtc - zeitZonenOffsetMs(t, zone);
  return new Date(t);
}

/* Graph-Zeitangabe -> echtes Date. Ohne `timeZone` gilt UTC (Graph-Standard). */
function graphZeitpunkt(wert) {
  if (!wert || !wert.dateTime) return null;
  return zeitNaivInZone(wert.dateTime, wert.timeZone || 'UTC');
}

/* Datumsanteil eines naiven Strings, woertlich — fuer Ganztagstermine. */
function zeitDatumsteil(naiv) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(naiv || ''));
  return m ? m[1] : null;
}

/* Kalendertag eines Zeitpunkts in der Anzeigezone, als 'YYYY-MM-DD'. */
function zeitTagInZone(datum, zone) {
  if (!(datum instanceof Date) || Number.isNaN(datum.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone || ZEIT_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(datum);
}

function zeitTagVerschieben(tag, tage) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

function zeitTageDifferenz(vonTag, bisTag) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(vonTag || ''));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(bisTag || ''));
  if (!a || !b) return null;
  const ta = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const tb = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((tb - ta) / 86400000);
}

/* ── Anzeige ──────────────────────────────────────────────────────────────── */

function zeitUhr(datum) {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: ZEIT_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(datum);
}

function zeitTagMonat(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  return m ? `${m[3]}.${m[2]}.` : '–';
}

function zeitTagLang(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  if (!m) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

function zeitDauerText(minuten) {
  if (minuten == null) return '';
  if (minuten < 60) return minuten + ' Min.';
  const std = minuten / 60;
  const gerundet = Math.round(std * 10) / 10;
  const text = Number.isInteger(gerundet) ? String(gerundet) : String(gerundet).replace('.', ',');
  return text + ' Std.';
}

/* ── Kern: ein Graph-Termin -> alles, was die Anzeige braucht ─────────────── */
/*
   Rueckgabe:
     ganztags      true/false (aus isAllDay, nicht geraten)
     startTag      'YYYY-MM-DD' — erster Tag
     endTag        'YYYY-MM-DD' — letzter Tag (bei ganztags INKLUSIV gerechnet)
     mehrtaegig    true, wenn startTag != endTag
     tagesSchluessel  Tag fuer die Gruppierung (= startTag)
     zeitText      'ganztägig' | '00:00–23:30' | '05.10. 14:00 – 06.10. 10:00'
     spanneText    'Mo 05.10.' | '05.10.–07.10.'
     dauerMinuten  Zahl oder null
     dauerText     '23,5 Std.' | '2 Tage'
     unplausibel   true, wenn Ende vor Beginn liegt
*/
function kalenderZeitraum(ev) {
  const ganztags = (ev && ev.isAllDay) === true;

  if (ganztags) {
    const startTag = zeitDatumsteil(ev.start && ev.start.dateTime);
    const endeExklusiv = zeitDatumsteil(ev.end && ev.end.dateTime);
    // Graph zaehlt das Ende exklusiv: ein Tag am 20.10. endet am 21.10.T00:00.
    const endTag = endeExklusiv ? zeitTagVerschieben(endeExklusiv, -1) : startTag;
    const tage = startTag && endTag ? zeitTageDifferenz(startTag, endTag) + 1 : null;
    const unplausibel = tage != null && tage < 1;
    return {
      ganztags: true,
      startTag, endTag,
      mehrtaegig: !!(startTag && endTag && startTag !== endTag),
      tagesSchluessel: startTag,
      zeitText: 'ganztägig',
      spanneText: startTag && endTag && startTag !== endTag
        ? zeitTagMonat(startTag) + '–' + zeitTagMonat(endTag)
        : zeitTagMonat(startTag),
      dauerMinuten: tage != null ? tage * 1440 : null,
      dauerText: tage == null ? '' : (tage === 1 ? '1 Tag' : tage + ' Tage'),
      unplausibel,
    };
  }

  const s = graphZeitpunkt(ev && ev.start);
  const e = graphZeitpunkt(ev && ev.end);
  if (!s) {
    return {
      ganztags: false, startTag: null, endTag: null, mehrtaegig: false,
      tagesSchluessel: null, zeitText: 'Zeit unbekannt', spanneText: '–',
      dauerMinuten: null, dauerText: '', unplausibel: false,
    };
  }

  const startTag = zeitTagInZone(s, ZEIT_ZONE);
  const endTag = e ? zeitTagInZone(e, ZEIT_ZONE) : startTag;
  const minuten = e ? Math.round((e.getTime() - s.getTime()) / 60000) : null;
  const unplausibel = minuten != null && minuten < 0;
  const mehrtaegig = !!(endTag && startTag !== endTag);

  let zeitText;
  if (!e) {
    zeitText = zeitUhr(s);
  } else if (unplausibel) {
    // Wird nicht stillschweigend "repariert": der Widerspruch bleibt sichtbar.
    zeitText = zeitUhr(s) + ' – ' + zeitUhr(e) + ' (Ende vor Beginn)';
  } else if (mehrtaegig) {
    zeitText = zeitTagMonat(startTag) + ' ' + zeitUhr(s) + ' – ' + zeitTagMonat(endTag) + ' ' + zeitUhr(e);
  } else {
    zeitText = zeitUhr(s) + '–' + zeitUhr(e);
  }

  return {
    ganztags: false,
    startTag, endTag, mehrtaegig,
    tagesSchluessel: startTag,
    zeitText,
    spanneText: mehrtaegig ? zeitTagMonat(startTag) + '–' + zeitTagMonat(endTag) : zeitTagMonat(startTag),
    dauerMinuten: minuten,
    dauerText: unplausibel ? '' : zeitDauerText(minuten),
    unplausibel,
  };
}

/* ── Formularwerte ────────────────────────────────────────────────────────── */

/* Fuellt die Felder des Bearbeitungsformulars: Start- und Enddatum sowie
   Uhrzeiten, beides in Europe/Berlin. Bei Ganztagsterminen das INKLUSIVE
   Enddatum, weil der Nutzer "bis einschliesslich" denkt. */
function kalenderFormularwerte(ev) {
  const z = kalenderZeitraum(ev);
  if (z.ganztags) {
    return {
      ganztags: true,
      startDatum: z.startTag || '', startZeit: '09:00',
      endDatum: z.endTag || z.startTag || '', endZeit: '10:00',
    };
  }
  const s = graphZeitpunkt(ev && ev.start);
  const e = graphZeitpunkt(ev && ev.end);
  return {
    ganztags: false,
    startDatum: s ? zeitTagInZone(s, ZEIT_ZONE) : '',
    startZeit: s ? zeitUhr(s) : '',
    endDatum: e ? zeitTagInZone(e, ZEIT_ZONE) : (s ? zeitTagInZone(s, ZEIT_ZONE) : ''),
    endZeit: e ? zeitUhr(e) : '',
  };
}

/* Baut aus den Formularwerten das, was an Graph geschickt wird — immer in
   Europe/Berlin, also in derselben Zone, in der der Nutzer es eingegeben hat.
   Bei Ganztagsterminen wird das Ende auf den EXKLUSIVEN Folgetag gesetzt,
   wie Graph es erwartet. Gibt bei Unplausibilitaet einen Fehler zurueck
   statt stillschweigend etwas anderes zu speichern. */
function kalenderNutzlast(werte) {
  const startDatum = (werte.startDatum || '').trim();
  const endDatum = (werte.endDatum || '').trim() || startDatum;

  if (werte.ganztags) {
    if (!startDatum) return { fehler: 'Startdatum fehlt.' };
    const diff = zeitTageDifferenz(startDatum, endDatum);
    if (diff == null) return { fehler: 'Datumsangabe ungültig.' };
    if (diff < 0) return { fehler: 'Das Enddatum liegt vor dem Startdatum.' };
    return {
      isAllDay: true,
      start: startDatum + 'T00:00:00',
      // exklusiv: letzter Tag + 1
      end: zeitTagVerschieben(endDatum, 1) + 'T00:00:00',
    };
  }

  const startZeit = (werte.startZeit || '').trim();
  const endZeit = (werte.endZeit || '').trim();
  if (!startDatum || !startZeit || !endZeit) return { fehler: 'Datum, Start- und Endzeit sind Pflichtfelder.' };

  const s = zeitNaivInZone(startDatum + 'T' + startZeit + ':00', ZEIT_ZONE);
  const e = zeitNaivInZone(endDatum + 'T' + endZeit + ':00', ZEIT_ZONE);
  if (!s || !e) return { fehler: 'Datums- oder Zeitangabe ungültig.' };
  if (e.getTime() < s.getTime()) {
    return { fehler: 'Das Ende liegt vor dem Beginn. Bitte Enddatum oder Endzeit korrigieren.' };
  }
  if (e.getTime() === s.getTime()) {
    return { fehler: 'Beginn und Ende sind identisch. Bitte eine Dauer angeben.' };
  }
  return {
    isAllDay: false,
    start: startDatum + 'T' + startZeit + ':00',
    end: endDatum + 'T' + endZeit + ':00',
  };
}

/* ── Beschreibungsvorschau ────────────────────────────────────────────────── */

/* Outlook setzt in den Mail-Body von Besprechungseinladungen eine Trennlinie
   aus Unterstrichen. Graph liefert sie in `bodyPreview` mit, weshalb in der
   Terminkarte "________________________________" stand (CP1-Nachbesserung
   05.10.2026). Gefiltert wird NUR die Anzeige — die Daten bleiben unberuehrt.

   Entfernt werden Zeilen, deren Inhalt ausschliesslich aus Trennzeichen
   besteht (_ - = ~ *), und zwar bei mindestens zehn Zeichen. Zusaetzlich die
   LETZTE Zeile, wenn sie nur aus solchen Zeichen besteht: Graph kuerzt
   `bodyPreview`, dadurch bleibt vom zweiten Trennstrich oft ein einzelnes "_"
   uebrig (im Bestand genau so beobachtet). */
const ZEIT_TRENNZEICHEN = /^[\s_\-=~*]+$/;

/* Zeilen, die nur die Einwahldaten einer Online-Besprechung wiederholen.
   Der Beitrittslink steht als eigene Schaltflaeche in der Terminzeile; die
   Adresse und die Kennziffern noch einmal als Fliesstext zu zeigen, fuellt
   schmal die halbe Karte, ohne dass man damit etwas tun koennte (P2-4). */
const ZEIT_EINWAHLZEILE = /^(besprechungs-?id|meeting-?id|kenncode|passcode|kennwort|telefonkonferenz-?id|konferenz-?id|pin)\b/i;
const ZEIT_EINWAHLTEXT = /(teilnehmen sie (ueber|über) (ihren|das)|hier klicken, um an der besprechung teilzunehmen|join the meeting now|an besprechung teilnehmen|weitere informationen|besprechungsoptionen|meeting options|dial[- ]?in|ortsgebundene nummer suchen|local numbers)/i;

/* Enthaelt die Zeile im Wesentlichen nur eine Adresse? */
function zeitIstAdresszeile(text) {
  const ohneUrl = text.replace(/https?:\/\/\S+/gi, '').replace(/[<>|()\[\]{}·.,;:–—-]/g, ' ').trim();
  return /https?:\/\//i.test(text) && ohneUrl.length <= 24;
}

function kalenderBeschreibung(ev, maxLaenge) {
  const roh = (ev && ev.bodyPreview) || '';
  if (!roh) return '';
  const zeilen = roh.split(/\r?\n/);
  const behalten = [];
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    const inhalt = zeile.trim();
    if (!inhalt) continue;
    if (ZEIT_TRENNZEICHEN.test(inhalt)) {
      const nurTrenner = inhalt.replace(/\s/g, '');
      const letzteZeile = i === zeilen.length - 1;
      if (nurTrenner.length >= 10 || letzteZeile) continue;
    }
    /* Einwahldaten der Online-Besprechung weglassen (P2-4). */
    if (ZEIT_EINWAHLZEILE.test(inhalt)) continue;
    if (ZEIT_EINWAHLTEXT.test(inhalt)) continue;
    if (zeitIstAdresszeile(inhalt)) continue;
    behalten.push(inhalt);
  }
  /* Eine Adresse mitten im Fliesstext bleibt als Wort stehen, wuerde aber die
     Zeile sprengen — sie wird durch einen kurzen Platzhalter ersetzt. */
  const text = behalten.join(' · ')
    .replace(/https?:\/\/\S+/gi, '[Link]')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const grenze = typeof maxLaenge === 'number' ? maxLaenge : 160;
  return text.length > grenze ? text.slice(0, grenze) + '…' : text;
}

/* ── Meeting-Link ─────────────────────────────────────────────────────────── */

/* Nur echte https-Adressen werden als Aktion angeboten. javascript:, data:
   und http: werden abgewiesen (Spec §4 F: "sichere echte Meeting-Links"). */
function zeitIstSichereUrl(url) {
  if (!url) return false;
  try { return new URL(String(url)).protocol === 'https:'; } catch { return false; }
}

/* Der Beitrittslink steht je Termin an unterschiedlicher Stelle:
   bei Teams in onlineMeeting.joinUrl, bei fremden Diensten traegt der Owner
   ihn teils direkt ins Ortsfeld ein (im Bestand: eine Google-Meet-Adresse). */
function kalenderMeetingUrl(ev) {
  const join = ev && ev.onlineMeeting && ev.onlineMeeting.joinUrl;
  if (zeitIstSichereUrl(join)) return join;
  const ort = ev && ev.location && ev.location.displayName;
  if (zeitIstSichereUrl(ort)) return ort;
  return null;
}

/* Name des Dienstes aus der Adresse — damit die Schaltflaeche sagt, wohin
   sie fuehrt, statt nur "Teilnehmen" (P2-4). */
function kalenderMeetingDienst(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase();
    if (host.includes('teams.microsoft') || host.includes('teams.live')) return 'Teams';
    if (host.includes('meet.google')) return 'Google Meet';
    if (host.includes('zoom.')) return 'Zoom';
    if (host.includes('webex.')) return 'Webex';
    return 'Online';
  } catch { return 'Online'; }
}

function kalenderMeetingLink(ev) {
  const url = kalenderMeetingUrl(ev);
  if (!url) return '';
  const dienst = kalenderMeetingDienst(url);
  const text = dienst === 'Online' ? 'Online beitreten' : dienst + ' beitreten';
  return '<a class="btn btn-primary ev-teilnehmen" href="' + esc(url) + '"'
    + ' target="_blank" rel="noopener" aria-label="' + esc(text) + '"'
    + ' onclick="event.stopPropagation()">🔗 ' + esc(text) + '</a>';
}
