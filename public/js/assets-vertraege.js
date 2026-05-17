/* ═══════════════════════════════════════════════════════════════════════════
   Assets Vertraege & Kosten — Sub-Tab 2
   Leases, Charges, Expense-Bookings, Allocation-Rules, Meters, Bulk Readings
   Sprint 5.5a-2 Stages c-e
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('alpine:init', () => {

  Alpine.data('vertraegeTab', () => ({
    loaded: false,
    section: 'leases', // leases | expenses | allocation | meters | bulk-readings
    leases: [],
    properties: [],
    costCategories: [],
    filterProperty: '',
    filterStatus: '',
    filterYear: '',
    searchTenant: '',

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      await this.loadData();
    },

    async loadData() {
      const csrf = Alpine.store('csrf');
      try {
        const [leasesRes, propsRes, catsRes] = await Promise.all([
          csrf.fetch('/api/assets/leases'),
          csrf.fetch('/api/assets/properties'),
          csrf.fetch('/api/assets/cost-categories'),
        ]);
        this.leases = leasesRes.ok ? await leasesRes.json() : [];
        this.properties = propsRes.ok ? await propsRes.json() : [];
        this.costCategories = catsRes.ok ? await catsRes.json() : [];
        this.renderContent();
      } catch (e) {
        Alpine.store('toast').error('Fehler: ' + e.message);
      }
    },

    switchSection(s) {
      this.section = s;
      this.$nextTick(() => this.renderContent());
    },

    renderContent() {
      const target = this.$refs.vertraegeContent;
      if (!target) return;

      // Section nav
      let html = `<div class="filters-row" style="margin-bottom:16px">
        <button class="btn ${this.section === 'leases' ? 'btn-primary' : ''}" onclick="vertraegeSwitch('leases')">Mietvertr\u00e4ge</button>
        <button class="btn ${this.section === 'expenses' ? 'btn-primary' : ''}" onclick="vertraegeSwitch('expenses')">Ausgaben</button>
        <button class="btn ${this.section === 'allocation' ? 'btn-primary' : ''}" onclick="vertraegeSwitch('allocation')">Verteilungsschl\u00fcssel</button>
        <button class="btn ${this.section === 'meters' ? 'btn-primary' : ''}" onclick="vertraegeSwitch('meters')">Z\u00e4hler</button>
        <button class="btn ${this.section === 'bulk-readings' ? 'btn-primary' : ''}" onclick="vertraegeSwitch('bulk-readings')">Sammelablesung</button>
      </div>`;

      if (this.section === 'leases') {
        html += this._renderLeases();
      } else if (this.section === 'expenses') {
        html += this._renderExpenses();
      } else if (this.section === 'allocation') {
        html += this._renderAllocation();
      } else if (this.section === 'meters') {
        html += this._renderMeters();
      } else if (this.section === 'bulk-readings') {
        html += this._renderBulkReadings();
      }

      target.innerHTML = html;
    },

    _renderLeases() {
      const leases = this._filteredLeases();
      let html = `
        <div class="filters-row">
          <select class="filter-select" id="vt-filter-prop" onchange="vertraegeFilter()">
            <option value="">Alle Objekte</option>
            ${this.properties.map(p => `<option value="${esc(p.code)}">${esc(p.name || p.code || 'ID ' + p.id)}</option>`).join('')}
          </select>
          <select class="filter-select" id="vt-filter-status" onchange="vertraegeFilter()">
            <option value="">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="ended">Beendet</option>
            <option value="future">Zukuenftig</option>
          </select>
          <input class="search-input" placeholder="Mieter suchen..." id="vt-search-tenant" oninput="vertraegeFilter()">
        </div>
        <div class="card"><table class="assets-table">
        <thead><tr><th>Objekt/Einheit</th><th>Mieter</th><th>Typ</th><th>Status</th><th>Beginn</th><th>Ende</th><th>Auszug</th></tr></thead>
        <tbody>`;

      for (const l of leases) {
        const statusBadge = l.status === 'active' ? '<span class="badge badge-green">Aktiv</span>'
          : l.status === 'ended' ? '<span class="badge badge-muted">Beendet</span>'
          : l.status === 'future' ? '<span class="badge badge-blue">Zukuenftig</span>'
          : `<span class="badge badge-muted">${esc(l.status || '–')}</span>`;
        html += `<tr onclick="assetsOpenLeaseDrawer(${l.id})" style="cursor:pointer">
          <td>${esc(l.property_name || '')} / ${esc(l.unit_label || '')}</td>
          <td>${esc(l.tenant_names || '–')}</td>
          <td>${esc(l.lease_type || '–')}</td>
          <td>${statusBadge}</td>
          <td>${fmtDate(l.start_date)}</td>
          <td>${l.end_date ? fmtDate(l.end_date) : '–'}</td>
          <td>${l.actual_move_out ? fmtDate(l.actual_move_out) : '–'}</td>
        </tr>`;
      }

      html += '</tbody></table></div>';
      return html;
    },

    _filteredLeases() {
      return this.leases;
    },

    _renderExpenses() {
      return `
        <div class="filters-row">
          <select class="filter-select" id="exp-filter-prop" onchange="loadExpenseBookings()">
            <option value="">Objekt waehlen...</option>
            ${this.properties.map(p => `<option value="${esc(p.code)}">${esc(p.name || p.code || 'ID ' + p.id)}</option>`).join('')}
          </select>
          <input class="form-input" type="number" id="exp-filter-year" value="${new Date().getFullYear()}" style="width:100px" onchange="loadExpenseBookings()">
        </div>
        <div id="expense-bookings-list" class="card"><div class="empty">Objekt waehlen</div></div>
      `;
    },

    _renderAllocation() {
      return `
        <div class="filters-row">
          <select class="filter-select" id="alloc-filter-prop" onchange="loadAllocationRules()">
            <option value="">Objekt waehlen...</option>
            ${this.properties.map(p => `<option value="${esc(p.code)}">${esc(p.name || p.code || 'ID ' + p.id)}</option>`).join('')}
          </select>
        </div>
        <div id="allocation-rules-list"><div class="empty">Objekt waehlen</div></div>
      `;
    },

    _renderMeters() {
      return `
        <div class="filters-row">
          <select class="filter-select" id="meters-filter-prop" onchange="loadMeters()">
            <option value="">Objekt waehlen...</option>
            ${this.properties.map(p => `<option value="${esc(p.code)}">${esc(p.name || p.code || 'ID ' + p.id)}</option>`).join('')}
          </select>
          <button class="btn btn-primary" style="font-size:12px" onclick="assetsAddMeter()">+ Zaehler</button>
        </div>
        <div id="meters-list"><div class="empty">Objekt waehlen</div></div>
      `;
    },

    _renderBulkReadings() {
      return `
        <div class="filters-row">
          <select class="filter-select" id="bulk-prop" onchange="loadBulkMeters()">
            <option value="">Objekt waehlen...</option>
            ${this.properties.map(p => `<option value="${esc(p.code)}">${esc(p.name || p.code || 'ID ' + p.id)}</option>`).join('')}
          </select>
          <input class="form-input" type="date" id="bulk-date" value="${new Date().toISOString().slice(0,10)}" style="width:160px">
          <input class="form-input" type="time" id="bulk-time" value="${new Date().toTimeString().slice(0,5)}" style="width:100px">
          <select class="filter-select" id="bulk-type">
            <option value="periodic">Periodisch</option>
            <option value="move_in">Einzug</option>
            <option value="move_out">Auszug</option>
            <option value="meter_reset">Zaehlerreset</option>
          </select>
        </div>
        <div id="bulk-readings-form"><div class="empty">Objekt waehlen</div></div>
      `;
    },
  }));
});

// ── Global helpers for Vertraege tab ────────────────────────────────────────

function vertraegeSwitch(section) {
  const tabEl = document.querySelector('[x-data="vertraegeTab"]');
  if (tabEl) {
    const d = Alpine.$data(tabEl);
    d.section = section;
    d.$nextTick(() => d.renderContent());
  }
}

function vertraegeFilter() {
  // Future: implement client-side filtering
}

async function assetsOpenLeaseDrawer(leaseId) {
  const csrf = Alpine.store('csrf');
  try {
    const [leaseRes, chargesRes] = await Promise.all([
      csrf.fetch(`/api/assets/leases/${leaseId}`),
      csrf.fetch(`/api/assets/leases/${leaseId}/charges`),
    ]);
    const lease = await leaseRes.json();
    const charges = chargesRes.ok ? await chargesRes.json() : [];

    const statusBadge = lease.status === 'active' ? '<span class="badge badge-green">Aktiv</span>'
      : lease.status === 'ended' ? '<span class="badge badge-muted">Beendet</span>'
      : `<span class="badge badge-blue">${esc(lease.status || '–')}</span>`;

    let html = `
      <div class="drawer-header">
        <h3>Mietvertrag #${lease.id} ${statusBadge}</h3>
        <button class="drawer-close" onclick="closeDrawer()">✕</button>
      </div>

      <div class="drawer-section">
        <h4>Vertragsdaten</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vertragstyp</label>
            <select class="form-select" id="ld-type">
              <option value="residential_permanent" ${lease.lease_type === 'residential_permanent' ? 'selected' : ''}>Wohnung unbefristet</option>
              <option value="residential_temporary" ${lease.lease_type === 'residential_temporary' ? 'selected' : ''}>Wohnung befristet</option>
              <option value="commercial" ${lease.lease_type === 'commercial' ? 'selected' : ''}>Gewerbe</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <input class="form-input" value="${esc(lease.status || '')}" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Beginn</label>
            <input class="form-input" type="date" id="ld-start" value="${lease.start_date || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Ende</label>
            <input class="form-input" type="date" id="ld-end" value="${lease.end_date || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tatsaechlicher Auszug</label>
            <input class="form-input" type="date" id="ld-moveout" value="${lease.actual_move_out || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Zahlungsweise</label>
            <select class="form-select" id="ld-payment">
              <option value="bank_transfer" ${lease.payment_method === 'bank_transfer' ? 'selected' : ''}>Ueberweisung</option>
              <option value="direct_debit" ${lease.payment_method === 'direct_debit' ? 'selected' : ''}>Lastschrift</option>
            </select>
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="assetsSaveLease(${lease.id})">Speichern</button>
        </div>
      </div>

      <!-- Charges -->
      <div class="drawer-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h4 style="margin-bottom:0">Mietbestandteile</h4>
          <button class="btn btn-primary" style="font-size:12px" onclick="assetsAddCharge(${lease.id})">+ Posten</button>
        </div>
        <table class="assets-table">
          <thead><tr><th>Typ</th><th>Betrag</th><th>Gueltig ab</th><th>Gueltig bis</th></tr></thead>
          <tbody>`;

    for (const ch of charges) {
      html += `<tr>
        <td>${esc(ch.charge_type || '')}</td>
        <td title="Monatsbetrag">${fmtEur(ch.amount)}</td>
        <td>${fmtDate(ch.valid_from)}</td>
        <td>${ch.valid_until ? fmtDate(ch.valid_until) : '–'}</td>
      </tr>`;
    }

    html += `</tbody></table></div>

      <!-- Actions -->
      <div class="drawer-section">
        <h4>Aktionen</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${lease.status === 'active' && !lease.end_date ? `<button class="btn btn-primary" onclick="assetsEndLease(${lease.id})">Vertragsende eintragen</button>` : ''}
          ${lease.end_date && lease.status === 'active' ? `<button class="btn" onclick="assetsRevokeEndLease(${lease.id})">Vertragsende zuruecknehmen</button>` : ''}
          ${lease.status === 'active' && !lease.actual_move_out ? `<button class="btn btn-primary" onclick="assetsMoveOut(${lease.id})">Tatsaechlichen Auszug eintragen</button>` : ''}
        </div>
      </div>
    `;

    openDrawer(html);
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
  }
}

async function assetsSaveLease(leaseId) {
  try {
    const body = {
      lease_type: document.getElementById('ld-type').value,
      start_date: document.getElementById('ld-start').value || null,
      end_date: document.getElementById('ld-end').value || null,
      payment_method: document.getElementById('ld-payment').value,
    };
    await approvalMutation('leases.update', 'PATCH', { lease_id: leaseId }, body);
    closeDrawer();
  } catch (e) {}
}

async function assetsEndLease(leaseId) {
  openModal(`
    <h3>Vertragsende eintragen</h3>
    <div class="form-group">
      <label class="form-label">Enddatum</label>
      <input class="form-input" type="date" id="le-end-date">
    </div>
    <div class="form-group">
      <label class="form-label">Kuendigungsgrund</label>
      <select class="form-select" id="le-reason">
        <option value="tenant_notice">Kuendigung Mieter</option>
        <option value="landlord_notice">Kuendigung Vermieter</option>
        <option value="mutual_agreement">Aufhebungsvertrag</option>
        <option value="expiry">Befristungsablauf</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsConfirmEndLease(${leaseId})">Bestaetigen</button>
    </div>
  `);
}

async function assetsConfirmEndLease(leaseId) {
  try {
    await approvalMutation('leases.end', 'POST', { lease_id: leaseId }, {
      end_date: document.getElementById('le-end-date').value,
      termination_reason: document.getElementById('le-reason').value,
    });
    closeModal();
    closeDrawer();
    Alpine.store('toast').success('Vertragsende eingetragen');
  } catch (e) {}
}

async function assetsRevokeEndLease(leaseId) {
  if (!confirm('Vertragsende wirklich zuruecknehmen?')) return;
  try {
    await approvalMutation('leases.revoke-end', 'POST', { lease_id: leaseId }, {});
    closeDrawer();
    Alpine.store('toast').success('Vertragsende zurueckgenommen');
  } catch (e) {}
}

async function assetsMoveOut(leaseId) {
  openModal(`
    <h3>Tatsaechlichen Auszug eintragen</h3>
    <div class="form-group">
      <label class="form-label">Auszugsdatum</label>
      <input class="form-input" type="date" id="le-moveout-date">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsConfirmMoveOut(${leaseId})">Bestaetigen</button>
    </div>
  `);
}

async function assetsConfirmMoveOut(leaseId) {
  try {
    await approvalMutation('leases.move-out', 'POST', { lease_id: leaseId }, {
      actual_move_out: document.getElementById('le-moveout-date').value,
    });
    closeModal();
    closeDrawer();
    Alpine.store('toast').success('Auszug eingetragen');
  } catch (e) {}
}

async function assetsAddCharge(leaseId) {
  openModal(`
    <h3>Mietbestandteil hinzufuegen</h3>
    <div class="form-group">
      <label class="form-label">Typ</label>
      <select class="form-select" id="ac-type">
        <option value="kaltmiete">Kaltmiete</option>
        <option value="nk_vorauszahlung">NK-Vorauszahlung</option>
        <option value="heizkosten_vorauszahlung">Heizkosten-Vorauszahlung</option>
        <option value="kaution">Kaution</option>
        <option value="sonstige">Sonstige</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Monatsbetrag (EUR)</label>
      <input class="form-input" type="number" step="0.01" id="ac-amount">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Gueltig ab</label>
        <input class="form-input" type="date" id="ac-from">
      </div>
      <div class="form-group">
        <label class="form-label">Gueltig bis (leer = offen)</label>
        <input class="form-input" type="date" id="ac-until">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveCharge(${leaseId})">Anlegen</button>
    </div>
  `);
}

async function assetsSaveCharge(leaseId) {
  try {
    const body = {
      lease_id: leaseId,
      charge_type: document.getElementById('ac-type').value,
      amount: Number(document.getElementById('ac-amount').value) || 0,
      valid_from: document.getElementById('ac-from').value || null,
      valid_until: document.getElementById('ac-until').value || null,
    };
    await approvalMutation('lease-charges.create', 'POST', { lease_id: leaseId }, body);
    closeModal();
    assetsOpenLeaseDrawer(leaseId);
  } catch (e) {}
}

// ── Expense Bookings ────────────────────────────────────────────────────────

async function loadExpenseBookings() {
  const propCode = document.getElementById('exp-filter-prop')?.value;
  const year = document.getElementById('exp-filter-year')?.value;
  const target = document.getElementById('expense-bookings-list');
  if (!propCode || !target) return;

  target.innerHTML = '<div class="spinner">Laden...</div>';
  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/properties/${propCode}/expense-bookings${year ? '?year=' + year : ''}`);
    const bookings = res.ok ? await res.json() : [];

    if (!bookings.length) {
      target.innerHTML = '<div class="empty">Keine Ausgaben fuer diesen Zeitraum</div>';
      return;
    }

    let html = `<table class="assets-table">
      <thead><tr><th>Kostenkategorie</th><th>Betrag</th><th>Leistungszeitraum</th><th>Umlagefaehig</th><th>Typ</th><th></th></tr></thead>
      <tbody>`;

    for (const b of bookings) {
      html += `<tr>
        <td>${esc(b.cost_category_name || b.cost_category_id || '')}</td>
        <td>${fmtEur(b.amount)}</td>
        <td>${fmtDate(b.service_start)} – ${fmtDate(b.service_end)}</td>
        <td>${b.umlagefaehig ? '<span class="badge badge-green">Ja</span>' : '<span class="badge badge-muted">Nein</span>'}</td>
        <td>${esc(b.maintenance_vs_operating || '–')}</td>
        <td><button class="btn" style="font-size:11px;padding:2px 6px" onclick="assetsEditExpense(${b.id})">Bearbeiten</button></td>
      </tr>`;
    }

    html += '</tbody></table>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

async function assetsEditExpense(bookingId) {
  const csrf = Alpine.store('csrf');
  const propCode = document.getElementById('exp-filter-prop')?.value;
  if (!propCode) { Alpine.store('toast').error('Kein Objekt'); return; }
  const res = await csrf.fetch(`/api/assets/properties/${propCode}/expense-bookings/${bookingId}`);
  const b = await res.json();

  openModal(`
    <h3>Ausgabe bearbeiten</h3>
    <div class="form-group">
      <label class="form-label">Betrag (EUR)</label>
      <input class="form-input" type="number" step="0.01" id="eb-amount" value="${b.amount || ''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Leistung von</label>
        <input class="form-input" type="date" id="eb-start" value="${b.service_start || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Leistung bis</label>
        <input class="form-input" type="date" id="eb-end" value="${b.service_end || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-checkbox">
        <input type="checkbox" id="eb-umlage" ${b.umlagefaehig ? 'checked' : ''}>
        Umlagefaehig
      </label>
      <div class="form-hint">Auf Mieter umlegbare Kosten gem. BetrkV</div>
    </div>
    <div class="form-group">
      <label class="form-label">Instandhaltung / Betrieb</label>
      <select class="form-select" id="eb-mvo">
        <option value="operating" ${b.maintenance_vs_operating === 'operating' ? 'selected' : ''}>Betriebskosten</option>
        <option value="maintenance" ${b.maintenance_vs_operating === 'maintenance' ? 'selected' : ''}>Instandhaltung</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveExpense(${bookingId})">Speichern</button>
    </div>
  `);
}

async function assetsSaveExpense(bookingId) {
  try {
    const body = {
      amount: Number(document.getElementById('eb-amount').value) || 0,
      service_start: document.getElementById('eb-start').value || null,
      service_end: document.getElementById('eb-end').value || null,
      umlagefaehig: document.getElementById('eb-umlage').checked,
      maintenance_vs_operating: document.getElementById('eb-mvo').value,
    };
    const propCode = document.getElementById('exp-filter-prop')?.value;
    await approvalMutation('expense-bookings.update', 'PATCH', { property_code: propCode, booking_id: bookingId }, body);
    closeModal();
    loadExpenseBookings();
  } catch (e) {}
}

// ── Allocation Rules ────────────────────────────────────────────────────────

async function loadAllocationRules() {
  const propCode = document.getElementById('alloc-filter-prop')?.value;
  const target = document.getElementById('allocation-rules-list');
  if (!propCode || !target) return;

  target.innerHTML = '<div class="spinner">Laden...</div>';
  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/properties/${propCode}/allocation-rules`);
    const rules = res.ok ? await res.json() : [];

    if (!rules.length) {
      target.innerHTML = '<div class="empty">Keine Verteilungsschluessel</div>';
      return;
    }

    let html = '';
    for (const r of rules) {
      const isHeating = r.cost_category_code && ['heizung', 'warmwasser', 'heating', 'warm_water'].includes(r.cost_category_code.toLowerCase());
      html += `<div class="card card-pad" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>${esc(r.cost_category_name || r.cost_category_id || '–')}</strong>
          <span class="badge badge-blue">${esc(r.key_type || '–')}</span>
        </div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px">
          Gueltig ab: ${fmtDate(r.valid_from)}
        </div>`;

      if (isHeating) {
        const consumption = r.consumption_share_percent || 0;
        const base = 100 - consumption;
        html += `<div style="margin-bottom:8px">
          <label class="form-label">Verbrauchsanteil: ${consumption}%</label>
          <input type="range" class="range-slider" min="50" max="70" value="${consumption}"
            oninput="this.previousElementSibling.textContent='Verbrauchsanteil: '+this.value+'%'" data-rule-id="${r.id}">
          <div class="form-hint">Grundanteil: ${base}% (nach HeizkostenV: 50-70% Verbrauch)</div>
        </div>`;
      }

      // Shares for fixed/mea
      if (r.key_type === 'mea' || r.key_type === 'fixed') {
        html += `<div style="margin-top:8px"><button class="btn" style="font-size:12px" onclick="loadAllocationShares(${r.id})">Anteile anzeigen</button></div>`;
      }

      html += `<div style="margin-top:8px;display:flex;gap:8px">
        <button class="btn btn-primary" style="font-size:12px" onclick="assetsSaveRule(${r.id})">Speichern</button>
      </div></div>`;
    }

    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

async function loadAllocationShares(ruleId) {
  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/allocation-rules/${ruleId}/shares`);
    const shares = res.ok ? await res.json() : [];
    let html = '<div style="margin-top:8px"><table class="assets-table"><thead><tr><th>Einheit</th><th>Anteil</th></tr></thead><tbody>';
    for (const s of shares) {
      html += `<tr><td>${esc(s.unit_label || s.unit_id || '')}</td><td>${s.share_value || 0}</td></tr>`;
    }
    html += '</tbody></table></div>';
    Alpine.store('toast').info('Anteile geladen');
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
  }
}

async function assetsSaveRule(ruleId) {
  const slider = document.querySelector(`[data-rule-id="${ruleId}"]`);
  if (slider) {
    try {
      await approvalMutation('allocation-rules.update', 'PATCH', { rule_id: ruleId }, {
        consumption_share_percent: Number(slider.value),
      });
    } catch (e) {}
  }
}

// ── Meters ──────────────────────────────────────────────────────────────────

async function loadMeters() {
  const propCode = document.getElementById('meters-filter-prop')?.value;
  const target = document.getElementById('meters-list');
  if (!propCode || !target) return;

  target.innerHTML = '<div class="spinner">Laden...</div>';
  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/properties/${propCode}/meters`);
    const meters = res.ok ? await res.json() : [];

    if (!meters.length) {
      target.innerHTML = '<div class="empty">Keine Zaehler</div>';
      return;
    }

    let html = `<div class="card"><table class="assets-table">
      <thead><tr><th>Nummer</th><th>Medium</th><th>Zweck</th><th>Bereich</th><th>Hauptzaehler</th><th>Eichung bis</th><th>Eingebaut</th></tr></thead>
      <tbody>`;

    for (const m of meters) {
      const now = new Date();
      const calibDate = m.calibration_valid_until ? new Date(m.calibration_valid_until) : null;
      let calibBadge = '–';
      if (calibDate) {
        const daysLeft = Math.floor((calibDate - now) / 86400000);
        if (daysLeft < 0) calibBadge = `<span class="badge badge-red">Abgelaufen</span>`;
        else if (daysLeft < 90) calibBadge = `<span class="badge badge-yellow">${fmtDate(m.calibration_valid_until)}</span>`;
        else calibBadge = `<span class="badge badge-green">${fmtDate(m.calibration_valid_until)}</span>`;
      }

      html += `<tr>
        <td><strong>${esc(m.meter_number || '')}</strong></td>
        <td>${esc(m.medium || '')}</td>
        <td>${esc(m.submetering_purpose || '–')}</td>
        <td>${esc(m.scope_type || '')} ${m.unit_label ? '(' + esc(m.unit_label) + ')' : ''}</td>
        <td>${m.is_main_meter ? '<span class="badge badge-blue">Ja</span>' : '–'}</td>
        <td>${calibBadge}</td>
        <td>${fmtDate(m.installed_at)}</td>
      </tr>`;
    }

    html += '</tbody></table></div>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

async function assetsAddMeter() {
  const propCode = document.getElementById('meters-filter-prop')?.value;
  if (!propCode) { Alpine.store('toast').error('Bitte erst ein Objekt waehlen'); return; }

  // Load units for this property
  const csrf = Alpine.store('csrf');
  const unitsRes = await csrf.fetch(`/api/assets/properties/${propCode}/units`);
  const units = unitsRes.ok ? await unitsRes.json() : [];
  const unitOpts = units.map(u => `<option value="${u.id}">${esc(u.label || 'ID ' + u.id)}</option>`).join('');

  openModal(`
    <h3>Zaehler hinzufuegen</h3>
    <div class="form-group">
      <label class="form-label">Zaehlernummer</label>
      <input class="form-input" id="nm-number">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Medium</label>
        <select class="form-select" id="nm-medium" onchange="assetsCheckSubmeteringRequired()">
          <option value="cold_water">Kaltwasser</option>
          <option value="warm_water">Warmwasser</option>
          <option value="heat">Waerme</option>
          <option value="electricity">Strom</option>
          <option value="gas">Gas</option>
        </select>
      </div>
      <div class="form-group" id="nm-purpose-group" style="display:none">
        <label class="form-label">Erfassungszweck</label>
        <select class="form-select" id="nm-purpose">
          <option value="space_heating_heat">Raumwaerme</option>
          <option value="warm_water_heat">Warmwasser (Waerme)</option>
          <option value="warm_water_volume">Warmwasser (Volumen)</option>
          <option value="main_heat">Hauptwaerme</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Bereich</label>
        <select class="form-select" id="nm-scope">
          <option value="unit">Einheit</option>
          <option value="property">Gebaeude</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Einheit</label>
        <select class="form-select" id="nm-unit">
          <option value="">– (bei Gebaeuezaehler)</option>
          ${unitOpts}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-checkbox">
        <input type="checkbox" id="nm-main">
        Hauptzaehler
      </label>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Eingebaut am</label>
        <input class="form-input" type="date" id="nm-installed">
      </div>
      <div class="form-group">
        <label class="form-label">Eichung gueltig bis</label>
        <input class="form-input" type="date" id="nm-calibration">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveNewMeter('${propCode}')">Anlegen</button>
    </div>
  `);
  assetsCheckSubmeteringRequired();
}

function assetsCheckSubmeteringRequired() {
  const medium = document.getElementById('nm-medium')?.value;
  const purposeGroup = document.getElementById('nm-purpose-group');
  if (purposeGroup) {
    purposeGroup.style.display = ['heat', 'warm_water'].includes(medium) ? '' : 'none';
  }
}

async function assetsSaveNewMeter(propertyCode) {
  try {
    const medium = document.getElementById('nm-medium').value;
    const body = {
      meter_number: document.getElementById('nm-number').value.trim(),
      medium: medium,
      scope_type: document.getElementById('nm-scope').value,
      unit_id: document.getElementById('nm-unit').value ? Number(document.getElementById('nm-unit').value) : null,
      is_main_meter: document.getElementById('nm-main').checked,
      installed_at: document.getElementById('nm-installed').value || null,
      calibration_valid_until: document.getElementById('nm-calibration').value || null,
    };
    if (['heat', 'warm_water'].includes(medium)) {
      body.submetering_purpose = document.getElementById('nm-purpose').value;
    }
    if (!body.meter_number) { Alpine.store('toast').error('Zaehlernummer ist Pflicht'); return; }
    await approvalMutation('meters.create', 'POST', { property_code: propertyCode }, body);
    closeModal();
    loadMeters();
  } catch (e) {}
}

// ── Bulk Meter Readings ─────────────────────────────────────────────────────

let _bulkMetersCache = [];

async function loadBulkMeters() {
  const propCode = document.getElementById('bulk-prop')?.value;
  const target = document.getElementById('bulk-readings-form');
  if (!propCode || !target) return;

  target.innerHTML = '<div class="spinner">Laden...</div>';
  const csrf = Alpine.store('csrf');
  try {
    const metersRes = await csrf.fetch(`/api/assets/properties/${propCode}/meters?active=true`);
    const meters = metersRes.ok ? await metersRes.json() : [];
    _bulkMetersCache = meters;

    // Fetch latest reading per meter (parallel, nested per-meter endpoint)
    const readingsByMeter = {};
    await Promise.all(meters.map(async (m) => {
      try {
        const rRes = await csrf.fetch(`/api/assets/meters/${m.id}/readings`);
        const rArr = rRes.ok ? await rRes.json() : [];
        // Pick latest by reading_at
        let latest = null;
        for (const r of rArr) {
          if (!latest || new Date(r.reading_at) > new Date(latest.reading_at)) {
            latest = r;
          }
        }
        if (latest) readingsByMeter[m.id] = latest;
      } catch {}
    }));

    let html = `<div class="card"><table class="assets-table" id="bulk-table">
      <thead><tr>
        <th>Zaehler</th><th>Medium</th><th>Einheit</th><th>Letzter Stand</th>
        <th>Neuer Wert</th><th>Diff</th><th>Geschaetzt</th><th>Notizen</th>
      </tr></thead><tbody>`;

    for (const m of meters) {
      const last = readingsByMeter[m.id];
      const lastVal = last ? last.value : null;
      const calibExpired = m.calibration_valid_until && new Date(m.calibration_valid_until) < new Date();
      html += `<tr data-meter-id="${m.id}">
        <td><strong>${esc(m.meter_number || '')}</strong>${calibExpired ? '<br><span class="badge badge-red" style="font-size:10px">Eichung abgelaufen</span>' : ''}</td>
        <td>${esc(m.medium || '')}</td>
        <td>${esc(m.unit_label || '–')}</td>
        <td>${lastVal != null ? lastVal : '–'}</td>
        <td><input class="form-input" type="number" step="0.001" data-last="${lastVal}" placeholder="" style="width:120px" oninput="bulkCalcDiff(this, ${lastVal})"></td>
        <td class="bulk-diff">–</td>
        <td>
          <label class="form-checkbox" style="font-size:12px">
            <input type="checkbox" class="bulk-estimated">
          </label>
        </td>
        <td><input class="form-input" style="width:100px;font-size:12px" placeholder="" class="bulk-notes"></td>
      </tr>`;
    }

    html += `</tbody></table>
      <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px">
        <span id="bulk-count" style="color:var(--muted);font-size:13px;align-self:center">0 Ablesungen</span>
        <button class="btn btn-primary" onclick="submitBulkReadings()">Sammelablesung speichern</button>
      </div>
    </div>`;

    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

function bulkCalcDiff(input, lastVal) {
  const row = input.closest('tr');
  const diffCell = row.querySelector('.bulk-diff');
  const newVal = input.value ? Number(input.value) : null;

  if (newVal != null && lastVal != null) {
    const diff = newVal - lastVal;
    diffCell.textContent = diff.toFixed(3);
    if (diff < 0) {
      const estimated = row.querySelector('.bulk-estimated');
      const readingType = document.getElementById('bulk-type')?.value;
      if (!estimated?.checked && readingType !== 'meter_reset') {
        diffCell.innerHTML = `<span style="color:var(--red)">${diff.toFixed(3)}</span><br><span style="color:var(--red);font-size:10px">Ruecklaeufig!</span>`;
      }
    }
  } else {
    diffCell.textContent = '–';
  }

  // Update count
  const inputs = document.querySelectorAll('#bulk-table tbody input[type="number"]');
  let count = 0;
  inputs.forEach(i => { if (i.value) count++; });
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = count + ' Ablesungen';
}

async function submitBulkReadings() {
  const date = document.getElementById('bulk-date')?.value;
  const time = document.getElementById('bulk-time')?.value || '00:00';
  const readingType = document.getElementById('bulk-type')?.value || 'periodic';
  const readingAt = date ? `${date}T${time}:00` : new Date().toISOString();

  const rows = document.querySelectorAll('#bulk-table tbody tr');
  const readings = [];

  rows.forEach(row => {
    const meterId = Number(row.dataset.meterId);
    const valueInput = row.querySelector('input[type="number"]');
    const estimatedCheck = row.querySelector('.bulk-estimated');
    const notesInput = row.querySelector('.bulk-notes');

    if (valueInput && valueInput.value) {
      readings.push({
        meter_id: meterId,
        value: Number(valueInput.value),
        reading_at: readingAt,
        reading_type: readingType,
        is_estimated: estimatedCheck?.checked || false,
        notes: notesInput?.value?.trim() || null,
      });
    }
  });

  if (!readings.length) {
    Alpine.store('toast').error('Keine Ablesungen eingetragen');
    return;
  }

  try {
    // Group readings by meter_id for per-meter bulk submission
    const grouped = {};
    for (const r of readings) {
      (grouped[r.meter_id] ||= []).push(r);
    }

    const csrf = Alpine.store('csrf');
    let totalSaved = 0;

    for (const [meterId, meterReadings] of Object.entries(grouped)) {
      const res = await csrf.fetch(`/api/assets/meters/${meterId}/readings/bulk`, {
        method: 'POST',
        body: JSON.stringify({ readings: meterReadings }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { ...err, failed_meter_id: Number(meterId) };
      }
      const result = await res.json();
      totalSaved += result.created?.length || meterReadings.length;
    }

    Alpine.store('toast').success(`${totalSaved} Ablesungen gespeichert`);
    loadBulkMeters();
  } catch (e) {
    // Handle bulk error with failed_meter_id
    handleBulkError(e);
  }
}

function handleBulkError(error) {
  const body = error?.response || error;
  const failedMeterId = body?.failed_meter_id;

  if (failedMeterId) {
    const row = document.querySelector(`tr[data-meter-id="${failedMeterId}"]`);
    if (row) {
      row.classList.add('error-highlight');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add inline error
      const td = row.querySelector('td:last-child');
      if (td) {
        const errDiv = document.createElement('div');
        errDiv.className = 'inline-error';
        errDiv.textContent = body?.error?.message || body?.message || 'Fehler bei diesem Zaehler';
        td.appendChild(errDiv);
      }
      return;
    }
  }

  // Fallback: global toast
  Alpine.store('toast').error('Fehler bei Sammelablesung: ' + (body?.error?.message || body?.message || 'Unbekannter Fehler'));
}
