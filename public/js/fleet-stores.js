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
        this._renderList();
      } catch (e) {
        this.error = e.message;
        this.loading = false;
      }
    },

    switchStatus(status) {
      this.statusFilter = status;
      this.loadVehicles();
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

    _renderList() {
      const el = this.$refs.fleetListContent;
      if (!el) return;
      if (!this.vehicles.length) {
        el.innerHTML = '<div class="empty">Keine Fahrzeuge gefunden.</div>';
        return;
      }
      const rows = this.vehicles.map(v => {
        const icon = v.type === 'car' ? '&#x1F697;' : v.type === 'boat' ? '&#x1F6A4;' : '&#x1F6B2;';
        const plate = v.plate ? '<span class="badge badge-blue">' + esc(v.plate) + '</span>' : '';
        const km = v.mileage != null ? Number(v.mileage).toLocaleString('de-DE') + ' km' : '&ndash;';
        const t = fleetTuevInfo(v.tuevDate);
        const code = esc(v.vehicleCode || v.id);
        const archived = v.status === 'archived' ? ' <span class="badge badge-muted">archiviert</span>' : '';
        return '<tr onclick="document.querySelector(\'[x-data=fleetRoot]\')._x_dataStack[0].openDetail(\'' + code + '\')" style="cursor:pointer">'
          + '<td>' + icon + '</td>'
          + '<td><strong>' + esc(v.name || (v.make + ' ' + v.model)) + '</strong>' + archived + '</td>'
          + '<td>' + plate + '</td>'
          + '<td>' + esc(v.make) + ' ' + esc(v.model) + '</td>'
          + '<td>' + km + '</td>'
          + '<td><span class="' + t.cls + '">' + esc(t.text) + '</span></td>'
          + '</tr>';
      }).join('');
      el.innerHTML = '<table class="assets-table">'
        + '<thead><tr><th></th><th>Fahrzeug</th><th>Kennzeichen</th><th>Hersteller / Modell</th><th>km-Stand</th><th>TUeV</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    },
  }));
});
