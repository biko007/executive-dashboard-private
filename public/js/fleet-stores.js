/* ═══════════════════════════════════════════════════════════════════════════
   Fleet Stores — Alpine.js stores + ENDPOINT_MAP extension for Fleet
   Sprint 6 — Etappe d
   ═══════════════════════════════════════════════════════════════════════════ */

// ── ENDPOINT_MAP Extension for Fleet ─────────────────────────────────────────

Object.assign(ENDPOINT_MAP, {
  // Vehicles
  'fleet.vehicles.list':       () => '/api/fleet/vehicles',
  'fleet.vehicles.create':     () => '/api/fleet/vehicles',
  'fleet.vehicles.read':       (p) => `/api/fleet/vehicles/${p.vehicle_code}`,
  'fleet.vehicles.update':     (p) => `/api/fleet/vehicles/${p.vehicle_code}`,
  'fleet.vehicles.archive':    (p) => `/api/fleet/vehicles/${p.vehicle_code}/archive`,
  'fleet.vehicles.unarchive':  (p) => `/api/fleet/vehicles/${p.vehicle_code}/unarchive`,

  // Service Records
  'fleet.service-records.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/service-records`,
  'fleet.service-records.update': (p) => `/api/fleet/service-records/${p.record_id}`,
  'fleet.service-records.delete': (p) => `/api/fleet/service-records/${p.record_id}`,

  // Insurance Policies
  'fleet.insurance-policies.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/insurance-policies`,
  'fleet.insurance-policies.update': (p) => `/api/fleet/insurance-policies/${p.record_id}`,
  'fleet.insurance-policies.delete': (p) => `/api/fleet/insurance-policies/${p.record_id}`,

  // TUeV Records
  'fleet.tuev-records.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/tuev-records`,
  'fleet.tuev-records.update': (p) => `/api/fleet/tuev-records/${p.record_id}`,
  'fleet.tuev-records.delete': (p) => `/api/fleet/tuev-records/${p.record_id}`,

  // Tax Records
  'fleet.tax-records.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/tax-records`,
  'fleet.tax-records.update': (p) => `/api/fleet/tax-records/${p.record_id}`,
  'fleet.tax-records.delete': (p) => `/api/fleet/tax-records/${p.record_id}`,

  // Documents
  'fleet.documents.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/documents`,
  'fleet.documents.delete': (p) => `/api/fleet/documents/${p.record_id}`,

  // Tire Sets
  'fleet.tire-sets.create': (p) => `/api/fleet/vehicles/${p.vehicle_code}/tire-sets`,
  'fleet.tire-sets.update': (p) => `/api/fleet/tire-sets/${p.record_id}`,
  'fleet.tire-sets.delete': (p) => `/api/fleet/tire-sets/${p.record_id}`,

  // Approval Preview
  'fleet.approval-preview': () => '/api/fleet/approval-preview',

  // Audit Log
  'fleet.audit-log': () => '/api/fleet/audit-log',
});

// ── Doc Type Labels ──────────────────────────────────────────────────────────

const FLEET_DOC_TYPE_LABELS = {
  vehicle_registration: 'Fahrzeugschein',
  insurance_policy: 'Versicherungsschein',
  tuev_report: 'TUeV-Bericht',
  purchase_contract: 'Kaufvertrag',
  other: 'Sonstiges',
};

// ── Fleet-specific Approval Mutation Wrapper ─────────────────────────────────

async function fleetApprovalMutation(endpointKey, httpMethod, pathParams, body, options = {}) {
  return approvalMutation(endpointKey, httpMethod, pathParams, body, {
    ...options,
    previewEndpointKey: 'fleet.approval-preview',
  });
}

// ── TUeV Info Helper ─────────────────────────────────────────────────────────

