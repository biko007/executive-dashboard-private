/* ═══════════════════════════════════════════════════════════════════════════
   Nebenkosten-Befunde — deutsche Erklaerungen und Zielansichten
   Paket P1-6 (Befund G der Owner-Spec vom 04.10.2026)

   Der Core prueft in src/modules/nk/precheck.ts 21 Regeln und liefert je
   Befund `code`, `severity` ('blocker' | 'warning' | 'info'), `message`
   (englisch) und optional `details`.

   Diese Datei uebersetzt NUR die Anzeige. Die fachliche Logik und die
   Schweregrad-Zuordnung bleiben im Core unangetastet (Owner-Entscheidung
   Nr. 7); ihre fachliche Richtigkeit prueft der Owner bei Checkpoint 1.

   Zwei Lesefehler, die dieses Paket behebt:
     - verglichen wurde gegen 'blocking', der Core liefert 'blocker' —
       jeder Blocker fiel in den Standardzweig und erschien als "Info";
     - gelesen wurde `f.detail`, das Feld heisst `message` — die
       Beschreibungszeile war immer leer.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Zielansichten. Der Core liefert kein `suggested_action`, deshalb wird das
   Ziel hier aus dem Code abgeleitet. Alle Ziele sind vorhandene Ansichten —
   es wird keine erfunden. */
const NK_ZIELE = {
  objekt:     { label: 'Objekt öffnen',             aktion: 'nk_objekt' },
  einheiten:  { label: 'Einheiten des Objekts',     aktion: 'nk_objekt' },
  zaehler:    { label: 'Zähler öffnen',             aktion: 'nk_zaehler' },
  verteilung: { label: 'Verteilungsschlüssel',      aktion: 'nk_verteilung' },
  ausgaben:   { label: 'Ausgaben öffnen',           aktion: 'nk_ausgaben' },
  vertrag:    { label: 'Mietvertrag öffnen',        aktion: 'nk_vertrag' },
};

/* Alle 21 Pruefregeln aus precheck.ts. Je Befund: Ursache, Auswirkung und
   naechster Schritt (Spec §4 G). */
