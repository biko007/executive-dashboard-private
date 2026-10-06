/* ═══════════════════════════════════════════════════════════════════════════
   Begriffe — gemeinsame Übersetzungstabelle für Datenbank-Rohwerte
   Paket P2-8 (Befund M, Spec §4 M)

   WARUM
   Rohwerte aus der Datenbank standen unübersetzt auf dem Bildschirm: in der
   Spalte „Typ" der Mietvertragstabelle etwa `residential_permanent`. Die
   Übersetzungen gab es nur in den Auswahlfeldern der Formulare — also
   mehrfach, uneinheitlich und nicht dort, wo gelesen wird.

   Diese Tabelle ist die EINE Stelle. Sie übersetzt nur die Anzeige; die
   Werte in der Datenbank bleiben unverändert.

   REGEL FÜR UNBEKANNTE WERTE
   `begriff()` gibt einen unbekannten Wert unverändert zurück und markiert ihn
   nicht als Erfolg. Lieber ein sichtbarer Rohwert, der eine Lücke in dieser
   Tabelle zeigt, als eine erfundene Bezeichnung.
   ═══════════════════════════════════════════════════════════════════════════ */

const BEGRIFFE = {
  /* ── Mietverträge ──────────────────────────────────────────────────────── */
  /* Die zulässigen Werte stehen als CHECK-Bedingung in der Datenbank
     (`leases_lease_type_check`). Diese Tabelle hält sich daran — sonst würde
     ein Auswahlfeld Werte anbieten, die die Datenbank ablehnt.
     Die beiden Altformen `residential_permanent`/`residential_temporary`
     stehen nur zur ANZEIGE darin; angeboten werden sie nicht (siehe
     BEGRIFF_OPTIONEN). */
  lease_type: {
    residential: 'Wohnung unbefristet',
    temporary: 'Wohnung befristet',
    commercial: 'Gewerbe',
    garage: 'Garage',
    storage: 'Lagerraum',
    residential_permanent: 'Wohnung unbefristet',
    residential_temporary: 'Wohnung befristet',
  },
  lease_status: {
    draft: 'Entwurf',
    active: 'Aktiv',
    terminated: 'Gekündigt',
    ended: 'Beendet',
    unverified_legacy: 'Altbestand, ungeprüft',
    future: 'Zukünftig',
  },
  billing_mode: {
    vorauszahlung: 'Vorauszahlung',
    pauschale: 'Pauschale',
    inklusive: 'Inklusive',
  },
  payment_method: {
    bank_transfer: 'Überweisung',
    sepa_direct_debit: 'SEPA-Lastschrift',
    cash: 'Barzahlung',
    other: 'Sonstiges',
    direct_debit: 'Lastschrift',
  },
  charge_type: {
    base_rent: 'Kaltmiete',
    operating_cost_prepayment: 'Nebenkosten-Vorauszahlung',
    heating_prepayment: 'Heizkosten-Vorauszahlung',
    garage_rent: 'Garagenmiete',
    vat: 'Umsatzsteuer',
    /* Altformen aus den Formularen, nur zur Anzeige. */
    kaltmiete: 'Kaltmiete',
    nk_vorauszahlung: 'Nebenkosten-Vorauszahlung',
    heizkosten_vorauszahlung: 'Heizkosten-Vorauszahlung',
    kaution: 'Kaution',
    sonstige: 'Sonstige',
  },
  termination_reason: {
    tenant_notice: 'Kündigung Mieter',
    landlord_notice: 'Kündigung Vermieter',
    mutual_agreement: 'Aufhebungsvertrag',
    expiry: 'Befristungsablauf',
  },

  /* ── Mieter und Vertragsparteien ───────────────────────────────────────── */
  tenant_type: {
    person: 'Privatperson',
    company: 'Unternehmen',
  },
  role: {
    contract_party: 'Vertragspartei',
    occupant: 'Bewohner',
    guarantor: 'Bürge',
    /* `subtenant` ist in der Datenbank NICHT zulässig
       (`lease_tenants_role_check`) — der Begriff steht hier nur, falls er in
       einer Anzeige auftaucht. Siehe P2-11. */
    subtenant: 'Untermieter',
  },

  /* ── Objekte und Einheiten ─────────────────────────────────────────────── */
  property_type: {
    residential: 'Wohngebäude',
    commercial: 'Gewerbeobjekt',
    mixed: 'Gemischte Nutzung',
    industrial: 'Industrieobjekt',
  },
  scope_type: {
    property: 'Gebäude',
    unit: 'Einheit',
  },

  /* ── Zähler und Ablesungen ─────────────────────────────────────────────── */
  medium: {
    cold_water: 'Kaltwasser',
    warm_water: 'Warmwasser',
    heat: 'Wärme',
    electricity: 'Strom',
    gas: 'Gas',
    /* Begriffe aus der Heizkostenkonfiguration, nur zur Anzeige. */
    main_heat: 'Hauptwärme',
    space_heating_heat: 'Raumwärme',
    warm_water_heat: 'Warmwasser (Wärme)',
    warm_water_volume: 'Warmwasser (Volumen)',
  },
  reading_type: {
    annual: 'Jahresablesung',
    interim: 'Zwischenablesung',
    move_in: 'Einzug',
    move_out: 'Auszug',
    meter_reset: 'Zählerreset',
    automatic: 'Automatisch',
    periodic: 'Periodisch',
  },

  /* ── Nebenkosten ───────────────────────────────────────────────────────── */
  allocation_basis: {
    default: 'Standard (gesetzlich)',
    landlord_full: 'Vermieter trägt 100 %',
    tenant_full: 'Mieter trägt 100 %',
    shared_no_separation: 'Keine Trennung',
    operating: 'Betriebskosten',
    maintenance: 'Instandhaltung',
  },
  severity: {
    blocker: 'Blockierend',
    warning: 'Warnung',
    info: 'Hinweis',
  },

  /* ── Fuhrpark ──────────────────────────────────────────────────────────── */
  vehicle_type: {
    car: 'Auto',
    motorcycle: 'Motorrad',
    truck: 'Nutzfahrzeug',
    trailer: 'Anhänger',
    other: 'Sonstiges',
  },
  fuel_type: {
    gasoline: 'Benzin',
    diesel: 'Diesel',
    electric: 'Elektro',
    hybrid: 'Hybrid',
    plugin_hybrid: 'Plug-in-Hybrid',
    hydrogen: 'Wasserstoff',
    cng: 'Erdgas (CNG)',
    lpg: 'Autogas (LPG)',
  },
  insurance_type: {
    haftpflicht: 'Haftpflicht',
    teilkasko: 'Teilkasko',
    vollkasko: 'Vollkasko',
  },
  tuev_result: {
    pass: 'Bestanden',
    conditional: 'Bedingt bestanden',
    fail: 'Nicht bestanden',
  },
  tire_season: {
    summer: 'Sommer',
    winter: 'Winter',
    all_season: 'Ganzjahr',
  },

  /* ── Dokumente und Reisen ──────────────────────────────────────────────── */
  document_type: {
    vertraege: 'Verträge',
    rechnungen: 'Rechnungen',
    notizen: 'Notizen',
    sonstiges: 'Sonstiges',
  },
  segment_type: {
    flight: 'Flug',
    train: 'Zug',
    hotel: 'Hotel',
    car: 'Mietwagen',
    other: 'Sonstiges',
  },

  /* ── Instagram ─────────────────────────────────────────────────────────── */
  media_type: {
    image: 'Bild',
    reel: 'Reel',
    carousel: 'Karussell',
    story: 'Story',
    video: 'Video',
    document: 'Dokument',
  },
  draft_status: {
    idea: 'Idee',
    draft: 'Entwurf',
    entwurf: 'Entwurf',
    review: 'In Prüfung',
    ready: 'Bereit',
    freigegeben: 'Freigegeben',
    published: 'Veröffentlicht',
    'veröffentlicht': 'Veröffentlicht',
  },
  session_status: {
    active: 'Aktiv',
    closed: 'Geschlossen',
    scanning: 'Wird geprüft',
    scanned: 'Geprüft',
    crafting: 'In Bearbeitung',
    cutting: 'Wird geschnitten',
    cut_done: 'Geschnitten',
  },

  /* ── Konten ────────────────────────────────────────────────────────────── */
  account_status: {
    active: 'Aktiv',
    archived: 'Archiviert',
  },
};