function fleetTuevInfo(tuevDate) {
  if (!tuevDate) return { cls: 'tuev-none', text: 'kein TUeV' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(tuevDate); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  const dateStr = fmtDate(tuevDate);
  if (days < 0) return { cls: 'tuev-red', text: 'ueberfaellig (' + dateStr + ')' };
  if (days <= 90) return { cls: 'tuev-yellow', text: 'in ' + days + 'd (' + dateStr + ')' };
  return { cls: 'tuev-green', text: dateStr };
}

// ── Globale Bruecke fuer Schaltflaechen in innerHTML-Inhalten ───────────────
//
// Die Fahrzeugkacheln und der Leerzustand werden als HTML-String gerendert und
// koennen deshalb keine Alpine-Direktiven nutzen. Diese Bruecke setzt den
// Filter auf der laufenden Komponente.
function fleetSetzeFilter(status) {
  const el = document.querySelector('[x-data=fleetRoot]');
  if (!el || !el._x_dataStack) return;
  el._x_dataStack[0].switchStatus(status);
}

// ── Fleet Root Component ─────────────────────────────────────────────────────

document.addEventListener('alpine:init', () => {
  Alpine.data('fleetRoot', () => ({
    loading: true,
    error: null,
    vehicles: [],
    statusFilter: 'active',
    selectedVehicle: null,
    fleetSubTab: 'stammdaten',

    init() {
      // Parse deep-link from URL query params
      const params = new URLSearchParams(window.location.search);
      if (params.has('fleet_code')) {
        this.selectedVehicle = params.get('fleet_code');
      }
      if (params.has('fleet_subtab')) {
        this.fleetSubTab = params.get('fleet_subtab');
      }
      this.loadVehicles();
    },

    async loadVehicles() {
      this.loading = true;
      this.error = null;
      try {
        const csrf = Alpine.store('csrf');
        if (!csrf.token) await csrf.refresh();
        const url = composeUrl('fleet.vehicles.list') + '?status=' + this.statusFilter;
        const res = await csrf.fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
        }
        this.vehicles = await res.json();
        this.loading = false;
        this.$nextTick(() => this._renderList());
      } catch (e) {
        this.error = e.message;
        this.loading = false;
      }
    },

    switchStatus(status) {
      this.statusFilter = status;
      this.loadVehicles();
    },

    /* ── Sichtbarkeit (P1-2) ────────────────────────────────────────────────
       Zusammengesetzte Bedingungen gehoeren nach CLAUDE.md in Methoden und
       nicht in den x-show-Ausdruck. Die Liste wird mit x-show ein- und
       ausgeblendet statt mit x-if abgebaut — sonst verliert $refs das
       Render-Ziel (siehe Kommentar in loadFleet()). */
    zeigtLadehinweis() {
      return this.loading === true;
    },

    zeigtFehler() {
      return this.loading !== true && !!this.error;
    },

    fehlerText() {
      return 'Fehler: ' + (this.error || 'unbekannt');
    },

    zeigtListe() {
      return this.loading !== true && !this.error && !this.selectedVehicle;
    },

    zeigtDetail() {
      return this.loading !== true && !this.error && !!this.selectedVehicle;
    },

    /* Beschriftung des aktiven Filters — wird in der Trefferzeile und im
       Leerzustand verwendet. */
    filterLabel() {
      if (this.statusFilter === 'archived') return 'Archiviert';
      if (this.statusFilter === 'all') return 'Alle';
      return 'Aktiv';
    },

    /* Trefferzahl je Filter. Macht sichtbar, dass der Filter die Auswahl
       einschraenkt und nicht die Gesamtliste veraendert. */
    trefferText() {
      if (this.loading === true) return '';
      const n = this.vehicles.length;
      const wort = n === 1 ? 'Fahrzeug' : 'Fahrzeuge';
      return n + ' ' + wort + ' · Filter: ' + this.filterLabel();
    },

    /* Vom Leerzustand aus aufgerufen (globale Bruecke fleetSetzeFilter). */
    resetFilter() {
      this.switchStatus('all');
    },

    openDetail(vehicleCode) {
      this.selectedVehicle = vehicleCode;
      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('fleet_code', vehicleCode);
      window.history.replaceState({}, '', url);
    },

    backToList() {
      this.selectedVehicle = null;
      this.fleetSubTab = 'stammdaten';
      // Clean URL
      const url = new URL(window.location);
      url.searchParams.delete('fleet_code');
      url.searchParams.delete('fleet_subtab');
      window.history.replaceState({}, '', url);
      this.loadVehicles();
    },

    /* Leerzustand benennt den aktiven Filter. Vorher stand hier nur
       "Keine Fahrzeuge gefunden." — nicht unterscheidbar von einem leeren
       Bestand (Spec §4 C, §4 M "keine Daten" vs. "keine Treffer"). */
    _leerzustand() {
      if (this.statusFilter === 'archived') {
        return '<div class="empty">'
          + '<div style="font-weight:600;color:var(--text);margin-bottom:6px">Keine archivierten Fahrzeuge</div>'
          + '<div style="font-size:13px;margin-bottom:14px">Der Filter &bdquo;Archiviert&ldquo; ist aktiv. '
          + 'Es ist derzeit kein Fahrzeug archiviert &mdash; &bdquo;Alle&ldquo; zeigt den vollstaendigen Bestand.</div>'
          + '<button class="btn btn-primary" onclick="fleetSetzeFilter(\'all\')">Filter zuruecksetzen</button>'
          + '</div>';
      }
      if (this.statusFilter === 'active') {
        return '<div class="empty">'
          + '<div style="font-weight:600;color:var(--text);margin-bottom:6px">Keine aktiven Fahrzeuge</div>'
          + '<div style="font-size:13px;margin-bottom:14px">Der Filter &bdquo;Aktiv&ldquo; ist aktiv. '
          + '&bdquo;Alle&ldquo; zeigt auch archivierte Fahrzeuge.</div>'
          + '<button class="btn btn-primary" onclick="fleetSetzeFilter(\'all\')">Filter zuruecksetzen</button>'
          + '</div>';
      }
      return '<div class="empty">'
        + '<div style="font-weight:600;color:var(--text);margin-bottom:6px">Keine Fahrzeuge erfasst</div>'
        + '<div style="font-size:13px">Im Fuhrpark ist noch kein Fahrzeug angelegt.</div>'
        + '</div>';
    },

    _renderList() {
      const el = this.$refs.fleetListContent;
      if (!el) {
        /* Darf nach dem Umbau auf x-show nicht mehr vorkommen. Falls doch:
           sichtbarer Fehler statt stillem Abbruch (P1-2). */
        this.error = 'Die Fahrzeugliste konnte nicht dargestellt werden '
          + '(Render-Ziel fehlt). Bitte Bereich neu laden.';
        return;
      }
      if (!this.vehicles.length) {
        el.innerHTML = this._leerzustand();
        return;
      }

      const _fuelMap = {gasoline:'Benzin',diesel:'Diesel',electric:'Elektro',hybrid:'Hybrid',plugin_hybrid:'Plug-in-Hybrid',lpg:'LPG',cng:'CNG',hydrogen:'Wasserstoff'};
      const _kmFmt = new Intl.NumberFormat('de-DE');
      const _eurFmt = new Intl.NumberFormat('de-DE', {style:'currency',currency:'EUR',maximumFractionDigits:0});

      let html = '<div class="entity-grid">';
      for (const v of this.vehicles) {
        const code = esc(v.vehicleCode || v.id);
        const isArchived = v.status === 'archived';
        const t = fleetTuevInfo(v.tuevNextDueDate || v.tuevDate);
        const fuelLabel = _fuelMap[v.fuelType] || (v.fuelType ? esc(v.fuelType) : '\u2014');
        const km = v.mileage != null ? _kmFmt.format(v.mileage) + ' km' : '\u2014';
        const tuevVal = (v.tuevNextDueDate || v.tuevDate) ? '<span class="' + t.cls + '">' + esc(t.text) + '</span>' : '\u2014';
        const ins = v.activeInsurancePremium != null ? _eurFmt.format(v.activeInsurancePremium) : '\u2014';
        const tax = v.currentYearTaxAmount != null ? _eurFmt.format(v.currentYearTaxAmount) : '\u2014';
        const subtitle = (v.plate ? esc(v.plate) + ' \u00B7 ' : '') + code;

        html += '<div class="entity-tile' + (isArchived ? ' ownership-ended' : '') + '" onclick="document.querySelector(\'[x-data=fleetRoot]\')._x_dataStack[0].openDetail(\'' + code + '\')">';
        html += entityImgHtml('fleet', v.vehicleCode || v.id, 'entity-tile__image');
        html += '<div class="entity-tile__body">';
        html += '<div class="entity-tile__title">' + esc(v.name || (v.make + ' ' + v.model)) + '</div>';
        html += '<div class="entity-tile__subtitle">' + subtitle + '</div>';
        html += '<div class="entity-tile__data">';
        html += '<span class="label">Erstzulassung</span><span class="value">' + (v.year || '\u2014') + '</span>';
        html += '<span class="label">Kraftstoff</span><span class="value">' + fuelLabel + '</span>';
        html += '<span class="label">KM-Stand</span><span class="value">' + km + '</span>';
        html += '<span class="label">TUeV bis</span><span class="value">' + tuevVal + '</span>';
        html += '<span class="label">Versicherung/J</span><span class="value">' + ins + '</span>';
        html += '<span class="label">Kfz-Steuer/J</span><span class="value">' + tax + '</span>';
        html += '</div></div></div>';
      }
      html += '</div>';
      el.innerHTML = html;
    },
  }));
});