const NK_BEFUNDE = {
  PROPERTY_NOT_FOUND: {
    titel: 'Objekt nicht gefunden',
    ursache: 'Zu dem gewählten Objekt gibt es keinen aktiven Datensatz.',
    auswirkung: 'Die Abrechnung kann nicht berechnet werden.',
    schritt: 'Objektauswahl prüfen; ein archiviertes Objekt lässt sich nicht abrechnen.',
    ziel: null,
  },
  BILLING_PERIOD_NOT_CALENDAR_YEAR: {
    titel: 'Abrechnungszeitraum ist kein Kalenderjahr',
    ursache: 'Beim Objekt ist ein abweichender Beginn des Abrechnungszeitraums hinterlegt.',
    auswirkung: 'Es werden nur Kalenderjahre (Januar bis Dezember) unterstützt — die Berechnung ist gesperrt.',
    schritt: 'Abrechnungszeitraum in den Objektdaten auf Januar stellen oder die Abrechnung außerhalb des Dashboards erstellen.',
    ziel: 'objekt',
  },
  COMMERCIAL_NOT_SUPPORTED: {
    titel: 'Gewerbe- oder Industrieobjekt',
    ursache: 'Das Objekt ist als Gewerbe oder Industrie erfasst.',
    auswirkung: 'Für diese Objektarten ist die Nebenkostenberechnung nicht umgesetzt — die Berechnung ist gesperrt.',
    schritt: 'Objektart prüfen. Ist sie richtig, erfolgt die Abrechnung außerhalb des Dashboards.',
    ziel: 'objekt',
  },
  PROPERTY_OUT_OF_OWNERSHIP: {
    titel: 'Eigentum endete vor dem Abrechnungsende',
    ursache: 'Für das Objekt ist ein Eigentumsende vor dem Ende des Abrechnungszeitraums hinterlegt.',
    auswirkung: 'Ein voller Jahreszeitraum kann nicht abgerechnet werden — die Berechnung ist gesperrt.',
    schritt: 'Eigentumsende in den Objektdaten prüfen oder ein früheres Abrechnungsjahr wählen.',
    ziel: 'objekt',
  },
  MULTIPLE_HEATING_SYSTEMS_NOT_SUPPORTED: {
    titel: 'Mehrere Heizungskonfigurationen für dasselbe Jahr',
    ursache: 'Zum Objekt liegen für das gewählte Jahr mehrere Heizungskonfigurationen vor.',
    auswirkung: 'Es ist nicht entscheidbar, welche gilt — die Berechnung ist gesperrt.',
    schritt: 'In den Objektdaten auf genau eine Heizungskonfiguration je Jahr reduzieren.',
    ziel: 'objekt',
  },
  HEATING_CONFIG_MISSING: {
    titel: 'Heizungskonfiguration fehlt',
    ursache: 'Das Objekt hat eine Heizung, aber für das gewählte Jahr ist keine Heizungskonfiguration hinterlegt.',
    auswirkung: 'Ohne sie lässt sich die Heizkostenverteilung nicht berechnen — die Berechnung ist gesperrt.',
    schritt: 'Heizungskonfiguration für das Jahr in den Objektdaten anlegen (Grund- und Verbrauchsanteil, Warmwassermethode).',
    ziel: 'objekt',
  },
  HEATING_CONFIG_INCONSISTENT: {
    titel: 'Heizkostenanteile ergeben nicht 100 Prozent',
    ursache: 'Grundanteil und Verbrauchsanteil der Heizkosten summieren sich nicht auf 100 Prozent.',
    auswirkung: 'Die Verteilung wäre rechnerisch falsch — die Berechnung ist gesperrt.',
    schritt: 'Anteile in der Heizungskonfiguration so setzen, dass die Summe 100 Prozent ergibt (üblich 30/70 oder 50/50).',
    ziel: 'objekt',
  },
  ALLOCATION_RULE_GAP: {
    titel: 'Verteilungsschlüssel fehlt für eine Kostenart',
    ursache: 'Für eine Kostenart mit Buchungen ist im gewählten Jahr kein Verteilungsschlüssel hinterlegt.',
    auswirkung: 'Die Kosten dieser Art könnten nicht zugeordnet werden — die Berechnung ist gesperrt.',
    schritt: 'Verteilungsschlüssel für die genannte Kostenart und das Jahr anlegen.',
    ziel: 'verteilung',
  },
  MISSING_MAIN_HEAT_METER: {
    titel: 'Hauptzähler für Wärme oder Gas fehlt',
    ursache: 'Zum Objekt ist kein Hauptzähler für Wärme oder Gas erfasst.',
    auswirkung: 'Die Gesamtmenge für die Heizkostenverteilung ist unbekannt — die Berechnung ist gesperrt.',
    schritt: 'Hauptzähler in der Zählerverwaltung anlegen und eine Jahresablesung erfassen.',
    ziel: 'zaehler',
  },
  MISSING_WW_METERS: {
    titel: 'Warmwasserzähler fehlen',
    ursache: 'Für die Einheiten sind keine Warmwasserzähler erfasst.',
    auswirkung: 'Die Warmwasserkosten werden nach der gesetzlichen Formel geschätzt (30/70-Regel) statt nach Verbrauch.',
    schritt: 'Warmwasserzähler je Einheit erfassen, wenn verbrauchsabhängig abgerechnet werden soll.',
    ziel: 'zaehler',
  },
  MISSING_HEAT_METERS: {
    titel: 'Wärmezähler der Einheiten fehlen',
    ursache: 'Für die einzelnen Einheiten sind keine Wärmezähler erfasst.',
    auswirkung: 'Eine verbrauchsabhängige Verteilung ist nicht möglich; verteilt wird nach Fläche.',
    schritt: 'Wärmezähler je Einheit erfassen, wenn verbrauchsabhängig abgerechnet werden soll.',
    ziel: 'zaehler',
  },
  MISSING_ANNUAL_READING: {
    titel: 'Jahresablesung fehlt',
    ursache: 'Für den genannten Zähler liegt keine Ablesung zum Jahresende vor.',
    auswirkung: 'Der Jahresverbrauch dieses Zählers lässt sich nicht bestimmen; die Abrechnung wird ungenau.',
    schritt: 'Ablesung zum Jahresende für den genannten Zähler nachtragen.',
    ziel: 'zaehler',
  },
  MISSING_PERIOD_START_READING: {
    titel: 'Ablesung zum Periodenbeginn fehlt',
    ursache: 'Für den genannten Zähler fehlt der Startwert des Abrechnungszeitraums.',
    auswirkung: 'Ohne Startwert ist die Verbrauchsdifferenz nicht berechenbar; die Abrechnung wird ungenau.',
    schritt: 'Ablesung zum Jahresbeginn für den genannten Zähler nachtragen.',
    ziel: 'zaehler',
  },
  CONSUMPTION_DENOMINATOR_ZERO: {
    titel: 'Verbrauchsschlüssel ohne passende Zähler',
    ursache: 'Für die genannte Kostenart ist eine verbrauchsabhängige Verteilung hinterlegt, es gibt aber keine passenden Zähler.',
    auswirkung: 'Die Verteilung hätte den Teiler null — die Berechnung ist gesperrt.',
    schritt: 'Entweder passende Zähler erfassen oder den Verteilungsschlüssel dieser Kostenart ändern.',
    ziel: 'verteilung',
  },
  INTERIM_BILLING_PERIOD: {
    titel: 'Zwischenabrechnung, keine Schlussabrechnung',
    ursache: 'Gerechnet wurde bis zu einem Stichtag mitten im Jahr, nicht über das volle '
      + 'Kalenderjahr.',
    auswirkung: 'Kosten, die erst später im Jahr anfallen oder abgerechnet werden — '
      + 'Jahresrechnungen des Versorgers, die Brennstoffbestellung im Herbst, die '
      + 'Heizkostenabrechnung — fehlen vollständig. Das Ergebnis ist eine Auskunft über den '
      + 'Stand, keine Grundlage für eine Forderung.',
    schritt: 'Für eine verbindliche Abrechnung das volle Kalenderjahr wählen, sobald alle '
      + 'Jahresrechnungen vorliegen.',
    ziel: null,
  },
  INTERIM_COST_PRORATED: {
    titel: 'Rechnungen nur anteilig enthalten',
    ursache: 'Einzelne Rechnungen decken einen Zeitraum ab, der über den Stichtag '
      + 'hinausreicht. Enthalten ist der taggenaue Anteil bis zum Stichtag.',
    auswirkung: 'Taggenau ist nicht verbrauchsgerecht: Heizkosten fallen im Januar anders '
      + 'an als im Juli. Bei Heizung und Warmwasser ist der Anteil deshalb im Winter zu '
      + 'niedrig und im Sommer zu hoch angesetzt.',
    schritt: 'Den Hinweis in der Auskunft an den Mieter übernehmen; für die Schlussabrechnung '
      + 'spielt er keine Rolle.',
    ziel: 'ausgaben',
  },
  INTERIM_READING_MISSING: {
    titel: 'Zähler ohne jede Ablesung bis zum Stichtag',
    ursache: 'Für die genannten Zähler liegt bis zum Stichtag überhaupt kein Stand vor.',
    auswirkung: 'Gerechnet wird mit Verbrauch 0. Das ist keine Messung, sondern eine Lücke — '
      + 'die verbrauchsabhängigen Kosten verteilen sich dadurch auf die übrigen Wohnungen '
      + 'oder bleiben beim Eigentümer hängen.',
    schritt: 'Die Zähler ablesen und die Stände nachtragen, bevor die Auskunft verwendet wird.',
    ziel: 'zaehler',
  },
  INTERIM_READING_STALE: {
    titel: 'Zählerstände zum Stichtag nicht aktuell',
    ursache: 'Für die genannten Zähler liegt zum Stichtag keine Ablesung vor; die letzte ist '
      + 'mehr als einen Monat alt.',
    auswirkung: 'Gerechnet wird mit dem letzten vorhandenen Stand. Der Verbrauch der Zeit '
      + 'danach fehlt — die verbrauchsabhängigen Posten sind dadurch zu niedrig.',
    schritt: 'Zum Stichtag ablesen lassen, wenn die Auskunft belastbar sein soll.',
    ziel: 'zaehler',
  },
  HEATING_WW_MEASURED: {
    titel: 'Warmwasserwärme gemessen statt geschätzt',
    ursache: 'Für die Warmwasserbereitung liegt ein eigener Wärmemengenzähler vor. '
      + 'Gerechnet wird mit seinem Messwert, nicht mit der Schätzformel des '
      + '§ 9 Abs. 2 HeizkostenV (2,5 × Wassermenge × Temperaturdifferenz).',
    auswirkung: 'Das ist der gesetzlich vorgesehene Weg: Die Formel gilt ausdrücklich nur, '
      + 'wenn die Wärmemenge NICHT gemessen wird. Weicht der Messwert deutlich von der '
      + 'Formel ab, verschiebt sich der Anteil zwischen Heizung und Warmwasser spürbar.',
    schritt: 'Keine Aktion nötig. Bei großer Abweichung zwischen Messwert und Formel lohnt '
      + 'ein Blick auf die Plausibilität des Zählers.',
    ziel: 'zaehler',
  },
  HEATING_SPLIT_OUTSIDE_HEIZKOSTENV: {
    titel: 'Heizkostenverteilung außerhalb des Rahmens der Heizkostenverordnung',
    ursache: '§ 7 Abs. 1 HeizkostenV sieht 50 bis 70 Prozent Verbrauchsanteil vor. Diese '
      + 'Abrechnung verteilt anders — bei MG24 zu 100 Prozent nach Verbrauch, also ohne '
      + 'Grundkostenanteil.',
    auswirkung: 'Der Mieter kann die Heizkosten nach § 12 HeizkostenV um 15 Prozent kürzen, '
      + 'sofern im Mietvertrag keine wirksame abweichende Vereinbarung steht. Rechnerisch '
      + 'ist die Verteilung korrekt; es geht allein um die Verordnungskonformität.',
    schritt: 'Entweder einen Grundkostenanteil zwischen 30 und 50 Prozent setzen oder die '
      + 'Abweichung rechtlich prüfen lassen. Ob und wie sich der Verteilschlüssel wirksam '
      + 'abweichend vereinbaren lässt, ist eine Rechtsfrage und hier nicht beurteilt.',
    ziel: 'verteilung',
  },
  CONSUMPTION_UNMEASURED_REMAINDER: {
    titel: 'Teil des Verbrauchs ist keiner Wohnung zugeordnet',
    ursache: 'Der Hauptzähler am Hausanschluss weist mehr aus als die Wohnungszähler zusammen. '
      + 'Die Differenz kann vieles sein: Allgemeinverbrauch, Bauwasser, ein Leck oder ein '
      + 'falsch skalierter Zähler.',
    auswirkung: 'Diese Differenz wird NICHT auf die Mieter verteilt, sondern bleibt beim '
      + 'Eigentümer. Würde man sie mitverteilen, zahlten die Mieter Wasser, das niemand '
      + 'ihnen zurechnen kann.',
    schritt: 'Die Differenz klären: Zählerstände gegen die Versorgerrechnung halten, bei '
      + 'großer Abweichung den physischen Zähler ablesen und die Messtechnik prüfen lassen.',
    ziel: 'zaehler',
  },
  CONSUMPTION_MAIN_METER_BELOW_UNITS: {
    titel: 'Hauptzähler zeigt weniger als die Wohnungszähler',
    ursache: 'Der Hauptzähler weist eine kleinere Menge aus als die Wohnungszähler zusammen. '
      + 'Das ist physikalisch nicht möglich und deutet auf einen fehlenden '
      + 'Skalierungsfaktor, einen Zählertausch oder einen anderen Messpunkt hin.',
    auswirkung: 'Der Hauptzähler wird für die Verteilung nicht verwendet; verteilt wird über '
      + 'die Summe der Wohnungszähler. Ein ungemessener Anteil bleibt dadurch unerkannt.',
    schritt: 'Messtechnik prüfen lassen und den Zähler gegen die Versorgerrechnung abgleichen.',
    ziel: 'zaehler',
  },
  CONSUMPTION_NO_MAIN_METER: {
    titel: 'Kein Hauptzähler für dieses Medium',
    ursache: 'Für die Kostenart gibt es Wohnungszähler, aber keinen Zähler am Hausanschluss, '
      + 'gegen den sich die Versorgerrechnung abgleichen lässt.',
    auswirkung: 'Der Rechnungsbetrag wird vollständig nach den Wohnungszählern verteilt. Eine '
      + 'Differenz zwischen Rechnung und Wohnungszählern bliebe dabei unbemerkt bei den '
      + 'Mietern.',
    schritt: 'Den Abrechnungszähler des Versorgers als Hauptzähler erfassen und seine Stände '
      + 'zu Jahresbeginn und Jahresende eintragen.',
    ziel: 'zaehler',
  },
  CONSUMPTION_READING_MISSING: {
    titel: 'Zählerstand für die Verbrauchsverteilung fehlt',
    ursache: 'Die Kostenart wird nach gemessenem Verbrauch verteilt. Für den genannten Zähler fehlt '
      + 'entweder der Stand zum Periodenende oder ein Anfangswert.',
    auswirkung: 'Die Berechnung ist gesperrt. Ersatzweise nach Wohnfläche zu verteilen wäre falsch — '
      + 'genau dafür sind die Zähler da.',
    schritt: 'Den fehlenden Stand nachtragen. Stand der Zähler zu Beginn nachweislich auf null, genügt '
      + 'ein hinterlegter Anfangswert am Zähler.',
    ziel: 'zaehler',
  },
  CONSUMPTION_START_ASSUMED_ZERO: {
    titel: 'Anfangsstand aus dem hinterlegten Anfangswert',
    ursache: 'Für den genannten Zähler gibt es im Abrechnungszeitraum keine Ablesung vor Periodenbeginn. '
      + 'Gerechnet wird mit dem am Zähler hinterlegten Anfangswert.',
    auswirkung: 'Die Abrechnung ist rechenbar. Sie steht und fällt aber mit der Richtigkeit dieses '
      + 'Anfangswerts — bei einem Einbau im laufenden Jahr ist er in der Regel null.',
    schritt: 'Den Anfangswert am Zähler gegen die Unterlagen prüfen; künftige Jahre brauchen ihn nicht, '
      + 'sobald eine Ablesung zum Jahreswechsel vorliegt.',
    ziel: 'zaehler',
  },
  MISSING_INTERIM_READING_FOR_CHANGEOVER: {
    titel: 'Zwischenablesung beim Mieterwechsel fehlt',
    ursache: 'Im Abrechnungszeitraum liegt ein Mieterwechsel, für den genannten Zähler fehlt die Ablesung zum Auszug.',
    auswirkung: 'Der Verbrauch lässt sich nicht auf Vor- und Nachmieter aufteilen; die Abrechnung wird ungenau.',
    schritt: 'Zwischenablesung zum Auszugsdatum nachtragen.',
    ziel: 'vertrag',
  },
  MISSING_SERVICE_PERIOD_HEATING: {
    titel: 'Keine Heizkostenbuchungen erfasst',
    ursache: 'Das Objekt hat eine Heizung, für das gewählte Jahr sind aber keine Heizkosten gebucht.',
    auswirkung: 'Es würde eine Abrechnung ohne Heizkosten erstellt.',
    schritt: 'Heizkostenbuchungen für das Jahr erfassen.',
    ziel: 'ausgaben',
  },
  ESTIMATED_AREA_OVER_25_PERCENT: {
    titel: 'Wohnfläche bei mehr als einem Viertel der Einheiten unbekannt',
    ursache: 'Bei den genannten Einheiten ist keine Wohnfläche erfasst; der Anteil liegt über 25 Prozent.',
    auswirkung: 'Die flächenabhängige Verteilung beruht überwiegend auf Schätzungen und ist angreifbar.',
    schritt: 'Wohnfläche der betroffenen Einheiten nachtragen.',
    ziel: 'einheiten',
  },
  MISSING_UNIT_RESIDENTS: {
    titel: 'Personenzahl der Einheit fehlt',
    ursache: 'Die genannte Einheit hat im Abrechnungsjahr einen Mietvertrag, aber keinen Eintrag zur Personenzahl.',
    auswirkung: 'Personenabhängige Kostenarten können für diese Einheit nicht verteilt werden.',
    schritt: 'Personenzahl mit Ein- und Auszugsdatum in der Einheit erfassen.',
    ziel: 'einheiten',
  },
  CO2_HANDLING_REQUIRED: {
    titel: 'CO₂-Kostenaufteilung ohne Datengrundlage',
    ursache: 'Das Objekt ist als CO₂-kostenrelevant erfasst, in der Heizungskonfiguration fehlen aber CO₂-Menge und CO₂-Kosten.',
    auswirkung: 'Die gesetzliche Aufteilung der CO₂-Kosten zwischen Vermieter und Mieter kann nicht berechnet werden.',
    schritt: 'CO₂-Menge und CO₂-Kosten in der Heizungskonfiguration des Jahres nachtragen.',
    ziel: 'objekt',
  },
  METER_CALIBRATION_EXPIRED: {
    titel: 'Eichfrist des Zählers abgelaufen',
    ursache: 'Die Eichgültigkeit des genannten Zählers ist im oder vor dem Abrechnungszeitraum abgelaufen.',
    auswirkung: 'Ablesungen eines nicht geeichten Zählers sind rechtlich angreifbar.',
    schritt: 'Zähler tauschen oder nacheichen lassen und das neue Eichdatum erfassen.',
    ziel: 'zaehler',
  },
  BILLING_MODE_EXCLUDED: {
    titel: 'Einheit mit Inklusivmiete',
    ursache: 'Für die genannte Einheit ist die Abrechnungsart „inklusive" hinterlegt.',
    auswirkung: 'Die Einheit nimmt bewusst nicht an der Nebenkostenabrechnung teil. Das ist ein Hinweis, kein Fehler.',
    schritt: 'Nur prüfen, falls die Einheit abgerechnet werden soll — dann die Abrechnungsart im Mietvertrag ändern.',
    ziel: 'vertrag',
  },
};

