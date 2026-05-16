/* ═══════════════════════════════════════════════════════════════════════════
   Assets Stammdaten — Sub-Tab 1: Properties, Units, Tenants, Heating-Config
   Sprint 5.5a-2 Stage b
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('alpine:init', () => {

  // ── Stammdaten Tab Container ────────────────────────────────────────────

  Alpine.data('stammdatenTab', () => ({
    loaded: false,
    properties: [],
    tenants: [],
    view: 'properties', // properties | tenants
    selectedProperty: null,
    selectedUnit: null,

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      await this.loadProperties();
    },

    async loadProperties() {
      try {
        const csrf = Alpine.store('csrf');
        const res = await csrf.fetch('/api/assets/properties');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.properties = await res.json();
        this.renderPropertiesList();
      } catch (e) {
        Alpine.store('toast').error('Fehler beim Laden: ' + e.message);
      }
    },

    async loadTenants() {
      try {
        const csrf = Alpine.store('csrf');
        const res = await csrf.fetch('/api/assets/tenants');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.tenants = await res.json();
        this.renderTenantsList();
      } catch (e) {
        Alpine.store('toast').error('Fehler beim Laden: ' + e.message);
      }
    },

    renderPropertiesList() {
      const target = this.$refs.stammdatenContent;
      if (!target) return;
      const props = this.properties;

      let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.view='properties';document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.renderPropertiesList()">Objekte</button>
            <button class="btn" onclick="document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.view='tenants';document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.loadTenants()">Mieter</button>
          </div>
          <button class="btn btn-primary" style="font-size:12px" onclick="assetsAddProperty()">+ Objekt</button>
        </div>
      `;

      if (!props.length) {
        html += '<div class="empty">Keine Objekte vorhanden.</div>';
        target.innerHTML = html;
        return;
      }

      html += '<div class="properties-grid">';
      for (const p of props) {
        const isEnded = p.ownership_end != null;
        const unitCount = p.unit_count || 0;
        html += `
          <div class="property-card ${isEnded ? 'ownership-ended' : ''}" style="padding:0;overflow:hidden;border-radius:var(--r)" onclick="assetsOpenPropertyDrawer('${esc(p.code)}')">
            ${entityImgHtml('property', p.code, 'entity-img-wrap')}
            <div style="padding:16px">
            <div class="property-card-header">
              <span style="font-size:24px">${p.property_type === 'residential' ? '🏠' : '🏭'}</span>
              <div>
                <h4>${esc(p.name || p.code || 'Objekt ' + p.id)}</h4>
                <span style="color:var(--muted);font-size:12px">${esc(p.code || '')}</span>
              </div>
            </div>
            <div class="property-card-meta">
              <span class="label">Adresse</span>
              <span>${esc((p.street || '') + ', ' + (p.postal_code || '') + ' ' + (p.city || ''))}</span>
              <span class="label">Typ</span>
              <span>${p.property_type === 'residential' ? 'Wohngebaeude' : p.property_type === 'commercial' ? 'Gewerbe' : esc(p.property_type || '–')}</span>
              <span class="label">Eigentuemer</span>
              <span>${p.owner === 'personal' ? 'Privat' : p.owner === 'laperlgmbh' ? 'Laperl GmbH' : esc(p.owner || '–')}</span>
              <span class="label">Einheiten</span>
              <span>${unitCount}</span>
              ${isEnded ? '<span class="label">Eigentum bis</span><span>' + fmtDate(p.ownership_end) + '</span>' : ''}
            </div>
            </div>
          </div>
        `;
      }
      html += '</div>';
      target.innerHTML = html;
    },

    renderTenantsList() {
      const target = this.$refs.stammdatenContent;
      if (!target) return;
      const tenants = this.tenants;

      let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="display:flex;gap:8px">
            <button class="btn" onclick="document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.view='properties';document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.renderPropertiesList()">Objekte</button>
            <button class="btn btn-primary" onclick="document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.view='tenants';document.querySelector('[x-data=\\'stammdatenTab\\']').__x.$data.loadTenants()">Mieter</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" class="search-input" placeholder="Mieter suchen..." id="tenantSearch" oninput="assetsFilterTenants(this.value)">
            <button class="btn btn-primary" style="font-size:12px;white-space:nowrap" onclick="assetsAddTenant()">+ Mieter</button>
          </div>
        </div>
      `;

      if (!tenants.length) {
        html += '<div class="empty">Keine Mieter vorhanden.</div>';
        target.innerHTML = html;
        return;
      }

      html += `<div class="card"><table class="assets-table">
        <thead><tr>
          <th>Name / Firma</th>
          <th>Kontakt</th>
          <th>IBAN</th>
          <th>Aktive Vertraege</th>
        </tr></thead>
        <tbody id="tenants-tbody">`;

      for (const t of tenants) {
        const ibanMasked = t.iban ? '***' + t.iban.slice(-4) : '–';
        html += `<tr class="tenant-row" onclick="assetsOpenTenantDrawer(${t.id})" data-search="${esc((t.name || '') + ' ' + (t.company || '') + ' ' + (t.email || '')).toLowerCase()}">
          <td><strong>${esc(t.name || '')}</strong>${t.company ? '<br><span style="color:var(--muted);font-size:12px">' + esc(t.company) + '</span>' : ''}</td>
          <td>${esc(t.email || '–')}<br><span style="color:var(--muted);font-size:12px">${esc(t.phone || '')}</span></td>
          <td><span class="iban-masked">${ibanMasked}</span> ${t.iban ? '<button class="iban-reveal" onclick="event.stopPropagation();assetsRevealIban(this,\'' + esc(t.iban) + '\')">Anzeigen</button>' : ''}</td>
          <td>${t.active_lease_count || 0}</td>
        </tr>`;
      }

      html += '</tbody></table></div>';
      target.innerHTML = html;
    },
  }));
});

// ── Global helper functions for Stammdaten ──────────────────────────────────

function assetsFilterTenants(query) {
  const rows = document.querySelectorAll('.tenant-row');
  const q = query.toLowerCase();
  rows.forEach(row => {
    const searchText = row.dataset.search || '';
    row.style.display = searchText.includes(q) ? '' : 'none';
  });
}

function assetsRevealIban(btn, iban) {
  const span = btn.previousElementSibling;
  if (!span) return;
  span.textContent = iban;
  btn.textContent = '';
  btn.disabled = true;
  setTimeout(() => {
    span.textContent = '***' + iban.slice(-4);
    btn.textContent = 'Anzeigen';
    btn.disabled = false;
  }, 10000);
}

async function assetsOpenPropertyDrawer(propertyCode) {
  const csrf = Alpine.store('csrf');
  try {
    const [propRes, unitsRes, hcRes] = await Promise.all([
      csrf.fetch(`/api/assets/properties/${propertyCode}`),
      csrf.fetch(`/api/assets/properties/${propertyCode}/units`),
      csrf.fetch(`/api/assets/properties/${propertyCode}/heating-config`),
    ]);
    const prop = await propRes.json();
    const units = await unitsRes.json();
    const heatingConfig = hcRes.ok ? await hcRes.json() : null;

    let html = `
      <div class="drawer-header">
        <h3>${esc(prop.name || prop.code || 'Objekt ' + prop.id)}</h3>
        <button class="drawer-close" onclick="closeDrawer()">✕</button>
      </div>

      ${entityImgHtml('property', prop.code, 'detail-img-wrap')}

      <!-- Property Edit Form -->
      <div class="drawer-section">
        <h4>Objektdaten</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Strasse</label>
            <input class="form-input" id="pd-street" value="${esc(prop.street || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">PLZ</label>
            <input class="form-input" id="pd-postal" value="${esc(prop.postal_code || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Stadt</label>
            <input class="form-input" id="pd-city" value="${esc(prop.city || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Objekttyp</label>
            <select class="form-select" id="pd-type">
              <option value="residential" ${prop.property_type === 'residential' ? 'selected' : ''}>Wohngebaeude</option>
              <option value="commercial" ${prop.property_type === 'commercial' ? 'selected' : ''}>Gewerbe</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Eigentuemer</label>
            <select class="form-select" id="pd-owner">
              <option value="personal" ${prop.owner === 'personal' ? 'selected' : ''}>Privat</option>
              <option value="laperlgmbh" ${prop.owner === 'laperlgmbh' ? 'selected' : ''}>Laperl GmbH</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Wohnflaeche (qm)</label>
            <input class="form-input" type="number" id="pd-area" value="${prop.total_living_area_qm || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Eigentum ab</label>
            <input class="form-input" type="date" id="pd-own-start" value="${prop.ownership_start || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Eigentum bis</label>
            <input class="form-input" type="date" id="pd-own-end" value="${prop.ownership_end || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Heizungstyp</label>
            <input class="form-input" id="pd-heating" value="${esc(prop.heating_type || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Abrechnungsmonat Start</label>
            <input class="form-input" type="number" min="1" max="12" id="pd-billing-month" value="${prop.billing_period_start_month || 1}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" id="pd-co2" ${prop.co2_cost_relevant ? 'checked' : ''}>
            CO2-Kosten relevant
          </label>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="assetsSaveProperty('${esc(prop.code)}')">Speichern</button>
        </div>
      </div>

      <!-- Heating Config -->
      <div class="drawer-section">
        <h4>Heizungskonfiguration</h4>
        <div class="form-group">
          <label class="form-label">Warmwasser-Methode</label>
          <select class="form-select" id="pd-ww-method" onchange="assetsCheckHeatingConflict()">
            <option value="A_volume_meter" ${heatingConfig?.warmwater_method === 'A_volume_meter' ? 'selected' : ''}>A: Volumenzaehler</option>
            <option value="B_heat_meter" ${heatingConfig?.warmwater_method === 'B_heat_meter' ? 'selected' : ''}>B: Waermezaehler</option>
            <option value="shared_no_separation" ${heatingConfig?.warmwater_method === 'shared_no_separation' ? 'selected' : ''}>Keine Trennung</option>
          </select>
        </div>
        <div class="form-group" id="pd-ww-temp-group" style="${heatingConfig?.warmwater_method === 'A_volume_meter' ? '' : 'display:none'}">
          <label class="form-label">Warmwasser-Temperatur (C)</label>
          <input class="form-input" type="number" id="pd-ww-temp" value="${heatingConfig?.warmwater_temp_celsius || 60}" min="40" max="90">
        </div>
        <div class="form-group">
          <label class="form-checkbox">
            <input type="checkbox" id="pd-combined" ${heatingConfig?.has_combined_heating_ww ? 'checked' : ''} onchange="assetsCheckHeatingConflict()">
            Kombinierte Heizung/Warmwasser
          </label>
        </div>
        <div id="pd-hc-conflict" class="alert alert-error" style="display:none">
          Konflikt: "Keine Trennung" kann nicht mit "Kombinierte Heizung/WW" kombiniert werden.
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" id="pd-hc-save" onclick="assetsSaveHeatingConfig('${esc(prop.code)}')">Heizung speichern</button>
        </div>
      </div>

      <!-- Units List -->
      <div class="drawer-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h4 style="margin-bottom:0">Einheiten (${units.length})</h4>
          <button class="btn btn-primary" style="font-size:12px" onclick="assetsAddUnit('${esc(prop.code)}')">+ Einheit</button>
        </div>
        <table class="assets-table">
          <thead><tr><th>Bezeichnung</th><th>Etage</th><th>Flaeche</th><th>Status</th><th></th></tr></thead>
          <tbody>
    `;

    for (const u of units) {
      html += `<tr onclick="assetsOpenUnitDrawer('${esc(u.code)}', '${esc(prop.code)}')" style="cursor:pointer">
        <td><strong>${esc(u.code || '')}</strong></td>
        <td>${esc(u.floor || '–')}</td>
        <td>${u.living_area_qm ? u.living_area_qm + ' m²' : '–'}</td>
        <td>${u.archived_at ? '<span class="badge badge-muted">Archiviert</span>' : '<span class="badge badge-green">Aktiv</span>'}</td>
        <td><button class="btn" style="font-size:11px;padding:2px 6px" onclick="event.stopPropagation();assetsOpenUnitDrawer('${esc(u.code)}', '${esc(prop.code)}')">→</button></td>
      </tr>`;
    }

    html += '</tbody></table></div>';

    openDrawer(html);
    assetsCheckHeatingConflict();
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
  }
}

function assetsCheckHeatingConflict() {
  const method = document.getElementById('pd-ww-method');
  const combined = document.getElementById('pd-combined');
  const conflict = document.getElementById('pd-hc-conflict');
  const saveBtn = document.getElementById('pd-hc-save');
  const tempGroup = document.getElementById('pd-ww-temp-group');

  if (!method || !combined || !conflict || !saveBtn) return;

  // Show/hide temp field
  if (tempGroup) {
    tempGroup.style.display = method.value === 'A_volume_meter' ? '' : 'none';
  }

  const hasConflict = method.value === 'shared_no_separation' && combined.checked;
  conflict.style.display = hasConflict ? '' : 'none';
  saveBtn.disabled = hasConflict;
}

async function assetsSaveProperty(propertyId) {
  try {
    const body = {
      street: document.getElementById('pd-street').value.trim(),
      postal_code: document.getElementById('pd-postal').value.trim(),
      city: document.getElementById('pd-city').value.trim(),
      property_type: document.getElementById('pd-type').value,
      owner: document.getElementById('pd-owner').value,
      total_living_area_qm: document.getElementById('pd-area').value ? Number(document.getElementById('pd-area').value) : null,
      ownership_start: document.getElementById('pd-own-start').value || null,
      ownership_end: document.getElementById('pd-own-end').value || null,
      heating_type: document.getElementById('pd-heating').value.trim() || null,
      billing_period_start_month: Number(document.getElementById('pd-billing-month').value) || 1,
      co2_cost_relevant: document.getElementById('pd-co2').checked,
    };
    await approvalMutation('properties.update', 'PATCH', { property_id: propertyId }, body);
    closeDrawer();
    // Reload properties list
    const tabEl = document.querySelector('[x-data="stammdatenTab"]');
    if (tabEl && tabEl.__x) tabEl.__x.$data.loadProperties();
  } catch (e) {
    // Error already shown by approvalMutation
  }
}

async function assetsSaveHeatingConfig(propertyId) {
  try {
    const body = {
      warmwater_method: document.getElementById('pd-ww-method').value,
      warmwater_temp_celsius: document.getElementById('pd-ww-temp').value ? Number(document.getElementById('pd-ww-temp').value) : null,
      has_combined_heating_ww: document.getElementById('pd-combined').checked,
    };
    await approvalMutation('property-heating-config.update', 'PUT', { property_id: propertyId }, body);
    Alpine.store('toast').success('Heizungskonfiguration gespeichert');
  } catch (e) {
    // Error already shown
  }
}

async function assetsOpenUnitDrawer(unitCode, propertyCode) {
  const csrf = Alpine.store('csrf');
  try {
    // First: get unit detail (need numeric id for meters query)
    const unitRes = await csrf.fetch(`/api/assets/properties/${propertyCode}/units/${unitCode}`);
    if (!unitRes.ok) throw new Error(`HTTP ${unitRes.status}`);
    const unit = await unitRes.json();

    // Then: parallel fetch related data
    const [residentsRes, leasesRes, metersRes] = await Promise.all([
      csrf.fetch(`/api/assets/properties/${propertyCode}/units/${unitCode}/residents`),
      csrf.fetch(`/api/assets/leases?unit_code=${unitCode}`),
      csrf.fetch(`/api/assets/meters?unit_id=${unit.id}`),
    ]);
    const residents = residentsRes.ok ? await residentsRes.json() : [];
    const leases = leasesRes.ok ? await leasesRes.json() : [];
    const meters = metersRes.ok ? await metersRes.json() : [];

    let html = `
      <div class="drawer-header">
        <h3>Einheit: ${esc(unit.code || 'ID ' + unit.id)}</h3>
        <button class="drawer-close" onclick="closeDrawer()">✕</button>
      </div>

      <div class="drawer-section">
        <h4>Einheitsdaten</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Etage</label>
            <input class="form-input" id="ud-floor" value="${esc(unit.floor || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Flaeche (qm)</label>
            <input class="form-input" type="number" id="ud-area" value="${unit.living_area_qm || ''}">
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="assetsSaveUnit('${esc(unitCode)}', '${esc(propertyCode)}')">Speichern</button>
        </div>
      </div>

      <!-- Personen-Historie -->
      <div class="drawer-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h4 style="margin-bottom:0">Personen-Historie</h4>
          <button class="btn btn-primary" style="font-size:12px" onclick="assetsAddResident('${esc(unitCode)}', '${esc(propertyCode)}')">+ Eintrag</button>
        </div>
        <table class="assets-table">
          <thead><tr><th>Von</th><th>Bis</th><th>Personen</th><th>Notizen</th></tr></thead>
          <tbody>`;

    for (const r of residents) {
      html += `<tr>
        <td>${fmtDate(r.valid_from)}</td>
        <td title="einschliesslich">${r.valid_until ? fmtDate(r.valid_until) : '–'}</td>
        <td>${r.resident_count}</td>
        <td style="color:var(--muted);font-size:12px">${esc(r.notes || '')}</td>
      </tr>`;
    }

    html += `</tbody></table></div>

      <!-- Active Leases -->
      <div class="drawer-section">
        <h4>Aktive Mietvertraege</h4>`;

    if (leases.length) {
      for (const l of leases) {
        html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <strong>${l.lease_type || '–'}</strong> · ${l.status || '–'}
          <br><span style="color:var(--muted)">Von ${fmtDate(l.start_date)} ${l.end_date ? 'bis ' + fmtDate(l.end_date) : '(unbefristet)'}</span>
        </div>`;
      }
    } else {
      html += '<div style="color:var(--muted);font-size:13px">Keine aktiven Vertraege</div>';
    }

    html += `</div>

      <!-- Meters -->
      <div class="drawer-section">
        <h4>Zaehler (${meters.length})</h4>`;
    if (meters.length) {
      html += '<table class="assets-table"><thead><tr><th>Nummer</th><th>Medium</th><th>Eichung bis</th></tr></thead><tbody>';
      for (const m of meters) {
        const calibClass = m.calibration_valid_until && new Date(m.calibration_valid_until) < new Date() ? 'color:var(--red)' : '';
        html += `<tr>
          <td>${esc(m.meter_number || '')}</td>
          <td>${esc(m.medium || '')}</td>
          <td style="${calibClass}">${m.calibration_valid_until ? fmtDate(m.calibration_valid_until) : '–'}</td>
        </tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<div style="color:var(--muted);font-size:13px">Keine Zaehler</div>';
    }

    html += `</div>

      <!-- Actions -->
      <div class="drawer-section">
        <button class="btn btn-primary" onclick="assetsStartWizard(${unit.property_id}, ${unit.id})">Mieterwechsel starten</button>
      </div>
    `;

    openDrawer(html);
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
  }
}

async function assetsSaveUnit(unitCode, propertyCode) {
  try {
    const body = {
      floor: document.getElementById('ud-floor').value.trim() || null,
      living_area_qm: document.getElementById('ud-area').value ? Number(document.getElementById('ud-area').value) : null,
    };
    await approvalMutation('units.update', 'PATCH', { property_code: propertyCode, unit_code: unitCode }, body);
    closeDrawer();
  } catch (e) {
    // Error shown by approvalMutation
  }
}

async function assetsAddUnit(propertyCode) {
  openModal(`
    <h3>Einheit hinzufuegen</h3>
    <div class="form-group">
      <label class="form-label">Code (z.B. EG, OG, 1.OG)</label>
      <input class="form-input" id="au-code" placeholder="z.B. EG">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Etage</label>
        <input class="form-input" id="au-floor" placeholder="z.B. EG">
      </div>
      <div class="form-group">
        <label class="form-label">Flaeche (qm)</label>
        <input class="form-input" type="number" id="au-area">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveNewUnit('${esc(propertyCode)}')">Anlegen</button>
    </div>
  `);
}

async function assetsSaveNewUnit(propertyCode) {
  try {
    const body = {
      code: document.getElementById('au-code').value.trim(),
      floor: document.getElementById('au-floor').value.trim() || null,
      living_area_qm: document.getElementById('au-area').value ? Number(document.getElementById('au-area').value) : null,
    };
    if (!body.code) { Alpine.store('toast').error('Code ist Pflicht'); return; }
    await approvalMutation('units.create', 'POST', { property_code: propertyCode }, body);
    closeModal();
    assetsOpenPropertyDrawer(propertyCode);
  } catch (e) {
    // Error shown
  }
}

async function assetsAddResident(unitCode, propertyCode) {
  openModal(`
    <h3>Personen-Eintrag hinzufuegen</h3>
    <div class="form-group">
      <label class="form-label">Gueltig ab</label>
      <input class="form-input" type="date" id="ar-from">
    </div>
    <div class="form-group">
      <label class="form-label">Gueltig bis (einschliesslich, leer = offen)</label>
      <input class="form-input" type="date" id="ar-until">
    </div>
    <div class="form-group">
      <label class="form-label">Personenzahl</label>
      <input class="form-input" type="number" min="0" id="ar-count" value="1">
    </div>
    <div class="form-group">
      <label class="form-label">Notizen</label>
      <input class="form-input" id="ar-notes">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveResident('${esc(unitCode)}', '${esc(propertyCode)}')">Anlegen</button>
    </div>
  `);
}

async function assetsSaveResident(unitCode, propertyCode) {
  try {
    const body = {
      valid_from: document.getElementById('ar-from').value || null,
      valid_until: document.getElementById('ar-until').value || null,
      resident_count: Number(document.getElementById('ar-count').value) || 0,
      notes: document.getElementById('ar-notes').value.trim() || null,
    };
    await approvalMutation('unit-residents.create', 'POST', { property_code: propertyCode, unit_code: unitCode }, body);
    closeModal();
    Alpine.store('toast').success('Eintrag gespeichert');
  } catch (e) {
    // Error shown
  }
}

async function assetsOpenTenantDrawer(tenantId) {
  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/tenants/${tenantId}`);
    const tenant = await res.json();

    openDrawer(`
      <div class="drawer-header">
        <h3>Mieter: ${esc(tenant.name || 'ID ' + tenant.id)}</h3>
        <button class="drawer-close" onclick="closeDrawer()">✕</button>
      </div>
      <div class="drawer-section">
        <h4>Mieterdaten</h4>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" id="td-name" value="${esc(tenant.name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Firma</label>
          <input class="form-input" id="td-company" value="${esc(tenant.company || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">E-Mail</label>
            <input class="form-input" type="email" id="td-email" value="${esc(tenant.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Telefon</label>
            <input class="form-input" id="td-phone" value="${esc(tenant.phone || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">IBAN</label>
          <input class="form-input" id="td-iban" autocomplete="off" value="${esc(tenant.iban || '')}" type="password">
          <div class="form-hint">IBAN wird maskiert angezeigt</div>
        </div>
        <div class="form-group">
          <label class="form-label">Strasse</label>
          <input class="form-input" id="td-street" value="${esc(tenant.address_street || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">PLZ</label>
            <input class="form-input" id="td-postal" value="${esc(tenant.address_postal_code || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Stadt</label>
            <input class="form-input" id="td-city" value="${esc(tenant.address_city || '')}">
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="assetsSaveTenant(${tenant.id})">Speichern</button>
        </div>
      </div>
    `);
  } catch (e) {
    Alpine.store('toast').error('Fehler: ' + e.message);
  }
}

async function assetsSaveTenant(tenantId) {
  try {
    const body = {
      name: document.getElementById('td-name').value.trim(),
      company: document.getElementById('td-company').value.trim() || null,
      email: document.getElementById('td-email').value.trim() || null,
      phone: document.getElementById('td-phone').value.trim() || null,
      iban: document.getElementById('td-iban').value.trim() || null,
      address_street: document.getElementById('td-street').value.trim() || null,
      address_postal_code: document.getElementById('td-postal').value.trim() || null,
      address_city: document.getElementById('td-city').value.trim() || null,
    };
    await approvalMutation('tenants.update', 'PATCH', { tenant_id: tenantId }, body);
    closeDrawer();
  } catch (e) {
    // Error shown
  }
}

function assetsStartWizard(propertyId, unitId) {
  closeDrawer();
  Alpine.store('wizard').start(propertyId, unitId);
  // Trigger wizard UI render
  const content = document.getElementById('content');
  if (typeof renderChangeoverWizard === 'function') {
    renderChangeoverWizard();
  }
}

// ── CRUD: New Property ────────────────────────────────────────────────────────

function assetsAddProperty() {
  openModal(`
    <h3>Neues Objekt anlegen</h3>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Code (z.B. s28)</label>
        <input class="form-input" id="np-code" placeholder="z.B. s28" maxlength="10">
      </div>
      <div class="form-group">
        <label class="form-label">Objekttyp</label>
        <select class="form-select" id="np-type">
          <option value="residential">Wohngebaeude</option>
          <option value="commercial">Gewerbe</option>
          <option value="industrial">Industrie</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Strasse</label>
      <input class="form-input" id="np-street" placeholder="z.B. Musterstr. 1">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">PLZ</label>
        <input class="form-input" id="np-postal" placeholder="78532">
      </div>
      <div class="form-group">
        <label class="form-label">Stadt</label>
        <input class="form-input" id="np-city" placeholder="Tuttlingen">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Eigentuemer</label>
        <select class="form-select" id="np-owner">
          <option value="personal">Privat</option>
          <option value="la_perla_gmbh">Laperl GmbH</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Eigentum ab</label>
        <input class="form-input" type="date" id="np-own-start">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveNewProperty()">Anlegen</button>
    </div>
  `);
}

async function assetsSaveNewProperty() {
  try {
    const code = document.getElementById('np-code').value.trim().toLowerCase();
    const street = document.getElementById('np-street').value.trim();
    const postal_code = document.getElementById('np-postal').value.trim();
    const city = document.getElementById('np-city').value.trim();
    if (!code) { Alpine.store('toast').error('Code ist Pflicht'); return; }
    if (!street || !postal_code || !city) { Alpine.store('toast').error('Adresse ist Pflicht'); return; }
    const body = {
      code,
      street,
      postal_code,
      city,
      property_type: document.getElementById('np-type').value,
      owner: document.getElementById('np-owner').value,
      ownership_start: document.getElementById('np-own-start').value || null,
    };
    await approvalMutation('properties.create', 'POST', {}, body);
    closeModal();
    Alpine.store('toast').success('Objekt angelegt');
    // Reload properties list
    const comp = document.querySelector('[x-data=\'stammdatenTab\']').__x.$data;
    await comp.loadProperties();
    comp.renderPropertiesList();
  } catch (e) {
    // Error shown by approvalMutation
  }
}

// ── CRUD: New Tenant ──────────────────────────────────────────────────────────

function assetsAddTenant() {
  openModal(`
    <h3>Neuen Mieter anlegen</h3>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Vorname</label>
        <input class="form-input" id="nt-first" placeholder="Max">
      </div>
      <div class="form-group">
        <label class="form-label">Nachname</label>
        <input class="form-input" id="nt-last" placeholder="Mustermann">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Firma (optional, bei Gewerbemieter)</label>
      <input class="form-input" id="nt-company" placeholder="">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input class="form-input" type="email" id="nt-email">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon</label>
        <input class="form-input" id="nt-phone">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">IBAN</label>
      <input class="form-input" id="nt-iban" placeholder="DE...">
    </div>
    <div class="form-group">
      <label class="form-label">Strasse</label>
      <input class="form-input" id="nt-street">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">PLZ</label>
        <input class="form-input" id="nt-postal">
      </div>
      <div class="form-group">
        <label class="form-label">Stadt</label>
        <input class="form-input" id="nt-city">
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="assetsSaveNewTenant()">Anlegen</button>
    </div>
  `);
}

async function assetsSaveNewTenant() {
  try {
    const first_name = document.getElementById('nt-first').value.trim();
    const last_name = document.getElementById('nt-last').value.trim();
    const company_name = document.getElementById('nt-company').value.trim() || null;
    if (!first_name && !last_name && !company_name) {
      Alpine.store('toast').error('Name oder Firma ist Pflicht');
      return;
    }
    const body = {
      tenant_type: company_name && !first_name ? 'company' : 'person',
      first_name: first_name || null,
      last_name: last_name || null,
      company_name,
      email: document.getElementById('nt-email').value.trim() || null,
      phone: document.getElementById('nt-phone').value.trim() || null,
      iban: document.getElementById('nt-iban').value.trim() || null,
      street: document.getElementById('nt-street').value.trim() || null,
      postal_code: document.getElementById('nt-postal').value.trim() || null,
      city: document.getElementById('nt-city').value.trim() || null,
    };
    await approvalMutation('tenants.create', 'POST', {}, body);
    closeModal();
    Alpine.store('toast').success('Mieter angelegt');
    // Reload tenants list
    const comp = document.querySelector('[x-data=\'stammdatenTab\']').__x.$data;
    await comp.loadTenants();
  } catch (e) {
    // Error shown by approvalMutation
  }
}