/* Welche Werte ein Auswahlfeld anbieten DARF — in Anzeigereihenfolge.
   Grund: die Datenbank prüft diese Spalten mit CHECK-Bedingungen. Ein
   Auswahlfeld, das einen anderen Wert anbietet, führt beim Speichern zu einem
   Fehler der Datenbank. Altformen stehen deshalb in BEGRIFFE (Anzeige), aber
   nicht hier (Auswahl). Steht eine Gruppe nicht in dieser Liste, werden alle
   Schlüssel angeboten. */
const BEGRIFF_OPTIONEN = {
  lease_type:     ['residential', 'temporary', 'commercial', 'garage', 'storage'],
  lease_status:   ['draft', 'active', 'terminated', 'ended', 'unverified_legacy'],
  payment_method: ['bank_transfer', 'sepa_direct_debit', 'cash', 'other'],
  charge_type:    ['base_rent', 'operating_cost_prepayment', 'heating_prepayment', 'garage_rent', 'vat'],
  property_type:  ['residential', 'commercial', 'mixed', 'industrial'],
  medium:         ['cold_water', 'warm_water', 'heat', 'electricity', 'gas'],
  reading_type:   ['annual', 'interim', 'move_in', 'move_out', 'meter_reset', 'automatic'],
  role:           ['contract_party', 'occupant', 'guarantor'],
};