/* ── Schweregrad ──────────────────────────────────────────────────────────── */

/* Normalisiert den Schweregrad aus dem Core. Unbekannte Werte werden NICHT
   stillschweigend zu "Info" — sie erscheinen als "unbekannt". */
function nkSchweregrad(f) {
  const s = (f && f.severity) || '';
  if (s === 'blocker') return 'blocker';
  if (s === 'warning') return 'warning';
  if (s === 'info') return 'info';
  return 'unbekannt';
}

const NK_SCHWEREGRAD_ANZEIGE = {
  blocker:   { label: 'Blockierend', klasse: 'badge-red', symbol: '⛔' },
  warning:   { label: 'Warnung',  klasse: 'badge-yellow', symbol: '⚠️' },
  info:      { label: 'Hinweis',  klasse: 'badge-blue',   symbol: 'ℹ️' },
  unbekannt: { label: 'unbekannter Schweregrad', klasse: 'badge-muted', symbol: '❔' },
};

function nkSchweregradBadge(f) {
  const a = NK_SCHWEREGRAD_ANZEIGE[nkSchweregrad(f)];
  return '<span class="badge badge-zustand ' + a.klasse + '">'
    + '<span aria-hidden="true">' + a.symbol + '</span> ' + esc(a.label) + '</span>';
}

