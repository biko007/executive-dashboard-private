/* ═══════════════════════════════════════════════════════════════════════════
   Fleet Detail View — Alpine.js component for vehicle detail + sub-tabs
   Sprint 6 — Etappe d
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('alpine:init', () => {
  Alpine.data('fleetDetailView', () => ({
    vehicle: null,
    loading: true,
    error: null,
    activeTab: 'stammdaten',

    init() {
      const root = this._getRoot();
      if (root && root.fleetSubTab) {
        this.activeTab = root.fleetSubTab;
      }
      this.loadVehicle();
    },

    _getRoot() {
      // Walk up to find fleetRoot data
      try {
        const rootEl = document.querySelector('[x-data=fleetRoot]');
        if (rootEl && rootEl._x_dataStack) return rootEl._x_dataStack[0];
      } catch {}
      return null;
    },

    async loadVehicle() {
      this.loading = true;
      this.error = null;
      const root = this._getRoot();
      if (!root || !root.selectedVehicle) return;
      try {
        const csrf = Alpine.store('csrf');
        const url = composeUrl('fleet.vehicles.read', { vehicle_code: root.selectedVehicle });
        const res = await csrf.fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
        }
        this.vehicle = await res.json();
        this.loading = false;
        this.$nextTick(() => this._renderTab());
      } catch (e) {
        this.error = e.message;
        this.loading = false;
      }
    },

    switchTab(tab) {
      this.activeTab = tab;
      const root = this._getRoot();
      if (root) root.fleetSubTab = tab;
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('fleet_subtab', tab);
      window.history.replaceState({}, '', url);
      this._renderTab();
    },

    isTab(tab) {
      return this.activeTab === tab;
    },

    _renderTab() {
      const el = this.$refs.fleetDetailContent;
      if (!el || !this.vehicle) return;
      switch (this.activeTab) {
        case 'stammdaten': el.innerHTML = this._renderStammdaten(); break;
        case 'service':    el.innerHTML = this._renderService(); break;
        case 'insurance':  el.innerHTML = this._renderInsurance(); break;
        case 'tuev':       el.innerHTML = this._renderTuev(); break;
        case 'tax':        el.innerHTML = this._renderTax(); break;
        case 'documents':  el.innerHTML = this._renderDocuments(); break;
        case 'tires':      el.innerHTML = this._renderTires(); break;
        default:           el.innerHTML = this._renderStammdaten(); break;
      }
    },

    // ── Stammdaten Tab ─────────────────────────────────────────────────────

    _renderStammdaten() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const km = v.mileage != null ? Number(v.mileage).toLocaleString('de-DE') + ' km' : '&ndash;';
      const t = fleetTuevInfo(v.tuevDate);
      const icon = v.type === 'car' ? '&#x1F697;' : v.type === 'boat' ? '&#x1F6A4;' : '&#x1F6B2;';

      let html = '<div class="card card-pad">';
      html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">';
      html += '<span style="font-size:36px">' + icon + '</span>';
      html += '<div>';
      html += '<h2 style="font-size:20px;font-weight:700">' + esc(v.name || (v.make + ' ' + v.model)) + '</h2>';
      html += '<span style="color:var(--muted);font-size:13px">Code: ' + code + ' &middot; Erstellt: ' + fmtDate(v.createdAt) + '</span>';
      html += '</div>';
      html += '<div style="margin-left:auto;display:flex;gap:8px">';
      html += '<button class="btn btn-primary" onclick="fleetEditStammdaten(\'' + code + '\')">Bearbeiten</button>';
      if (v.status === 'active') {
        html += '<button class="btn btn-danger" onclick="fleetArchiveVehicle(\'' + code + '\')">Archivieren</button>';
      } else {
        html += '<button class="btn btn-primary" onclick="fleetUnarchiveVehicle(\'' + code + '\')">Reaktivieren</button>';
      }
      html += '</div></div>';

      html += '<table class="assets-table"><tbody>';
      html += '<tr><td style="color:var(--muted);width:180px">Fahrzeugcode</td><td>' + code + '</td></tr>';
      html += '<tr><td style="color:var(--muted)">Hersteller</td><td>' + esc(v.make) + '</td></tr>';
      html += '<tr><td style="color:var(--muted)">Modell</td><td>' + esc(v.model) + '</td></tr>';
      if (v.year) html += '<tr><td style="color:var(--muted)">Baujahr / Erstzulassung</td><td>' + esc(String(v.year)) + (v.firstRegistration ? ' / ' + fmtDate(v.firstRegistration) : '') + '</td></tr>';
      if (v.plate) html += '<tr><td style="color:var(--muted)">Kennzeichen</td><td><span class="badge badge-blue">' + esc(v.plate) + '</span></td></tr>';
      if (v.vin) html += '<tr><td style="color:var(--muted)">FIN</td><td style="font-family:monospace">' + esc(v.vin) + '</td></tr>';
      if (v.color) html += '<tr><td style="color:var(--muted)">Farbe</td><td>' + esc(v.color) + '</td></tr>';
      const _fuelLabels = {gasoline:'Benzin',diesel:'Diesel',electric:'Elektro',hybrid:'Hybrid',plugin_hybrid:'Plug-in-Hybrid',lpg:'LPG',cng:'CNG',hydrogen:'Wasserstoff'};
      if (v.fuelType) html += '<tr><td style="color:var(--muted)">Kraftstoff</td><td>' + esc(_fuelLabels[v.fuelType] || v.fuelType) + '</td></tr>';
      html += '<tr><td style="color:var(--muted)">km-Stand</td><td>' + km + '</td></tr>';
      if (v.holder) html += '<tr><td style="color:var(--muted)">Halter</td><td>' + esc(v.holder) + '</td></tr>';
      if (v.purchasePrice != null) html += '<tr><td style="color:var(--muted)">Kaufpreis</td><td>' + Number(v.purchasePrice).toLocaleString('de-DE') + ' &euro;</td></tr>';
      html += '<tr><td style="color:var(--muted)">TUeV</td><td><span class="' + t.cls + '">' + esc(t.text) + '</span></td></tr>';
      html += '<tr><td style="color:var(--muted)">Status</td><td>' + (v.status === 'active' ? '<span class="badge badge-green">aktiv</span>' : '<span class="badge badge-muted">archiviert</span>') + '</td></tr>';
      if (v.notes) html += '<tr><td style="color:var(--muted)">Notizen</td><td>' + esc(v.notes) + '</td></tr>';
      html += '</tbody></table></div>';

      return html;
    },

    // ── Service Tab ────────────────────────────────────────────────────────

    _renderService() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const records = v.serviceLog || [];

      let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">Wartungshistorie (' + records.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddServiceModal(\'' + code + '\')">+ Eintrag</button>';
      html += '</div>';

      if (!records.length) {
        html += '<div class="empty">Keine Service-Eintraege vorhanden.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Datum</th><th>Typ</th><th>km</th><th>Kosten</th><th>Werkstatt</th><th>Notiz</th><th></th></tr></thead><tbody>';
      const sorted = records.slice().sort((a, b) => (b.date || b.service_date || '').localeCompare(a.date || a.service_date || ''));
      for (const s of sorted) {
        const skm = s.mileage_km != null ? Number(s.mileage_km).toLocaleString('de-DE') + ' km' : (s.mileage != null ? Number(s.mileage).toLocaleString('de-DE') + ' km' : '&ndash;');
        const cost = s.cost != null ? Number(s.cost).toLocaleString('de-DE') + ' &euro;' : '&ndash;';
        const rid = s.id || '';
        html += '<tr>';
        html += '<td style="white-space:nowrap">' + fmtDate(s.service_date || s.date) + '</td>';
        html += '<td>' + esc(s.service_type || s.type || '') + '</td>';
        html += '<td>' + skm + '</td>';
        html += '<td>' + cost + '</td>';
        html += '<td>' + esc(s.workshop || '') + '</td>';
        html += '<td style="color:var(--muted);font-size:12px">' + esc(s.notes || '') + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteServiceRecord(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },

    // ── Insurance Tab ──────────────────────────────────────────────────────

    _renderInsurance() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const policies = v.insurancePolicies || [];

      let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">Versicherungen (' + policies.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddInsuranceModal(\'' + code + '\')">+ Versicherung</button>';
      html += '</div>';

      if (!policies.length) {
        html += '<div class="empty">Keine Versicherungen hinterlegt.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Anbieter</th><th>Typ</th><th>Policen-Nr</th><th>Gueltig ab</th><th>Gueltig bis</th><th>Jahrespraemie</th><th></th></tr></thead><tbody>';
      for (const p of policies) {
        const rid = p.id || '';
        html += '<tr>';
        html += '<td>' + esc(p.company || p.provider || '') + '</td>';
        html += '<td>' + esc(p.coverage_type || p.type || '') + '</td>';
        html += '<td>' + esc(p.policy_number || p.policyNumber || '') + '</td>';
        html += '<td>' + fmtDate(p.valid_from || p.validFrom) + '</td>';
        html += '<td>' + fmtDate(p.valid_to || p.validUntil) + '</td>';
        html += '<td>' + (p.annual_premium != null ? Number(p.annual_premium).toLocaleString('de-DE') + ' &euro;' : (p.annualCost != null ? Number(p.annualCost).toLocaleString('de-DE') + ' &euro;' : '&ndash;')) + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteInsurancePolicy(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },

    // ── TUeV Tab ───────────────────────────────────────────────────────────

    _renderTuev() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const records = v.tuevRecords || [];

      // Legacy banner check
      let legacyBanner = '';
      if (v.sourcePayload && v.sourcePayload.tuev_next_due_legacy_no_inspection) {
        legacyBanner = '<div class="legacy-banner">Legacy-Marker: TUeV-Faelligkeit wurde aus Altdaten uebernommen, ohne dass ein Pruefbericht vorliegt. Bitte aktuellen TUeV-Bericht hinzufuegen.</div>';
      }

      let html = legacyBanner;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">TUeV-Pruefungen (' + records.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddTuevModal(\'' + code + '\')">+ TUeV-Eintrag</button>';
      html += '</div>';

      if (!records.length) {
        html += '<div class="empty">Keine TUeV-Eintraege vorhanden.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Pruefung</th><th>Ergebnis</th><th>Naechster Termin</th><th>km</th><th>Notiz</th><th></th></tr></thead><tbody>';
      const sorted = records.slice().sort((a, b) => (b.inspection_date || b.inspectionDate || '').localeCompare(a.inspection_date || a.inspectionDate || ''));
      for (const r of sorted) {
        const resultMap = { pass: 'Bestanden', conditional: 'Bedingt', fail: 'Nicht bestanden' };
        const result = resultMap[r.result] || esc(r.result || '&ndash;');
        const rid = r.id || '';
        const mkm = r.mileage_km != null ? Number(r.mileage_km).toLocaleString('de-DE') + ' km' : (r.mileageKm != null ? Number(r.mileageKm).toLocaleString('de-DE') + ' km' : '&ndash;');
        html += '<tr>';
        html += '<td>' + fmtDate(r.inspection_date || r.inspectionDate) + '</td>';
        html += '<td>' + result + '</td>';
        html += '<td>' + fmtDate(r.next_due_date || r.nextDueDate) + '</td>';
        html += '<td>' + mkm + '</td>';
        html += '<td style="color:var(--muted);font-size:12px">' + esc(r.notes || '') + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteTuevRecord(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },

    // ── Tax Tab ────────────────────────────────────────────────────────────

    _renderTax() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const records = v.taxRecords || [];

      // Legacy banner check
      let legacyBanner = '';
      if (v.sourcePayload && v.sourcePayload.tax_amount_legacy_no_year) {
        legacyBanner = '<div class="legacy-banner">Legacy-Marker: KFZ-Steuer wurde aus Altdaten ohne Jahresangabe uebernommen. Bitte Steuerbescheid mit Jahr erfassen.</div>';
      }

      let html = legacyBanner;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">KFZ-Steuer (' + records.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddTaxModal(\'' + code + '\')">+ Steuereintrag</button>';
      html += '</div>';

      if (!records.length) {
        html += '<div class="empty">Keine Steuereintraege vorhanden.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Jahr</th><th>Betrag</th><th>Bezahlt am</th><th>Notiz</th><th></th></tr></thead><tbody>';
      const sorted = records.slice().sort((a, b) => (b.tax_year || b.taxYear || 0) - (a.tax_year || a.taxYear || 0));
      for (const r of sorted) {
        const rid = r.id || '';
        html += '<tr>';
        html += '<td>' + (r.tax_year || r.taxYear || '&ndash;') + '</td>';
        html += '<td>' + (r.amount != null ? Number(r.amount).toLocaleString('de-DE') + ' &euro;' : '&ndash;') + '</td>';
        html += '<td>' + fmtDate(r.paid_at || r.paidAt) + '</td>';
        html += '<td style="color:var(--muted);font-size:12px">' + esc(r.notes || '') + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteTaxRecord(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },

    // ── Documents Tab ──────────────────────────────────────────────────────

    _renderDocuments() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const docs = v.documents || [];

      let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">Dokumente (' + docs.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddDocumentModal(\'' + code + '\')">+ Dokument</button>';
      html += '</div>';

      if (!docs.length) {
        html += '<div class="empty">Keine Dokumente hinterlegt.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Typ</th><th>Titel</th><th>URL</th><th>Erstellt</th><th></th></tr></thead><tbody>';
      for (const d of docs) {
        const rid = d.id || '';
        const typeLabel = FLEET_DOC_TYPE_LABELS[d.doc_type || d.docType] || esc(d.doc_type || d.docType || '');
        html += '<tr>';
        html += '<td>' + typeLabel + '</td>';
        html += '<td>' + esc(d.title || '') + '</td>';
        html += '<td>' + (d.url ? '<a href="' + esc(d.url) + '" target="_blank" style="color:var(--accent)">Oeffnen</a>' : '&ndash;') + '</td>';
        html += '<td>' + fmtDate(d.created_at || d.createdAt) + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteDocument(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },

    // ── Tires Tab ───────────────────────────────────────────────────────

    _renderTires() {
      const v = this.vehicle;
      const code = esc(v.vehicleCode || v.id);
      const sets = v.tireSets || [];

      const typeLabels = { summer: 'Sommer', winter: 'Winter', all_season: 'Ganzjahr', spike: 'Spike' };

      let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
      html += '<h3 style="font-size:15px;font-weight:600">Reifensaetze (' + sets.length + ')</h3>';
      html += '<button class="btn btn-primary" onclick="fleetAddTireSetModal(\'' + code + '\')">+ Reifensatz</button>';
      html += '</div>';

      if (!sets.length) {
        html += '<div class="empty">Keine Reifensaetze hinterlegt.</div>';
        return html;
      }

      html += '<table class="assets-table"><thead><tr><th>Typ</th><th>Marke / Modell</th><th>Profiltiefe</th><th>Montiert</th><th>Demontiert</th><th>Notiz</th><th></th></tr></thead><tbody>';
      for (const t of sets) {
        const isActive = !t.removedAt && !t.removed_at;
        const rowStyle = isActive ? ' style="background:rgba(59,130,246,0.08)"' : '';
        const tireType = t.tire_type || t.tireType || '';
        const typeLabel = typeLabels[tireType] || esc(tireType) || '&ndash;';
        const brand = t.brand || '';
        const model = t.model || '';
        const brandModel = (brand || model) ? esc(brand + (brand && model ? ' ' : '') + model) : '&ndash;';
        const depth = (t.tread_depth_mm != null || t.treadDepthMm != null) ? Number(t.tread_depth_mm ?? t.treadDepthMm).toFixed(1) + ' mm' : '&ndash;';
        const installed = fmtDate(t.installed_at || t.installedAt);
        const removed = fmtDate(t.removed_at || t.removedAt);
        const rid = t.id || '';
        html += '<tr' + rowStyle + '>';
        html += '<td>' + typeLabel + '</td>';
        html += '<td>' + brandModel + '</td>';
        html += '<td>' + depth + '</td>';
        html += '<td>' + installed + '</td>';
        html += '<td>' + removed + '</td>';
        html += '<td style="color:var(--muted);font-size:12px">' + esc(t.notes || '') + '</td>';
        html += '<td>';
        if (rid) {
          html += '<button class="btn btn-danger" style="font-size:11px;padding:3px 8px" onclick="fleetDeleteTireSet(' + rid + ')">X</button>';
        }
        html += '</td></tr>';
      }
      html += '</tbody></table>';
      return html;
    },
  }));
});

// ═══════════════════════════════════════════════════════════════════════════════
// Global Fleet Functions — prefixed with "fleet" to avoid namespace collisions
// ═══════════════════════════════════════════════════════════════════════════════

function _fleetGetDetailComponent() {
  try {
    const el = document.querySelector('[x-data=fleetDetailView]');
    if (el && el._x_dataStack) return el._x_dataStack[0];
  } catch {}
  return null;
}

function _fleetGetRootComponent() {
  try {
    const el = document.querySelector('[x-data=fleetRoot]');
    if (el && el._x_dataStack) return el._x_dataStack[0];
  } catch {}
  return null;
}

async function _fleetReloadDetail() {
  const detail = _fleetGetDetailComponent();
  if (detail) await detail.loadVehicle();
}

// ── New Vehicle Modal ────────────────────────────────────────────────────────

function fleetNewVehicleModal() {
  openModal(
    '<h3>Neues Fahrzeug</h3>'
    + '<label>Fahrzeugcode (z.B. FZG-G580)</label>'
    + '<input id="fnv-code" placeholder="FZG-XXXX">'
    + '<label>Anzeigename</label>'
    + '<input id="fnv-name" placeholder="z.B. Mercedes G 580">'
    + '<label>Hersteller</label>'
    + '<input id="fnv-make" placeholder="z.B. Mercedes-Benz">'
    + '<label>Modell</label>'
    + '<input id="fnv-model" placeholder="z.B. G 580">'
    + '<label>Kennzeichen (optional)</label>'
    + '<input id="fnv-plate" placeholder="z.B. TUT-AB 123">'
    + '<label>FIN (optional)</label>'
    + '<input id="fnv-vin" placeholder="">'
    + '<label>Halter (optional)</label>'
    + '<input id="fnv-holder" placeholder="">'
    + '<label>km-Stand (optional)</label>'
    + '<input id="fnv-km" type="number" min="0" placeholder="0">'
    + '<label>Notizen (optional)</label>'
    + '<input id="fnv-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="fnv-save" onclick="fleetSaveNewVehicle()">Anlegen</button>'
    + '</div>'
  );
}

async function fleetSaveNewVehicle() {
  const code = document.getElementById('fnv-code').value.trim();
  const name = document.getElementById('fnv-name').value.trim();
  const make = document.getElementById('fnv-make').value.trim();
  const model = document.getElementById('fnv-model').value.trim();
  const plate = document.getElementById('fnv-plate').value.trim();
  const vin = document.getElementById('fnv-vin').value.trim();
  const holder = document.getElementById('fnv-holder').value.trim();
  const km = document.getElementById('fnv-km').value;
  const notes = document.getElementById('fnv-notes').value.trim();

  if (!code || !make || !model) {
    Alpine.store('toast').error('Fahrzeugcode, Hersteller und Modell sind Pflicht.');
    return;
  }

  const btn = document.getElementById('fnv-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = {
      vehicle_code: code,
      display_name: name || (make + ' ' + model),
      make: make,
      model: model,
    };
    if (plate) body.license_plate = plate;
    if (vin) body.vin = vin;
    if (holder) body.holder = holder;
    if (km) body.current_mileage_km = Number(km);
    if (notes) body.notes = notes;

    const idempotencyKey = crypto.randomUUID();
    const result = await fleetApprovalMutation(
      'fleet.vehicles.create', 'POST', {}, body,
      { idempotencyKey: idempotencyKey }
    );

    if (result !== false) {
      closeModal();
      const root = _fleetGetRootComponent();
      if (root) root.loadVehicles();
    } else {
      btn.disabled = false;
      btn.textContent = 'Anlegen';
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Anlegen';
  }
}

// ── Archive / Unarchive ──────────────────────────────────────────────────────

async function fleetArchiveVehicle(code) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.vehicles.archive', 'POST',
      { vehicle_code: code },
      { reason: 'Archiviert via Dashboard' }
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

async function fleetUnarchiveVehicle(code) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.vehicles.unarchive', 'POST',
      { vehicle_code: code },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── Edit Stammdaten ──────────────────────────────────────────────────────────

function fleetEditStammdaten(code) {
  const detail = _fleetGetDetailComponent();
  if (!detail || !detail.vehicle) return;
  const v = detail.vehicle;

  openModal(
    '<h3>Fahrzeug bearbeiten</h3>'
    + '<label>Fahrzeugcode</label>'
    + '<input id="fev-code" value="' + esc(v.vehicleCode || v.id || '') + '">'
    + '<small style="color:var(--muted)">Aenderung erfordert Genehmigung</small>'
    + '<label>Anzeigename</label>'
    + '<input id="fev-name" value="' + esc(v.name || '') + '">'
    + '<label>Hersteller</label>'
    + '<input id="fev-make" value="' + esc(v.make || '') + '">'
    + '<label>Modell</label>'
    + '<input id="fev-model" value="' + esc(v.model || '') + '">'
    + '<label>Kennzeichen</label>'
    + '<input id="fev-plate" value="' + esc(v.plate || '') + '">'
    + '<small style="color:var(--muted)">Aenderung erfordert Genehmigung</small>'
    + '<label>FIN</label>'
    + '<input id="fev-vin" value="' + esc(v.vin || '') + '">'
    + '<small style="color:var(--muted)">Aenderung erfordert Genehmigung</small>'
    + '<label>Halter</label>'
    + '<input id="fev-holder" value="' + esc(v.holder || '') + '">'
    + '<label>km-Stand</label>'
    + '<input id="fev-km" type="number" value="' + (v.mileage ?? '') + '">'
    + '<label>Kaufpreis (&euro;)</label>'
    + '<input id="fev-price" type="number" min="0" step="100" value="' + (v.purchasePrice ?? '') + '">'
    + '<label>Farbe</label>'
    + '<input id="fev-color" value="' + esc(v.color || '') + '">'
    + '<label>Kraftstoff</label>'
    + '<select id="fev-fuel">'
    + '<option value="">— (nicht angegeben)</option>'
    + '<option value="gasoline"' + (v.fuelType === 'gasoline' ? ' selected' : '') + '>Benzin</option>'
    + '<option value="diesel"' + (v.fuelType === 'diesel' ? ' selected' : '') + '>Diesel</option>'
    + '<option value="electric"' + (v.fuelType === 'electric' ? ' selected' : '') + '>Elektro</option>'
    + '<option value="hybrid"' + (v.fuelType === 'hybrid' ? ' selected' : '') + '>Hybrid</option>'
    + '<option value="plugin_hybrid"' + (v.fuelType === 'plugin_hybrid' ? ' selected' : '') + '>Plug-in-Hybrid</option>'
    + '<option value="lpg"' + (v.fuelType === 'lpg' ? ' selected' : '') + '>LPG</option>'
    + '<option value="cng"' + (v.fuelType === 'cng' ? ' selected' : '') + '>CNG</option>'
    + '<option value="hydrogen"' + (v.fuelType === 'hydrogen' ? ' selected' : '') + '>Wasserstoff</option>'
    + '</select>'
    + '<label>Notizen</label>'
    + '<input id="fev-notes" value="' + esc(v.notes || '') + '">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="fev-save" onclick="fleetSaveStammdaten(\'' + esc(code) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveStammdaten(originalCode) {
  const detail = _fleetGetDetailComponent();
  if (!detail || !detail.vehicle) return;
  const v = detail.vehicle;

  const newCode = document.getElementById('fev-code').value.trim();
  const name = document.getElementById('fev-name').value.trim();
  const make = document.getElementById('fev-make').value.trim();
  const model = document.getElementById('fev-model').value.trim();
  const plate = document.getElementById('fev-plate').value.trim();
  const vin = document.getElementById('fev-vin').value.trim();
  const holder = document.getElementById('fev-holder').value.trim();
  const km = document.getElementById('fev-km').value;
  const price = document.getElementById('fev-price').value;
  const color = document.getElementById('fev-color').value.trim();
  const fuel = document.getElementById('fev-fuel').value;
  const notes = document.getElementById('fev-notes').value.trim();

  const body = {};
  if (name !== (v.name || '')) body.display_name = name;
  if (make !== (v.make || '')) body.make = make;
  if (model !== (v.model || '')) body.model = model;
  if (holder !== (v.holder || '')) body.holder = holder;
  if (color !== (v.color || '')) body.color = color;
  if (fuel !== (v.fuelType || '')) body.fuel_type = fuel || null;
  if (notes !== (v.notes || '')) body.notes = notes;
  if (km !== '' && Number(km) !== v.mileage) body.current_mileage_km = Number(km);
  if (km === '' && v.mileage != null) body.current_mileage_km = null;
  if (price !== '' && Number(price) !== v.purchasePrice) body.purchase_price = Number(price);
  if (price === '' && v.purchasePrice != null) body.purchase_price = null;

  // Identity fields — require approval
  const identityChanged = (
    newCode !== (v.vehicleCode || v.id || '') ||
    plate !== (v.plate || '') ||
    vin !== (v.vin || '')
  );

  if (identityChanged) {
    if (newCode !== (v.vehicleCode || v.id || '')) body.vehicle_code = newCode;
    if (plate !== (v.plate || '')) body.license_plate = plate;
    if (vin !== (v.vin || '')) body.vin = vin;
  }

  if (Object.keys(body).length === 0) {
    closeModal();
    return;
  }

  const btn = document.getElementById('fev-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    if (identityChanged) {
      // Use approval flow for identity changes
      const result = await fleetApprovalMutation(
        'fleet.vehicles.update', 'PATCH',
        { vehicle_code: originalCode },
        body
      );
      if (result !== false) {
        closeModal();
        // If code changed, update the selected vehicle reference
        const root = _fleetGetRootComponent();
        if (root && newCode !== originalCode) {
          root.selectedVehicle = newCode;
        }
        await _fleetReloadDetail();
      } else {
        btn.disabled = false;
        btn.textContent = 'Speichern';
      }
    } else {
      // Regular CSRF-only PATCH for non-identity fields
      const csrf = Alpine.store('csrf');
      const url = composeUrl('fleet.vehicles.update', { vehicle_code: originalCode });
      const res = await csrf.fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
      }
      Alpine.store('toast').success('Gespeichert');
      closeModal();
      await _fleetReloadDetail();
    }
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

// ── Service Records CRUD ─────────────────────────────────────────────────────

function fleetAddServiceModal(vehicleCode) {
  const today = new Date().toISOString().slice(0, 10);
  openModal(
    '<h3>Service-Eintrag</h3>'
    + '<label>Datum</label>'
    + '<input id="fsv-date" type="date" value="' + today + '">'
    + '<label>Typ</label>'
    + '<select id="fsv-type">'
    + '<option value="Inspektion">Inspektion</option>'
    + '<option value="Oelwechsel">Oelwechsel</option>'
    + '<option value="Reifenwechsel">Reifenwechsel</option>'
    + '<option value="Reparatur">Reparatur</option>'
    + '<option value="TUeV/HU">TUeV/HU</option>'
    + '<option value="Sonstiges">Sonstiges</option>'
    + '</select>'
    + '<label>km-Stand (optional)</label>'
    + '<input id="fsv-km" type="number" min="0">'
    + '<label>Kosten &euro; (optional)</label>'
    + '<input id="fsv-cost" type="number" min="0" step="0.01">'
    + '<label>Werkstatt (optional)</label>'
    + '<input id="fsv-workshop" placeholder="">'
    + '<label>Notiz (optional)</label>'
    + '<input id="fsv-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="fsv-save" onclick="fleetSaveService(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveService(vehicleCode) {
  const date = document.getElementById('fsv-date').value;
  const type = document.getElementById('fsv-type').value;
  const km = document.getElementById('fsv-km').value;
  const cost = document.getElementById('fsv-cost').value;
  const workshop = document.getElementById('fsv-workshop').value.trim();
  const notes = document.getElementById('fsv-notes').value.trim();

  if (!date || !type) {
    Alpine.store('toast').error('Datum und Typ sind Pflicht.');
    return;
  }

  const btn = document.getElementById('fsv-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = { service_date: date, service_type: type };
    if (km) body.mileage_km = Number(km);
    if (cost) body.cost = Number(cost);
    if (workshop) body.workshop = workshop;
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const url = composeUrl('fleet.service-records.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('Service-Eintrag gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteServiceRecord(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.service-records.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── Insurance Policies CRUD ──────────────────────────────────────────────────

function fleetAddInsuranceModal(vehicleCode) {
  openModal(
    '<h3>Versicherung hinzufuegen</h3>'
    + '<label>Anbieter</label>'
    + '<input id="fins-company" placeholder="z.B. HUK-COBURG">'
    + '<label>Typ</label>'
    + '<input id="fins-type" placeholder="z.B. Haftpflicht, Vollkasko">'
    + '<label>Policen-Nr (optional)</label>'
    + '<input id="fins-policy" placeholder="">'
    + '<label>Jahrespraemie &euro; (optional)</label>'
    + '<input id="fins-premium" type="number" min="0" step="0.01">'
    + '<label>Gueltig ab (optional)</label>'
    + '<input id="fins-from" type="date">'
    + '<label>Gueltig bis (optional)</label>'
    + '<input id="fins-to" type="date">'
    + '<label>Notiz (optional)</label>'
    + '<input id="fins-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="fins-save" onclick="fleetSaveInsurance(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveInsurance(vehicleCode) {
  const company = document.getElementById('fins-company').value.trim();
  const type = document.getElementById('fins-type').value.trim();
  if (!company || !type) {
    Alpine.store('toast').error('Anbieter und Typ sind Pflicht.');
    return;
  }

  const btn = document.getElementById('fins-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = { company: company, coverage_type: type };
    const policy = document.getElementById('fins-policy').value.trim();
    const premium = document.getElementById('fins-premium').value;
    const from = document.getElementById('fins-from').value;
    const to = document.getElementById('fins-to').value;
    const notes = document.getElementById('fins-notes').value.trim();
    if (policy) body.policy_number = policy;
    if (premium) body.annual_premium = Number(premium);
    if (from) body.valid_from = from;
    if (to) body.valid_to = to;
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const url = composeUrl('fleet.insurance-policies.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('Versicherung gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteInsurancePolicy(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.insurance-policies.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── TUeV Records CRUD ───────────────────────────────────────────────────────

function fleetAddTuevModal(vehicleCode) {
  const today = new Date().toISOString().slice(0, 10);
  openModal(
    '<h3>TUeV-Eintrag</h3>'
    + '<label>Pruefungsdatum</label>'
    + '<input id="ftuev-date" type="date" value="' + today + '">'
    + '<label>Ergebnis</label>'
    + '<select id="ftuev-result">'
    + '<option value="pass">Bestanden</option>'
    + '<option value="conditional">Bedingt bestanden</option>'
    + '<option value="fail">Nicht bestanden</option>'
    + '</select>'
    + '<label>Naechster Termin</label>'
    + '<input id="ftuev-next" type="date">'
    + '<label>km-Stand (optional)</label>'
    + '<input id="ftuev-km" type="number" min="0">'
    + '<label>Notiz (optional)</label>'
    + '<input id="ftuev-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="ftuev-save" onclick="fleetSaveTuev(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveTuev(vehicleCode) {
  const date = document.getElementById('ftuev-date').value;
  const result = document.getElementById('ftuev-result').value;
  const next = document.getElementById('ftuev-next').value;
  const km = document.getElementById('ftuev-km').value;
  const notes = document.getElementById('ftuev-notes').value.trim();

  const btn = document.getElementById('ftuev-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = {};
    if (date) body.inspection_date = date;
    if (result) body.result = result;
    if (next) body.next_due_date = next;
    if (km) body.mileage_km = Number(km);
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const url = composeUrl('fleet.tuev-records.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('TUeV-Eintrag gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteTuevRecord(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.tuev-records.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── Tax Records CRUD ─────────────────────────────────────────────────────────

function fleetAddTaxModal(vehicleCode) {
  const currentYear = new Date().getFullYear();
  openModal(
    '<h3>Steuereintrag</h3>'
    + '<label>Jahr</label>'
    + '<input id="ftax-year" type="number" min="2000" max="2100" value="' + currentYear + '">'
    + '<label>Betrag &euro;</label>'
    + '<input id="ftax-amount" type="number" min="0" step="0.01">'
    + '<label>Bezahlt am (optional)</label>'
    + '<input id="ftax-paid" type="date">'
    + '<label>Notiz (optional)</label>'
    + '<input id="ftax-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="ftax-save" onclick="fleetSaveTax(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveTax(vehicleCode) {
  const year = document.getElementById('ftax-year').value;
  const amount = document.getElementById('ftax-amount').value;
  if (!year || !amount) {
    Alpine.store('toast').error('Jahr und Betrag sind Pflicht.');
    return;
  }

  const btn = document.getElementById('ftax-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = { tax_year: Number(year), amount: Number(amount) };
    const paid = document.getElementById('ftax-paid').value;
    const notes = document.getElementById('ftax-notes').value.trim();
    if (paid) body.paid_at = paid;
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const url = composeUrl('fleet.tax-records.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('Steuereintrag gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteTaxRecord(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.tax-records.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── Documents CRUD ───────────────────────────────────────────────────────────

function fleetAddDocumentModal(vehicleCode) {
  const typeOptions = Object.entries(FLEET_DOC_TYPE_LABELS).map(
    ([k, v]) => '<option value="' + k + '">' + esc(v) + '</option>'
  ).join('');

  openModal(
    '<h3>Dokument hinzufuegen</h3>'
    + '<label>Dokumenttyp</label>'
    + '<select id="fdoc-type">' + typeOptions + '</select>'
    + '<label>Titel</label>'
    + '<input id="fdoc-title" placeholder="z.B. Fahrzeugschein G-Klasse">'
    + '<label>URL</label>'
    + '<input id="fdoc-url" placeholder="https://...">'
    + '<label>Notiz (optional)</label>'
    + '<input id="fdoc-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="fdoc-save" onclick="fleetSaveDocument(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveDocument(vehicleCode) {
  const docType = document.getElementById('fdoc-type').value;
  const title = document.getElementById('fdoc-title').value.trim();
  const url = document.getElementById('fdoc-url').value.trim();
  if (!docType || !url) {
    Alpine.store('toast').error('Dokumenttyp und URL sind Pflicht.');
    return;
  }

  const btn = document.getElementById('fdoc-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = { doc_type: docType, url: url };
    if (title) body.title = title;
    const notes = document.getElementById('fdoc-notes').value.trim();
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const apiUrl = composeUrl('fleet.documents.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('Dokument gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteDocument(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.documents.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}

// ── Tire Sets CRUD ──────────────────────────────────────────────────────────

function fleetAddTireSetModal(vehicleCode) {
  const today = new Date().toISOString().slice(0, 10);
  openModal(
    '<h3>Reifensatz hinzufuegen</h3>'
    + '<label>Typ</label>'
    + '<select id="ftire-type">'
    + '<option value="summer">Sommer</option>'
    + '<option value="winter">Winter</option>'
    + '<option value="all_season">Ganzjahr</option>'
    + '<option value="spike">Spike</option>'
    + '</select>'
    + '<label>Marke (optional)</label>'
    + '<input id="ftire-brand" placeholder="z.B. Continental">'
    + '<label>Modell (optional)</label>'
    + '<input id="ftire-model" placeholder="z.B. PremiumContact 6">'
    + '<label>Profiltiefe mm (optional)</label>'
    + '<input id="ftire-depth" type="number" min="0" max="20" step="0.1">'
    + '<label>Montiert am (optional)</label>'
    + '<input id="ftire-installed" type="date" value="' + today + '">'
    + '<label>Demontiert am (optional)</label>'
    + '<input id="ftire-removed" type="date">'
    + '<label>Notiz (optional)</label>'
    + '<input id="ftire-notes" placeholder="">'
    + '<div class="modal-actions">'
    + '<button class="btn-ghost" onclick="closeModal()">Abbrechen</button>'
    + '<button class="btn btn-primary" id="ftire-save" onclick="fleetSaveTireSet(\'' + esc(vehicleCode) + '\')">Speichern</button>'
    + '</div>'
  );
}

async function fleetSaveTireSet(vehicleCode) {
  const tireType = document.getElementById('ftire-type').value;
  const brand = document.getElementById('ftire-brand').value.trim();
  const model = document.getElementById('ftire-model').value.trim();
  const depth = document.getElementById('ftire-depth').value;
  const installed = document.getElementById('ftire-installed').value;
  const removed = document.getElementById('ftire-removed').value;
  const notes = document.getElementById('ftire-notes').value.trim();

  const btn = document.getElementById('ftire-save');
  btn.disabled = true;
  btn.textContent = 'Speichern...';

  try {
    const body = {};
    if (tireType) body.tire_type = tireType;
    if (brand) body.brand = brand;
    if (model) body.model = model;
    if (depth) body.tread_depth_mm = Number(depth);
    if (installed) body.installed_at = installed;
    if (removed) body.removed_at = removed;
    if (notes) body.notes = notes;

    const csrf = Alpine.store('csrf');
    const url = composeUrl('fleet.tire-sets.create', { vehicle_code: vehicleCode });
    const res = await csrf.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || 'HTTP ' + res.status);
    }
    Alpine.store('toast').success('Reifensatz gespeichert');
    closeModal();
    await _fleetReloadDetail();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Speichern';
  }
}

async function fleetDeleteTireSet(recordId) {
  try {
    const result = await fleetApprovalMutation(
      'fleet.tire-sets.delete', 'DELETE',
      { record_id: recordId },
      {}
    );
    if (result !== false) await _fleetReloadDetail();
  } catch {}
}