/* Einen Rohwert übersetzen. Unbekannte Werte kommen unverändert zurück —
   siehe Regel am Dateianfang. Ohne Wert steht ein Gedankenstrich. */
function begriff(gruppe, wert) {
  if (wert === null || wert === undefined || wert === '') return '–';
  const tabelle = BEGRIFFE[gruppe];
  const treffer = tabelle ? tabelle[wert] : undefined;
  return treffer !== undefined ? treffer : String(wert);
}

/* Auswahlfeld-Einträge aus derselben Tabelle, damit Formular und Anzeige
   dieselben Bezeichnungen tragen.

   `vorhandenerWert` wird ergänzt, falls er nicht in der Tabelle steht. Ohne
   das würde ein Bestandswert beim Speichern stillschweigend durch den ersten
   Eintrag der Liste ersetzt — eine Datenänderung durch ein Anzeigeproblem. */
/* B (Phase 3): `erlaubte` schraenkt die Liste weiter ein. Gebraucht fuer die
   Sammelerfassung von Ablesungen: `automatic` ist in der Datenbank zulaessig,
   in einem Handformular aber keine sinnvolle Auswahl. */
function begriffOptionen(gruppe, auswahl, vorhandenerWert, erlaubte) {
  const tabelle = BEGRIFFE[gruppe] || {};
  const schluessel = (erlaubte || BEGRIFF_OPTIONEN[gruppe] || Object.keys(tabelle)).slice();
  if (vorhandenerWert && !schluessel.includes(vorhandenerWert)) schluessel.unshift(vorhandenerWert);
  /* Doppelte Bezeichnungen (zwei Schlüssel, ein Text) nur einmal anbieten. */
  const gesehen = new Set();
  return schluessel.filter(k => {
    const text = begriff(gruppe, k);
    if (gesehen.has(text) && k !== auswahl && k !== vorhandenerWert) return false;
    gesehen.add(text);
    return true;
  }).map(k => '<option value="' + esc(k) + '"' + (k === auswahl ? ' selected' : '') + '>'
    + esc(begriff(gruppe, k)) + '</option>').join('');
}

/* Zustandsabzeichen für einen Rohwert, Farbe nach Bedeutung.
   Symbol und Text tragen die Aussage; die Farbe ist Ergänzung (Spec §2). */
const BEGRIFF_FARBEN = {
  active: 'badge-green', aktiv: 'badge-green', pass: 'badge-green',
  ready: 'badge-green', published: 'badge-green', scanned: 'badge-green',
  cut_done: 'badge-green', freigegeben: 'badge-yellow',
  future: 'badge-blue', draft: 'badge-blue', entwurf: 'badge-blue',
  idea: 'badge-muted', ended: 'badge-muted', closed: 'badge-muted',
  archived: 'badge-muted',
  review: 'badge-yellow', crafting: 'badge-yellow', cutting: 'badge-yellow',
  scanning: 'badge-yellow', conditional: 'badge-yellow', warning: 'badge-yellow',
  fail: 'badge-red', blocker: 'badge-red',
};

function begriffBadge(gruppe, wert) {
  const klasse = BEGRIFF_FARBEN[wert] || 'badge-muted';
  return '<span class="badge ' + klasse + '">' + esc(begriff(gruppe, wert)) + '</span>';
}