/* ── Texte ────────────────────────────────────────────────────────────────── */

/* Unbekannte Codes werden nicht verschwiegen: Code und Originalmeldung des
   Core erscheinen weiterhin, nur ohne deutsche Erklaerung. */
function nkBefund(f) {
  const code = (f && f.code) || '';
  const bekannt = NK_BEFUNDE[code];
  if (bekannt) return { ...bekannt, code, bekannt: true };
  return {
    code,
    titel: code || 'Unbenannter Befund',
    ursache: 'Für diesen Prüfcode ist im Dashboard keine Erklärung hinterlegt.',
    auswirkung: '',
    schritt: 'Originalmeldung der Prüfung beachten.',
    ziel: null,
    bekannt: false,
  };
}

/* Details des Core als lesbare Zeile — ohne sie bleibt z. B. unklar, WELCHE
   Einheit oder WELCHER Zaehler gemeint ist. */
const NK_DETAIL_LABELS = {
  unit_id: 'Einheit (ID)',
  unit_code: 'Einheit',
  lease_id: 'Mietvertrag (ID)',
  meter_id: 'Zähler (ID)',
  meter_number: 'Zählernummer',
  rule_id: 'Verteilungsschlüssel (ID)',
  category: 'Kostenart',
  expires: 'Eichfrist bis',
  base_share_percent: 'Grundanteil',
  consumption_share_percent: 'Verbrauchsanteil',
};

