/* ═══════════════════════════════════════════════════════════════════════════
   Assets Lease Changeover Wizard — 5 Steps
   Sprint 5.5a-2 Stage f
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Beforeunload protection ─────────────────────────────────────────────────
let _wizardBeforeUnloadHandler = null;

function _enableWizardProtection() {
  if (_wizardBeforeUnloadHandler) return;
  _wizardBeforeUnloadHandler = (e) => {
    e.preventDefault();
    e.returnValue = 'Wizard-Daten gehen verloren. Seite wirklich verlassen?';
  };
  window.addEventListener('beforeunload', _wizardBeforeUnloadHandler);
}

function _disableWizardProtection() {
  if (_wizardBeforeUnloadHandler) {
    window.removeEventListener('beforeunload', _wizardBeforeUnloadHandler);
    _wizardBeforeUnloadHandler = null;
  }
}

// ── Render Wizard ───────────────────────────────────────────────────────────

function renderChangeoverWizard() {
  const wiz = Alpine.store('wizard');
  if (!wiz.active) return;

  _enableWizardProtection();

  const content = document.getElementById('content');
  if (!content) return;

  const steps = [
    { num: 1, label: 'Vertragsende & Auszug' },
    { num: 2, label: 'End-Ablesungen' },
    { num: 3, label: 'Neuer Mieter' },
    { num: 4, label: 'Neuer Vertrag' },
    { num: 5, label: 'Bestaetigung' },
  ];

  let html = `
    <div class="wizard-header">
      <h3>Mieterwechsel — Einheit ${wiz.unitId}</h3>
      <button class="btn btn-danger" onclick="cancelWizard()">Abbrechen</button>
    </div>

    <div class="wizard-steps">
      ${steps.map(s => {
        let cls = '';
        if (s.num === wiz.step) cls = 'active';
        else if (s.num < wiz.step) cls = 'completed';
        return `<div class="wizard-step ${cls}">${s.num}. ${s.label}</div>`;
      }).join('')}
    </div>

    ${wiz.error ? `<div class="alert alert-error" style="margin-bottom:16px">${esc(wiz.error)}${wiz.errorStep ? ` <button class="btn" style="font-size:12px;margin-left:8px" onclick="Alpine.store('wizard').goToStep(${wiz.errorStep});renderChangeoverWizard()">Zurueck zu Schritt ${wiz.errorStep}</button>` : ''}</div>` : ''}

    <div class="wizard-body card card-pad">
  `;

  if (wiz.step === 1) html += renderWizardStep1();
  else if (wiz.step === 2) html += renderWizardStep2();
  else if (wiz.step === 3) html += renderWizardStep3();
  else if (wiz.step === 4) html += renderWizardStep4();
  else if (wiz.step === 5) html += renderWizardStep5();

  html += '</div>';

  html += `
    <div class="wizard-footer">
      ${wiz.step > 1 ? `<button class="btn" onclick="wizardPrev()">Zurueck</button>` : '<div></div>'}
      ${wiz.step < 5 ? `<button class="btn btn-primary" onclick="wizardNext()">Weiter</button>` : `<button class="btn btn-primary" onclick="commitChangeover()">Mieterwechsel abschliessen</button>`}
    </div>
  `;

  content.innerHTML = html;
}

// ── Step 1: Vertragsende & Auszug ───────────────────────────────────────────

function renderWizardStep1() {
  const wiz = Alpine.store('wizard');
  return `
    <h4 style="font-size:14px;margin-bottom:16px">Vertragsende & Auszug</h4>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Enddatum Mietvertrag</label>
        <input class="form-input" type="date" id="wz-end-date" value="${wiz.end_date}" onchange="Alpine.store('wizard').end_date=this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Tatsaechlicher Auszug</label>
        <input class="form-input" type="date" id="wz-moveout" value="${wiz.actual_move_out}" onchange="Alpine.store('wizard').actual_move_out=this.value">
        <div class="form-hint">Falls Auszug vor Vertragsende: end_date wird automatisch angepasst</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Kuendigungsgrund</label>
      <select class="form-select" id="wz-reason" onchange="Alpine.store('wizard').termination_reason=this.value">
        <option value="" ${!wiz.termination_reason ? 'selected' : ''}>-- waehlen --</option>
        <option value="tenant_notice" ${wiz.termination_reason === 'tenant_notice' ? 'selected' : ''}>Kuendigung Mieter</option>
        <option value="landlord_notice" ${wiz.termination_reason === 'landlord_notice' ? 'selected' : ''}>Kuendigung Vermieter</option>
        <option value="mutual_agreement" ${wiz.termination_reason === 'mutual_agreement' ? 'selected' : ''}>Aufhebungsvertrag</option>
        <option value="expiry" ${wiz.termination_reason === 'expiry' ? 'selected' : ''}>Befristungsablauf</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Uebergabenotiz</label>
      <input class="form-input" id="wz-handover-note" value="${esc(wiz.handover_note)}" onchange="Alpine.store('wizard').handover_note=this.value">
    </div>
  `;
}

// ── Step 2: End-Ablesungen ──────────────────────────────────────────────────

function renderWizardStep2() {
  const wiz = Alpine.store('wizard');
  return `
    <h4 style="font-size:14px;margin-bottom:16px">End-Ablesungen</h4>
    <div class="alert alert-info">
      Ablesungen der Zaehler der betroffenen Einheit sowie relevanter Hauptzaehler (§9b HeizkostenV).
      Datum wird auf den tatsaechlichen Auszug voreingestellt.
    </div>
    <div class="form-group">
      <label class="form-label">Ablesedatum</label>
      <input class="form-input" type="date" id="wz-reading-date" value="${wiz.actual_move_out || ''}" style="width:200px">
    </div>
    <div id="wz-end-readings-list"><div class="spinner">Zaehler werden geladen...</div></div>
    <script>loadWizardEndMeters()</script>
  `;
}

async function loadWizardEndMeters() {
  const wiz = Alpine.store('wizard');
  const target = document.getElementById('wz-end-readings-list');
  if (!target) return;

  const csrf = Alpine.store('csrf');
  try {
    const metersRes = await csrf.fetch(`/api/assets/meters?unit_id=${wiz.unitId}&active=true`);
    const meters = metersRes.ok ? await metersRes.json() : [];

    // Also get property main meters
    const mainRes = await csrf.fetch(`/api/assets/meters?property_id=${wiz.propertyId}&is_main_meter=true`);
    const mainMeters = mainRes.ok ? await mainRes.json() : [];

    const allMeters = [...meters, ...mainMeters.filter(mm => !meters.find(m => m.id === mm.id))];

    if (!allMeters.length) {
      target.innerHTML = '<div class="empty">Keine aktiven Zaehler gefunden</div>';
      return;
    }

    let html = '<table class="assets-table"><thead><tr><th>Zaehler</th><th>Medium</th><th>Wert</th><th>Geschaetzt</th><th>Grund</th></tr></thead><tbody>';
    for (const m of allMeters) {
      const idx = wiz.end_readings.findIndex(r => r.meter_id === m.id);
      const existing = idx >= 0 ? wiz.end_readings[idx] : {};
      html += `<tr>
        <td>${esc(m.meter_number || '')} ${m.is_main_meter ? '<span class="badge badge-blue">Haupt</span>' : ''}</td>
        <td>${esc(m.medium || '')}</td>
        <td><input class="form-input wz-end-val" type="number" step="0.001" data-meter-id="${m.id}" value="${existing.value || ''}" style="width:120px"></td>
        <td><label class="form-checkbox"><input type="checkbox" class="wz-end-est" data-meter-id="${m.id}" ${existing.is_estimated ? 'checked' : ''}></label></td>
        <td><input class="form-input wz-end-reason" data-meter-id="${m.id}" value="${esc(existing.estimation_reason || '')}" style="width:120px;font-size:12px" placeholder="Schaetzgrund"></td>
      </tr>`;
    }
    html += '</tbody></table>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

function collectWizardEndReadings() {
  const wiz = Alpine.store('wizard');
  const date = document.getElementById('wz-reading-date')?.value;
  const readings = [];
  document.querySelectorAll('.wz-end-val').forEach(input => {
    if (!input.value) return;
    const meterId = Number(input.dataset.meterId);
    const estimated = document.querySelector(`.wz-end-est[data-meter-id="${meterId}"]`)?.checked || false;
    const reason = document.querySelector(`.wz-end-reason[data-meter-id="${meterId}"]`)?.value || '';
    readings.push({
      meter_id: meterId,
      value: Number(input.value),
      reading_at: date ? `${date}T00:00:00` : null,
      reading_type: 'move_out',
      is_estimated: estimated,
      estimation_reason: reason || null,
    });
  });
  wiz.end_readings = readings;
}

// ── Step 3: Neuer Mieter + Personenzahl ─────────────────────────────────────

function renderWizardStep3() {
  const wiz = Alpine.store('wizard');
  let tenantsHtml = '';
  for (let i = 0; i < wiz.tenants.length; i++) {
    const t = wiz.tenants[i];
    tenantsHtml += `<div style="padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong>${esc(t.name || '')}</strong>
        ${t.is_primary_contact ? ' <span class="badge badge-green">Hauptkontakt</span>' : ''}
        <br><span style="color:var(--muted);font-size:12px">${esc(t.role || 'tenant')} · ${esc(t.email || '')}</span>
      </div>
      <button class="btn btn-danger" style="font-size:11px" onclick="wizardRemoveTenant(${i})">Entfernen</button>
    </div>`;
  }

  return `
    <h4 style="font-size:14px;margin-bottom:16px">Neuer Mieter</h4>

    ${tenantsHtml}

    <div style="margin-bottom:16px">
      <button class="btn" onclick="wizardToggleNewTenant()">
        ${wiz.new_tenant_mode ? 'Bestehenden Mieter waehlen' : 'Neuen Mieter anlegen'}
      </button>
    </div>

    ${wiz.new_tenant_mode ? `
      <div class="form-group">
        <label class="form-label">Name</label>
        <input class="form-input" id="wz-tn-name" value="${esc(wiz.new_tenant_form.name)}" onchange="Alpine.store('wizard').new_tenant_form.name=this.value">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">E-Mail</label>
          <input class="form-input" type="email" id="wz-tn-email" value="${esc(wiz.new_tenant_form.email)}" onchange="Alpine.store('wizard').new_tenant_form.email=this.value">
        </div>
        <div class="form-group">
          <label class="form-label">Telefon</label>
          <input class="form-input" id="wz-tn-phone" value="${esc(wiz.new_tenant_form.phone)}" onchange="Alpine.store('wizard').new_tenant_form.phone=this.value">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">IBAN</label>
        <input class="form-input" type="password" autocomplete="off" id="wz-tn-iban" value="${esc(wiz.new_tenant_form.iban)}" onchange="Alpine.store('wizard').new_tenant_form.iban=this.value">
      </div>
    ` : `
      <div class="form-group">
        <label class="form-label">Mieter suchen (ID oder Name)</label>
        <input class="form-input" id="wz-tn-search" placeholder="Suchen...">
        <div id="wz-tn-results" style="margin-top:8px"></div>
      </div>
    `}

    <div style="margin-top:12px">
      <button class="btn btn-primary" onclick="wizardAddTenant()">Mieter hinzufuegen</button>
    </div>

    <hr style="border-color:var(--border);margin:20px 0">

    <h4 style="font-size:14px;margin-bottom:16px">Personenzahl (fuer NK-Umlageschluessel)</h4>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Personenzahl</label>
        <input class="form-input" type="number" min="0" id="wz-resident-count" value="${wiz.new_unit_residents.resident_count ?? ''}" onchange="Alpine.store('wizard').new_unit_residents.resident_count=Number(this.value)">
        ${wiz.new_unit_residents.resident_count === 0 || wiz.new_unit_residents.resident_count === '' ? '<div class="alert alert-warning" style="margin-top:4px">Personenzahl ist 0 oder leer</div>' : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Gueltig ab</label>
        <input class="form-input" type="date" id="wz-resident-from" value="${wiz.new_unit_residents.valid_from || wiz.new_lease?.handover_at || ''}" onchange="Alpine.store('wizard').new_unit_residents.valid_from=this.value">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notizen</label>
      <input class="form-input" id="wz-resident-notes" value="${esc(wiz.new_unit_residents.notes)}" onchange="Alpine.store('wizard').new_unit_residents.notes=this.value">
    </div>
  `;
}

function wizardToggleNewTenant() {
  const wiz = Alpine.store('wizard');
  wiz.new_tenant_mode = !wiz.new_tenant_mode;
  renderChangeoverWizard();
}

function wizardAddTenant() {
  const wiz = Alpine.store('wizard');
  if (wiz.new_tenant_mode) {
    const name = wiz.new_tenant_form.name;
    if (!name) { Alpine.store('toast').error('Name ist Pflicht'); return; }
    wiz.tenants.push({
      _isNew: true,
      name: name,
      company: wiz.new_tenant_form.company,
      email: wiz.new_tenant_form.email,
      phone: wiz.new_tenant_form.phone,
      iban: wiz.new_tenant_form.iban,
      role: 'tenant',
      is_primary_contact: wiz.tenants.length === 0,
    });
    wiz.new_tenant_form = { name: '', company: '', email: '', phone: '', iban: '', address_street: '', address_postal: '', address_city: '' };
  } else {
    const searchVal = document.getElementById('wz-tn-search')?.value?.trim();
    if (!searchVal) { Alpine.store('toast').error('Mieter-ID oder Name eingeben'); return; }
    wiz.tenants.push({
      _isNew: false,
      tenant_id: Number(searchVal) || null,
      name: searchVal,
      role: 'tenant',
      is_primary_contact: wiz.tenants.length === 0,
    });
  }
  renderChangeoverWizard();
}

function wizardRemoveTenant(index) {
  Alpine.store('wizard').tenants.splice(index, 1);
  renderChangeoverWizard();
}

// ── Step 4: Neuer Vertrag ───────────────────────────────────────────────────

function renderWizardStep4() {
  const wiz = Alpine.store('wizard');
  const nl = wiz.new_lease;
  return `
    <h4 style="font-size:14px;margin-bottom:16px">Neuer Mietvertrag</h4>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Vertragstyp</label>
        <select class="form-select" id="wz-lease-type" onchange="Alpine.store('wizard').new_lease.lease_type=this.value">
          <option value="residential_permanent" ${nl.lease_type === 'residential_permanent' ? 'selected' : ''}>Wohnung unbefristet</option>
          <option value="residential_temporary" ${nl.lease_type === 'residential_temporary' ? 'selected' : ''}>Wohnung befristet</option>
          <option value="commercial" ${nl.lease_type === 'commercial' ? 'selected' : ''}>Gewerbe</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mietbeginn</label>
        <input class="form-input" type="date" id="wz-lease-start" value="${nl.start_date}" onchange="Alpine.store('wizard').new_lease.start_date=this.value">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Uebergabe am</label>
        <input class="form-input" type="date" id="wz-lease-handover" value="${nl.handover_at}" onchange="Alpine.store('wizard').new_lease.handover_at=this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Miete faellig am (Tag)</label>
        <input class="form-input" type="number" min="1" max="28" id="wz-lease-due" value="${nl.rent_due_day}" onchange="Alpine.store('wizard').new_lease.rent_due_day=Number(this.value)">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Kaltmiete (EUR)</label>
        <input class="form-input" type="number" step="0.01" id="wz-lease-kalt" value="${nl.kaltmiete}" onchange="Alpine.store('wizard').new_lease.kaltmiete=this.value">
      </div>
      <div class="form-group">
        <label class="form-label">NK-Vorauszahlung (EUR)</label>
        <input class="form-input" type="number" step="0.01" id="wz-lease-nk" value="${nl.nk_vorauszahlung}" onchange="Alpine.store('wizard').new_lease.nk_vorauszahlung=this.value">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Heizkosten-VZ (EUR)</label>
        <input class="form-input" type="number" step="0.01" id="wz-lease-heiz" value="${nl.heizkosten_vorauszahlung}" onchange="Alpine.store('wizard').new_lease.heizkosten_vorauszahlung=this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Kaution (EUR)</label>
        <input class="form-input" type="number" step="0.01" id="wz-lease-kaution" value="${nl.kaution}" onchange="Alpine.store('wizard').new_lease.kaution=this.value">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Zahlungsweise</label>
        <select class="form-select" id="wz-lease-payment" onchange="Alpine.store('wizard').new_lease.payment_method=this.value">
          <option value="bank_transfer" ${nl.payment_method === 'bank_transfer' ? 'selected' : ''}>Ueberweisung</option>
          <option value="direct_debit" ${nl.payment_method === 'direct_debit' ? 'selected' : ''}>Lastschrift</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Abrechnungsmodus</label>
        <select class="form-select" id="wz-lease-billing" onchange="Alpine.store('wizard').new_lease.billing_mode=this.value">
          <option value="vorauszahlung" ${nl.billing_mode === 'vorauszahlung' ? 'selected' : ''}>Vorauszahlung</option>
          <option value="pauschale" ${nl.billing_mode === 'pauschale' ? 'selected' : ''}>Pauschale</option>
        </select>
      </div>
    </div>
  `;
}

// ── Step 5: Bestaetigung ────────────────────────────────────────────────────

function renderWizardStep5() {
  const wiz = Alpine.store('wizard');
  const nl = wiz.new_lease;

  let tenantsSummary = wiz.tenants.map(t => esc(t.name || 'ID ' + (t.tenant_id || '?'))).join(', ');

  return `
    <h4 style="font-size:14px;margin-bottom:16px">Zusammenfassung</h4>

    <div class="drawer-section">
      <h4>1. Vertragsende</h4>
      <div class="property-card-meta">
        <span class="label">Enddatum</span><span>${wiz.end_date || '–'}</span>
        <span class="label">Auszug</span><span>${wiz.actual_move_out || '–'}</span>
        <span class="label">Grund</span><span>${esc(wiz.termination_reason || '–')}</span>
      </div>
    </div>

    <div class="drawer-section">
      <h4>2. End-Ablesungen</h4>
      <span style="color:var(--muted);font-size:13px">${wiz.end_readings.length} Ablesungen</span>
    </div>

    <div class="drawer-section">
      <h4>3. Neue Mieter</h4>
      <div>${tenantsSummary || '<span style="color:var(--muted)">Keine Mieter</span>'}</div>
      <div style="margin-top:8px;font-size:13px">
        Personenzahl: <strong>${wiz.new_unit_residents.resident_count ?? '–'}</strong>
        ab ${wiz.new_unit_residents.valid_from || '–'}
      </div>
    </div>

    <div class="drawer-section">
      <h4>4. Neuer Vertrag</h4>
      <div class="property-card-meta">
        <span class="label">Typ</span><span>${esc(nl.lease_type || '–')}</span>
        <span class="label">Beginn</span><span>${nl.start_date || '–'}</span>
        <span class="label">Kaltmiete</span><span>${nl.kaltmiete ? fmtEur(Number(nl.kaltmiete)) : '–'}</span>
        <span class="label">NK-VZ</span><span>${nl.nk_vorauszahlung ? fmtEur(Number(nl.nk_vorauszahlung)) : '–'}</span>
        <span class="label">Heiz-VZ</span><span>${nl.heizkosten_vorauszahlung ? fmtEur(Number(nl.heizkosten_vorauszahlung)) : '–'}</span>
        <span class="label">Kaution</span><span>${nl.kaution ? fmtEur(Number(nl.kaution)) : '–'}</span>
      </div>
    </div>

    <div class="alert alert-warning">
      Nach Bestaetigung wird der Mieterwechsel atomar durchgefuehrt.
      Alle Schritte werden zusammen gespeichert oder verworfen.
    </div>
  `;
}

// ── Navigation ──────────────────────────────────────────────────────────────

function wizardNext() {
  const wiz = Alpine.store('wizard');

  // Collect data from current step before advancing
  if (wiz.step === 2) collectWizardEndReadings();

  wiz.error = null;
  wiz.errorStep = null;
  wiz.nextStep();
  renderChangeoverWizard();
}

function wizardPrev() {
  const wiz = Alpine.store('wizard');
  if (wiz.step === 2) collectWizardEndReadings();
  wiz.prevStep();
  renderChangeoverWizard();
}

function cancelWizard() {
  if (!confirm('Eingaben verwerfen?')) return;
  const wiz = Alpine.store('wizard');
  wiz.reset();
  _disableWizardProtection();
  showTab('assets');
}

// ── Commit Changeover ───────────────────────────────────────────────────────

async function commitChangeover() {
  const wiz = Alpine.store('wizard');

  const body = {
    unit_id: wiz.unitId,
    property_id: wiz.propertyId,

    // Step 1
    end_date: wiz.end_date || null,
    actual_move_out: wiz.actual_move_out || null,
    termination_reason: wiz.termination_reason || null,
    handover_note: wiz.handover_note || null,

    // Step 2
    end_readings: wiz.end_readings,

    // Step 3
    tenants: wiz.tenants.map(t => {
      if (t._isNew) {
        return {
          _create: true,
          name: t.name,
          company: t.company || null,
          email: t.email || null,
          phone: t.phone || null,
          iban: t.iban || null,
          role: t.role || 'tenant',
          is_primary_contact: t.is_primary_contact || false,
        };
      }
      return {
        tenant_id: t.tenant_id,
        role: t.role || 'tenant',
        is_primary_contact: t.is_primary_contact || false,
      };
    }),
    new_unit_residents: {
      resident_count: wiz.new_unit_residents.resident_count,
      valid_from: wiz.new_unit_residents.valid_from || null,
      notes: wiz.new_unit_residents.notes || null,
    },

    // Step 4
    new_lease: {
      lease_type: wiz.new_lease.lease_type,
      start_date: wiz.new_lease.start_date || null,
      handover_at: wiz.new_lease.handover_at || null,
      rent_due_day: wiz.new_lease.rent_due_day || 1,
      payment_method: wiz.new_lease.payment_method || 'bank_transfer',
      billing_mode: wiz.new_lease.billing_mode || 'vorauszahlung',
    },
    initial_charges: [],
    start_readings: wiz.start_readings,
  };

  // Build initial charges from step 4 amounts
  if (wiz.new_lease.kaltmiete) {
    body.initial_charges.push({ charge_type: 'kaltmiete', amount: Number(wiz.new_lease.kaltmiete), valid_from: wiz.new_lease.start_date });
  }
  if (wiz.new_lease.nk_vorauszahlung) {
    body.initial_charges.push({ charge_type: 'nk_vorauszahlung', amount: Number(wiz.new_lease.nk_vorauszahlung), valid_from: wiz.new_lease.start_date });
  }
  if (wiz.new_lease.heizkosten_vorauszahlung) {
    body.initial_charges.push({ charge_type: 'heizkosten_vorauszahlung', amount: Number(wiz.new_lease.heizkosten_vorauszahlung), valid_from: wiz.new_lease.start_date });
  }
  if (wiz.new_lease.kaution) {
    body.initial_charges.push({ charge_type: 'kaution', amount: Number(wiz.new_lease.kaution), valid_from: wiz.new_lease.start_date });
  }

  try {
    const result = await approvalMutation('lease-changeovers.create', 'POST', {}, body, {
      idempotencyKey: wiz.idempotencyKey,
    });

    if (result === false) {
      // User cancelled approval
      return;
    }

    _disableWizardProtection();
    wiz.reset();
    Alpine.store('toast').success('Mieterwechsel erfolgreich abgeschlossen');
    showTab('assets');
  } catch (e) {
    wiz.error = e.message || 'Fehler beim Mieterwechsel';
    // Try to resolve error to affected step
    if (e.path) {
      if (e.path.includes('end_') || e.path.includes('termination') || e.path.includes('move_out')) wiz.errorStep = 1;
      else if (e.path.includes('reading')) wiz.errorStep = 2;
      else if (e.path.includes('tenant') || e.path.includes('resident')) wiz.errorStep = 3;
      else if (e.path.includes('lease') || e.path.includes('charge')) wiz.errorStep = 4;
    }
    renderChangeoverWizard();
  }
}