function nkDetailZeile(f) {
  const d = (f && f.details) || null;
  if (!d || typeof d !== 'object') return '';
  const teile = Object.keys(d)
    .filter(k => d[k] !== null && d[k] !== undefined && d[k] !== '')
    .map(k => (NK_DETAIL_LABELS[k] || k) + ': ' + d[k]);
  return teile.length ? teile.join(' · ') : '';
}

/* Vollstaendiger Befundblock: Schweregrad, Titel, Ursache, Auswirkung,
   naechster Schritt, Details, Originalmeldung und — wo moeglich — die
   Schaltflaeche in die Zielansicht. */
function nkBefundBlock(f, propertyCode, jahr) {
  const b = nkBefund(f);
  const detail = nkDetailZeile(f);
  const grad = nkSchweregrad(f);

  let html = '<div class="nk-befund nk-befund-' + grad + '">'
    + '<div class="nk-befund-kopf">'
    + nkSchweregradBadge(f)
    + '<span class="nk-befund-titel">' + esc(b.titel) + '</span>'
    + '<code class="nk-befund-code">' + esc(b.code) + '</code>'
    + '</div>';

  if (b.ursache)    html += '<div class="nk-befund-zeile"><span class="nk-befund-marke">Ursache</span>' + esc(b.ursache) + '</div>';
  if (b.auswirkung) html += '<div class="nk-befund-zeile"><span class="nk-befund-marke">Auswirkung</span>' + esc(b.auswirkung) + '</div>';
  if (b.schritt)    html += '<div class="nk-befund-zeile"><span class="nk-befund-marke">Nächster Schritt</span>' + esc(b.schritt) + '</div>';
  if (detail)       html += '<div class="nk-befund-zeile"><span class="nk-befund-marke">Betroffen</span>' + esc(detail) + '</div>';
  if (f && f.message) html += '<div class="nk-befund-quelle">Prüfmeldung: ' + esc(f.message) + '</div>';

  const aktion = nkBefundAktion(b, propertyCode, f);
  if (aktion) html += '<div class="nk-befund-aktion">' + aktion + '</div>';

  return html + '</div>';
}

/* Zielansicht. Der Core liefert kein suggested_action — das Ziel kommt aus
   der Zuordnung oben. Fehlt der Objektcode, wird keine Schaltflaeche
   erzeugt (lieber keine als eine, die ins Leere fuehrt). */
function nkBefundAktion(b, propertyCode, f) {
  if (!b.ziel || !propertyCode) return '';
  const ziel = NK_ZIELE[b.ziel];
  if (!ziel) return '';
  const leaseId = f && f.details && f.details.lease_id ? Number(f.details.lease_id) : null;
  const arg = b.ziel === 'vertrag' && leaseId ? leaseId : 0;
  return '<button class="btn btn-primary" style="font-size:13px"'
    + ' onclick="nkBeheben(\'' + esc(b.ziel) + '\', \'' + esc(propertyCode) + '\', ' + arg + ')">'
    + esc(ziel.label) + '</button>';
}

/* ── Ampel und Matrix ─────────────────────────────────────────────────────── */

/* Benannter Zustand statt nackter Zahl. Die Readiness-Matrix zeigte
   ausschliesslich "2" oder "3"; die Erklaerung steckte nur im title-Attribut
   und war damit nur per Hover erreichbar (Spec §6: nichts nur ueber Hover). */
function nkAmpel(daten) {
  const blocker = Number(daten?.blocking_count || 0);
  const warnungen = Number(daten?.warning_count || 0);
  const infos = Number(daten?.info_count || 0);

  const zahl = (n, ein, mehr) => n + ' ' + (n === 1 ? ein : mehr);
  const alle = zahl(blocker, 'blockierender Befund', 'blockierende Befunde') + ', '
    + zahl(warnungen, 'Warnung', 'Warnungen') + ', '
    + zahl(infos, 'Hinweis', 'Hinweise');

  if (blocker > 0) {
    return { stufe: 'blocker', klasse: 'nk-badge-red',
      kurz: zahl(blocker, 'blockierender Befund', 'blockierende Befunde'), lang: alle };
  }
  if (warnungen > 0) {
    return { stufe: 'warnung', klasse: 'nk-badge-yellow',
      kurz: zahl(warnungen, 'Warnung', 'Warnungen'),
      lang: alle + ' — keine blockierenden Befunde' };
  }
  if (infos > 0) {
    return { stufe: 'hinweis', klasse: 'nk-badge-yellow',
      kurz: zahl(infos, 'Hinweis', 'Hinweise'),
      lang: alle + ' — keine blockierenden Befunde, keine Warnungen' };
  }
  return { stufe: 'bereit', klasse: 'nk-badge-green',
    kurz: 'Bereit', lang: 'Keine Befunde — Vorschau möglich' };
}
