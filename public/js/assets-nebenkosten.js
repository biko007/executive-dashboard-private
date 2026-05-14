/* ═══════════════════════════════════════════════════════════════════════════
   Assets Nebenkosten — Sub-Tab 3 (NK)
   Pre-Check, Vorschau, Runs & Statements, §556-Pflichten
   Sprint 5.5c
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Owner type formatter ─────────────────────────────────────────────────

function fmtOwnerType(raw) {
  if (raw === 'personal') return 'Privat';
  if (raw === 'la_perla_gmbh') return 'La Perla GmbH';
  return raw || '\u2013';
}

document.addEventListener('alpine:init', () => {

  Alpine.data('nebenkostenTab', () => ({
    loaded: false,
    properties: [],

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      await this.loadProperties();
      if (this.properties.length && !Alpine.store('nk').selectedPropertyCode) {
        Alpine.store('nk').selectedPropertyCode = this.properties[0].code;
      }
      this.renderContent();
    },

    async loadProperties() {
      const csrf = Alpine.store('csrf');
      try {
        const res = await csrf.fetch('/api/assets/properties');
        this.properties = res.ok ? await res.json() : [];
      } catch (e) {
        Alpine.store('toast').error('Fehler: ' + e.message);
      }
    },

    switchSection(s) {
      Alpine.store('nk').activeSubTab = s;
      this.renderContent();
    },

    renderContent() {
      const target = this.$refs.nebenkostenContent;
      if (!target) return;
      const nk = Alpine.store('nk');

      let html = this._renderSelector();
      html += this._renderSubSubTabs();

      if (nk.activeSubTab === 'precheck') {
        html += this._renderPreCheck();
      } else if (nk.activeSubTab === 'preview') {
        html += this._renderPreview();
      } else if (nk.activeSubTab === 'runs') {
        html += this._renderRuns();
      } else if (nk.activeSubTab === 'obligations') {
        html += this._renderObligations();
      }

      target.innerHTML = html;
      this._triggerLoad();
    },

    _renderSelector() {
      const nk = Alpine.store('nk');
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = currentYear; y >= currentYear - 3; y--) years.push(y);

      let html = `<div class="filters-row" style="margin-bottom:16px">
        <select class="filter-select" id="nk-prop-select" onchange="nkSelectProperty(this.value)">`;
      for (const p of this.properties) {
        const sel = p.code === nk.selectedPropertyCode ? ' selected' : '';
        html += `<option value="${esc(p.code)}"${sel}>${esc(p.name || p.code || 'ID ' + p.id)}</option>`;
      }
      html += `</select>
        <select class="filter-select" id="nk-year-select" style="width:100px" onchange="nkSelectYear(Number(this.value))">`;
      for (const y of years) {
        const sel = y === nk.selectedYear ? ' selected' : '';
        html += `<option value="${y}"${sel}>${y}</option>`;
      }
      html += `</select></div>`;
      return html;
    },

    _renderSubSubTabs() {
      const nk = Alpine.store('nk');
      return `<div class="filters-row" style="margin-bottom:16px">
        <button class="btn ${nk.activeSubTab === 'precheck' ? 'btn-primary' : ''}" onclick="nkSwitchSection('precheck')">Pre-Check</button>
        <button class="btn ${nk.activeSubTab === 'preview' ? 'btn-primary' : ''}" onclick="nkSwitchSection('preview')">Vorschau</button>
        <button class="btn ${nk.activeSubTab === 'runs' ? 'btn-primary' : ''}" onclick="nkSwitchSection('runs')">Runs &amp; Statements</button>
        <button class="btn ${nk.activeSubTab === 'obligations' ? 'btn-primary' : ''}" onclick="nkSwitchSection('obligations')">\u00a7556-Pflichten</button>
      </div>`;
    },

    // ── Pre-Check ────────────────────────────────────────────────────────

    _renderPreCheck() {
      return `<div class="card card-pad">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="font-size:15px;margin:0">NK Pre-Check</h3>
          <button class="btn" onclick="nkLoadPreCheck()" id="nk-precheck-refresh">Aktualisieren</button>
        </div>
        <div id="nk-precheck-result"><div class="spinner">Laden...</div></div>
      </div>`;
    },

    // ── Preview ──────────────────────────────────────────────────────────

    _renderPreview() {
      const nk = Alpine.store('nk');
      const blocked = nk.preCheck && nk.preCheck.blocking_count > 0;
      return `<div class="card card-pad">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="font-size:15px;margin:0">NK-Vorschau</h3>
          <button class="btn btn-primary" onclick="nkLoadPreview()" id="nk-preview-btn"${blocked ? ' disabled title="Pre-Check hat Blocker"' : ''}>Vorschau berechnen</button>
        </div>
        ${blocked ? '<div class="alert alert-error" style="margin-bottom:12px">Pre-Check hat Blocker. Bitte erst alle Blocker beheben.</div>' : ''}
        ${!nk.preCheck ? '<div class="empty" style="margin-bottom:12px">Pre-Check noch nicht durchgef\u00fchrt. <a href="#" onclick="event.preventDefault();nkSwitchSection(\'precheck\')">Jetzt pr\u00fcfen</a></div>' : ''}
        <div id="nk-preview-result"></div>
      </div>`;
    },

    // ── Runs & Statements ────────────────────────────────────────────────

    _renderRuns() {
      return `<div class="card card-pad">
        <h3 style="font-size:15px;margin-bottom:16px">Runs &amp; Statements</h3>
        <div id="nk-runs-list"><div class="spinner">Laden...</div></div>
      </div>
      <div id="nk-run-detail" style="margin-top:16px"></div>`;
    },

    // ── Obligations ──────────────────────────────────────────────────────

    _renderObligations() {
      return `<div class="card card-pad">
        <h3 style="font-size:15px;margin-bottom:16px">\u00a7556 BGB Pflichten</h3>
        <div id="nk-obligations-list"><div class="spinner">Laden...</div></div>
      </div>`;
    },

    // ── Data loading trigger ─────────────────────────────────────────────

    _triggerLoad() {
      const nk = Alpine.store('nk');
      if (!nk.selectedPropertyCode) return;
      if (nk.activeSubTab === 'precheck') nkLoadPreCheck();
      if (nk.activeSubTab === 'runs') nkLoadRuns();
      if (nk.activeSubTab === 'obligations') nkLoadObligationsForProperty();
    },
  }));
});

// ── Global helpers ───────────────────────────────────────────────────────

function nkSwitchSection(section) {
  const tabEl = document.querySelector('[x-data="nebenkostenTab"]');
  if (tabEl && tabEl.__x) {
    tabEl.__x.$data.switchSection(section);
  }
}

function nkSelectProperty(code) {
  Alpine.store('nk').selectedPropertyCode = code;
  Alpine.store('nk').preCheck = null;
  Alpine.store('nk').previewResult = null;
  Alpine.store('nk').runs = [];
  Alpine.store('nk').selectedRun = null;
  Alpine.store('nk').statements = [];
  Alpine.store('nk').obligations = [];
  const tabEl = document.querySelector('[x-data="nebenkostenTab"]');
  if (tabEl && tabEl.__x) tabEl.__x.$data.renderContent();
}

function nkSelectYear(year) {
  Alpine.store('nk').selectedYear = year;
  Alpine.store('nk').preCheck = null;
  Alpine.store('nk').previewResult = null;
  Alpine.store('nk').runs = [];
  Alpine.store('nk').selectedRun = null;
  Alpine.store('nk').statements = [];
  const tabEl = document.querySelector('[x-data="nebenkostenTab"]');
  if (tabEl && tabEl.__x) tabEl.__x.$data.renderContent();
}

// ── Pre-Check ────────────────────────────────────────────────────────────

async function nkLoadPreCheck() {
  const nk = Alpine.store('nk');
  const target = document.getElementById('nk-precheck-result');
  if (!target || !nk.selectedPropertyCode) return;
  target.innerHTML = '<div class="spinner">Laden...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const url = `/api/assets/properties/${nk.selectedPropertyCode}/nk-readiness?year=${nk.selectedYear}`;
    const res = await csrf.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    nk.preCheck = data;

    const blocking = data.blocking_count || 0;
    const warnings = data.warning_count || 0;
    const infos = data.info_count || 0;
    const findings = data.findings || [];

    // Ampel badge
    let ampelClass, ampelLabel;
    if (blocking > 0) {
      ampelClass = 'nk-badge-red';
      ampelLabel = `${blocking} Blocker`;
    } else if (warnings > 0) {
      ampelClass = 'nk-badge-yellow';
      ampelLabel = `${warnings} Warnungen`;
    } else {
      ampelClass = 'nk-badge-green';
      ampelLabel = 'Bereit';
    }

    let html = `<div style="margin-bottom:16px">
      <span class="nk-badge ${ampelClass}" style="font-size:14px;padding:6px 14px">${ampelLabel}</span>
      <span style="color:var(--muted);font-size:13px;margin-left:12px">${blocking} Blocker, ${warnings} Warnungen, ${infos} Infos</span>
    </div>`;

    if (blocking === 0 && warnings === 0) {
      html += `<div class="alert" style="background:var(--green-bg,rgba(34,197,94,.08));border:1px solid var(--green,#22c55e);color:var(--green,#22c55e);margin-bottom:12px;padding:10px 14px;border-radius:8px">
        Bereit f\u00fcr Vorschau! <a href="#" onclick="event.preventDefault();nkSwitchSection('preview')" style="color:inherit;text-decoration:underline">Jetzt Vorschau berechnen</a>
      </div>`;
    }

    if (findings.length) {
      html += '<div style="margin-top:8px">';
      for (const f of findings) {
        const severityBadge = f.severity === 'blocking' ? '<span class="badge badge-red">Blocker</span>'
          : f.severity === 'warning' ? '<span class="badge badge-yellow">Warnung</span>'
          : '<span class="badge badge-blue">Info</span>';

        html += `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            ${severityBadge}
            <span style="font-weight:600;font-size:13px">${esc(f.code || '')}</span>
            ${f.display_id ? `<span style="color:var(--muted);font-size:12px">${esc(f.display_id)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:6px">${esc(f.detail || '')}</div>`;

        if (f.suggested_action && typeof DEEPLINK_MAP !== 'undefined' && DEEPLINK_MAP[f.suggested_action]) {
          html += `<button class="btn btn-primary" style="font-size:12px" onclick="assetsDeepLink('${esc(f.suggested_action)}', ${f.entity_id || 0})">Beheben</button>`;
        }

        html += '</div>';
      }
      html += '</div>';
    } else if (blocking === 0 && warnings === 0 && infos === 0) {
      html += '<div class="empty">Keine Findings</div>';
    }

    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

// ── Preview ──────────────────────────────────────────────────────────────

async function nkLoadPreview() {
  const nk = Alpine.store('nk');
  const target = document.getElementById('nk-preview-result');
  const btn = document.getElementById('nk-preview-btn');
  if (!target || !nk.selectedPropertyCode) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Berechne...'; }
  target.innerHTML = '<div class="spinner">Vorschau wird berechnet...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch('/api/assets/nk-statements/preview', {
      method: 'POST',
      body: JSON.stringify({
        property_code: nk.selectedPropertyCode,
        year: nk.selectedYear,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    nk.previewResult = data;

    let html = '';

    // Warnings
    const previewWarnings = data.warnings || [];
    if (previewWarnings.length) {
      html += '<div style="margin-bottom:12px">';
      for (const w of previewWarnings) {
        html += `<div class="alert" style="background:rgba(234,179,8,.08);border:1px solid #eab308;color:#eab308;padding:8px 12px;border-radius:8px;margin-bottom:6px;font-size:13px">${esc(typeof w === 'string' ? w : w.message || JSON.stringify(w))}</div>`;
      }
      html += '</div>';
    }

    // Statements table
    const statements = data.statements || [];
    if (statements.length) {
      html += `<table class="assets-table">
        <thead><tr><th>Mieter</th><th>Einheit</th><th style="text-align:right">Kosten gesamt</th><th style="text-align:right">Vorauszahlung</th><th style="text-align:right">Saldo</th></tr></thead>
        <tbody>`;
      for (const s of statements) {
        if (s.is_owner_block) continue; // render separately
        const saldoColor = (s.balance || 0) >= 0 ? 'var(--green,#22c55e)' : 'var(--red,#ef4444)';
        html += `<tr>
          <td>${esc(s.tenant_name || s.tenant_names || '\u2013')}</td>
          <td>${esc(s.unit_label || '\u2013')}</td>
          <td style="text-align:right">${fmtEur(s.total_cost)}</td>
          <td style="text-align:right">${fmtEur(s.prepayment_total)}</td>
          <td style="text-align:right;color:${saldoColor};font-weight:600">${fmtEur(s.balance)}</td>
        </tr>`;
      }
      html += '</tbody></table>';
    }

    // Owner block
    const ownerBlocks = (data.statements || []).filter(s => s.is_owner_block);
    if (ownerBlocks.length) {
      html += `<div style="background:var(--bg-muted,#f5f5f5);border:1px solid var(--border);border-radius:8px;padding:14px;margin-top:12px">
        <strong style="font-size:13px">Eigent\u00fcmer-Anteil</strong>`;
      for (const o of ownerBlocks) {
        html += `<div style="margin-top:8px;font-size:13px">
          <span style="color:var(--muted)">${esc(o.unit_label || 'Eigent\u00fcmer')}</span>
          <span style="margin-left:12px">Kosten: ${fmtEur(o.total_cost)}</span>
          ${o.owner_type ? `<span style="margin-left:12px;color:var(--muted)">(${esc(fmtOwnerType(o.owner_type))})</span>` : ''}
        </div>`;
      }
      html += '</div>';
    }

    // CO2 handling
    if (data.co2_relevant) {
      html += `<div style="margin-top:12px">
        <label class="form-label">CO2-Kosten-Aufteilung</label>
        <select class="filter-select" id="nk-co2-handling" style="width:240px">
          <option value="default"${(data.co2_handling || 'default') === 'default' ? ' selected' : ''}>Standard (gesetzlich)</option>
          <option value="landlord_full"${data.co2_handling === 'landlord_full' ? ' selected' : ''}>Vermieter tr\u00e4gt 100%</option>
          <option value="tenant_full"${data.co2_handling === 'tenant_full' ? ' selected' : ''}>Mieter tr\u00e4gt 100%</option>
        </select>
      </div>`;
    }

    // Confirm warnings checkbox
    if (previewWarnings.length) {
      html += `<div style="margin-top:12px">
        <label class="form-checkbox">
          <input type="checkbox" id="nk-confirm-warnings">
          Warnungen akzeptieren und trotzdem finalisieren
        </label>
      </div>`;
    }

    // Finalize button
    html += `<div style="margin-top:16px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary" onclick="nkFinalize()" id="nk-finalize-btn">Finalisieren</button>
    </div>`;

    // Store input_hash for finalize
    if (data.input_hash) {
      html += `<input type="hidden" id="nk-input-hash" value="${esc(data.input_hash)}">`;
    }

    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Vorschau berechnen'; }
  }
}

// ── Finalize ─────────────────────────────────────────────────────────────

let _nkIdempotencyKey = null;

async function nkFinalize() {
  const nk = Alpine.store('nk');
  const btn = document.getElementById('nk-finalize-btn');
  if (!nk.selectedPropertyCode || !nk.previewResult) return;

  // Warnings check
  const hasWarnings = (nk.previewResult.warnings || []).length > 0;
  if (hasWarnings) {
    const confirmed = document.getElementById('nk-confirm-warnings')?.checked;
    if (!confirmed) {
      Alpine.store('toast').error('Bitte Warnungen akzeptieren oder Vorschau korrigieren.');
      return;
    }
  }

  // Generate new idempotency key if none exists
  if (!_nkIdempotencyKey) {
    _nkIdempotencyKey = crypto.randomUUID();
  }

  const inputHash = document.getElementById('nk-input-hash')?.value || nk.previewResult.input_hash;
  const co2El = document.getElementById('nk-co2-handling');
  const co2Handling = co2El ? co2El.value : undefined;

  const body = {
    property_code: nk.selectedPropertyCode,
    year: nk.selectedYear,
    input_hash: inputHash,
  };
  if (co2Handling && co2Handling !== 'default') body.co2_handling = co2Handling;
  if (hasWarnings) body.confirm_warnings = true;

  try {
    const result = await approvalMutation('nk-statements.finalize', 'POST', {}, body, {
      idempotencyKey: _nkIdempotencyKey,
    });

    if (result === false) {
      // Approval cancelled — regenerate idempotency key for next attempt
      _nkIdempotencyKey = null;
      return;
    }

    // Success
    _nkIdempotencyKey = null;
    Alpine.store('toast').success('Abrechnung finalisiert');
    nk.previewResult = null;
    nkSwitchSection('runs');
  } catch (e) {
    if (e.message && e.message.includes('410')) {
      Alpine.store('toast').error('Vorschau veraltet. Bitte neu berechnen.');
      nk.previewResult = null;
      nkSwitchSection('preview');
    }
    _nkIdempotencyKey = null;
  }
}

// ── Runs & Statements ────────────────────────────────────────────────────

async function nkLoadRuns() {
  const nk = Alpine.store('nk');
  const target = document.getElementById('nk-runs-list');
  if (!target || !nk.selectedPropertyCode) return;
  target.innerHTML = '<div class="spinner">Laden...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const url = composeUrl('nk-statement-runs.list') + `?property_code=${encodeURIComponent(nk.selectedPropertyCode)}&year=${nk.selectedYear}`;
    const res = await csrf.fetch(url);
    const runs = res.ok ? await res.json() : [];
    nk.runs = runs;

    if (!runs.length) {
      target.innerHTML = '<div class="empty">Noch keine Runs f\u00fcr diese Property/Jahr</div>';
      return;
    }

    let html = `<table class="assets-table">
      <thead><tr><th>Run-ID</th><th>Version</th><th>Status</th><th>Erstellt</th><th>Finalisiert</th><th>Statements</th><th>Snapshot</th></tr></thead>
      <tbody>`;
    for (const r of runs) {
      const snapshot = r.snapshot_sha ? r.snapshot_sha.slice(0, 8) : '\u2013';
      html += `<tr onclick="nkShowRunDetail(${r.id})" style="cursor:pointer">
        <td><strong>#${r.id}</strong></td>
        <td>${esc(r.engine_version || '\u2013')}</td>
        <td><span class="badge ${r.status === 'finalized' ? 'badge-green' : 'badge-blue'}">${esc(r.status || '\u2013')}</span></td>
        <td>${fmtDT(r.created_at)}</td>
        <td>${r.finalized_at ? fmtDT(r.finalized_at) : '\u2013'}</td>
        <td style="text-align:center">${r.statement_count ?? r.statements_count ?? '\u2013'}</td>
        <td><code style="font-size:11px">${esc(snapshot)}</code></td>
      </tr>`;
    }
    html += '</tbody></table>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

async function nkShowRunDetail(runId) {
  const target = document.getElementById('nk-run-detail');
  if (!target) return;
  target.innerHTML = '<div class="spinner">Laden...</div>';

  const csrf = Alpine.store('csrf');
  const nk = Alpine.store('nk');
  try {
    const url = composeUrl('nk-statement-runs.read', { run_id: runId });
    const res = await csrf.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const run = await res.json();
    nk.selectedRun = run;
    nk.statements = run.statements || [];

    let html = `<div class="card card-pad">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h4 style="font-size:14px;margin:0">Run #${run.id} \u2014 Detail</h4>
        <span class="badge ${run.status === 'finalized' ? 'badge-green' : 'badge-blue'}">${esc(run.status || '')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:16px">
        <div><strong>Engine-Version:</strong> ${esc(run.engine_version || '\u2013')}</div>
        <div><strong>Input-Hash:</strong> <code style="font-size:11px">${esc(run.input_hash || '\u2013')}</code></div>
        <div><strong>CO2-Handling:</strong> ${esc(run.co2_handling || 'default')}</div>
        <div><strong>Snapshot-SHA:</strong> <code style="font-size:11px">${esc(run.snapshot_sha || '\u2013')}</code></div>
      </div>`;

    // Run warnings
    const runWarnings = run.warnings || [];
    if (runWarnings.length) {
      html += '<div style="margin-bottom:12px">';
      for (const w of runWarnings) {
        html += `<div class="alert" style="background:rgba(234,179,8,.08);border:1px solid #eab308;color:#eab308;padding:6px 10px;border-radius:6px;margin-bottom:4px;font-size:12px">${esc(typeof w === 'string' ? w : w.message || JSON.stringify(w))}</div>`;
      }
      html += '</div>';
    }

    // Statements table
    const statements = run.statements || [];
    if (statements.length) {
      html += `<h4 style="font-size:13px;margin-bottom:8px">Statements</h4>
        <table class="assets-table" id="nk-statements-table">
        <thead><tr><th>Mieter</th><th>Einheit</th><th style="text-align:right">Saldo</th><th>PDF</th><th>Zugestellt</th><th>Aktionen</th></tr></thead>
        <tbody>`;
      for (const s of statements) {
        const isOwner = s.is_owner_block;
        const saldoColor = (s.balance || 0) >= 0 ? 'var(--green,#22c55e)' : 'var(--red,#ef4444)';
        const rowStyle = isOwner ? 'background:var(--bg-muted,#f5f5f5)' : '';

        html += `<tr style="${rowStyle}" id="nk-stmt-${s.id}">
          <td>${isOwner ? `<em style="color:var(--muted)">Eigent\u00fcmer${s.owner_type ? ' (' + esc(fmtOwnerType(s.owner_type)) + ')' : ''}</em>` : esc(s.tenant_name || s.tenant_names || '\u2013')}</td>
          <td>${esc(s.unit_label || '\u2013')}</td>
          <td style="text-align:right;color:${saldoColor};font-weight:600">${fmtEur(s.balance)}</td>
          <td>${_nkPdfBadge(s)}</td>
          <td>${s.served_at ? `<span class="badge badge-green">${fmtDate(s.served_at)}</span>` : (isOwner ? '<span style="color:var(--muted);font-size:12px">nicht servierbar</span>' : '<span class="badge badge-muted">Offen</span>')}</td>
          <td>${_nkStatementActions(s)}</td>
        </tr>`;

        // Accordion placeholder for items
        html += `<tr id="nk-stmt-items-${s.id}" style="display:none"><td colspan="6"><div id="nk-stmt-items-content-${s.id}"></div></td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html += '<div class="empty">Keine Statements in diesem Run</div>';
    }

    html += '</div>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

function _nkPdfBadge(s) {
  const status = s.pdf_render_status || 'pending';
  if (status === 'ready') return '<span class="badge badge-green">Bereit</span>';
  if (status === 'failed') return '<span class="badge badge-red">Fehler</span>';
  if (status === 'rendering') return '<span class="badge badge-yellow">Rendering...</span>';
  return '<span class="badge badge-muted">Ausstehend</span>';
}

function _nkStatementActions(s) {
  let actions = '';
  const isOwner = s.is_owner_block;

  // Items accordion toggle
  actions += `<button class="btn" style="font-size:11px" onclick="nkToggleStatementItems(${s.id})">Details</button> `;

  // PDF download
  if (s.pdf_render_status === 'ready') {
    const pdfUrl = composeUrl('nk-statements.pdf', { statement_id: s.id });
    actions += `<button class="btn" style="font-size:11px" onclick="window.open('/dashboard${pdfUrl}?token='+encodeURIComponent(TOKEN),'_blank')">PDF</button> `;
  }

  // Re-render
  if (s.pdf_render_status === 'failed' && (s.pdf_render_attempts || 0) < 5) {
    actions += `<button class="btn" style="font-size:11px" onclick="nkRerender(${s.id})" id="nk-rerender-${s.id}">Re-Render</button> `;
  }

  // Serve
  if (!isOwner && !s.superseded && s.pdf_render_status === 'ready' && !s.served_at) {
    actions += `<button class="btn btn-primary" style="font-size:11px" onclick="nkShowServeForm(${s.id})">Zugestellt</button>`;
  }

  if (isOwner && !actions.trim()) {
    actions = '<span style="color:var(--muted);font-size:11px">nicht servierbar</span>';
  }

  return actions;
}

// ── Statement Items (Accordion) ──────────────────────────────────────────

async function nkToggleStatementItems(statementId) {
  const row = document.getElementById(`nk-stmt-items-${statementId}`);
  if (!row) return;

  if (row.style.display !== 'none') {
    row.style.display = 'none';
    return;
  }

  row.style.display = '';
  const contentEl = document.getElementById(`nk-stmt-items-content-${statementId}`);
  if (!contentEl) return;
  contentEl.innerHTML = '<div class="spinner" style="font-size:12px">Laden...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const url = composeUrl('nk-statements.read', { statement_id: statementId });
    const res = await csrf.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const statement = await res.json();
    const items = statement.items || statement.line_items || [];

    if (!items.length) {
      contentEl.innerHTML = '<div class="empty" style="font-size:12px">Keine Positionen</div>';
      return;
    }

    let html = `<table class="assets-table" style="font-size:12px">
      <thead><tr><th>Kostenart</th><th style="text-align:right">Gesamtkosten</th><th>Schl\u00fcssel</th><th style="text-align:right">Mieter-Anteil</th></tr></thead>
      <tbody>`;
    for (const item of items) {
      html += `<tr>
        <td>${esc(item.cost_category_name || item.cost_category || '\u2013')}</td>
        <td style="text-align:right">${fmtEur(item.total_cost || item.amount)}</td>
        <td>${esc(item.allocation_key || item.key_type || '\u2013')}</td>
        <td style="text-align:right;font-weight:600">${fmtEur(item.tenant_share || item.allocated_amount)}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    contentEl.innerHTML = html;
  } catch (e) {
    contentEl.innerHTML = `<div class="alert alert-error" style="font-size:12px">${esc(e.message)}</div>`;
  }
}

// ── PDF Re-Render ────────────────────────────────────────────────────────

async function nkRerender(statementId) {
  const btn = document.getElementById(`nk-rerender-${statementId}`);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  const csrf = Alpine.store('csrf');
  try {
    const url = composeUrl('nk-statements.rerender', { statement_id: statementId });
    const res = await csrf.fetch(url, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `HTTP ${res.status}`);
    }
    Alpine.store('toast').success('Re-Render gestartet');
    // Refresh run detail
    const nk = Alpine.store('nk');
    if (nk.selectedRun) {
      setTimeout(() => nkShowRunDetail(nk.selectedRun.id), 2000);
    }
  } catch (e) {
    Alpine.store('toast').error('Re-Render fehlgeschlagen: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Re-Render'; }
  }
}

// ── Serve Workflow ───────────────────────────────────────────────────────

function nkShowServeForm(statementId) {
  const today = new Date().toISOString().slice(0, 10);
  openModal(`
    <h3>Zustellung best\u00e4tigen</h3>
    <div class="form-group">
      <label class="form-label">Zustelldatum</label>
      <input class="form-input" type="date" id="nk-serve-date" value="${today}">
    </div>
    <div class="form-group">
      <label class="form-label">Zustellmethode</label>
      <select class="form-select" id="nk-serve-method">
        <option value="email">E-Mail</option>
        <option value="post">Post</option>
        <option value="persoenlich">Pers\u00f6nlich</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notiz (optional)</label>
      <input class="form-input" id="nk-serve-note" placeholder="">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-primary" onclick="nkConfirmServe(${statementId})">Best\u00e4tigen</button>
    </div>
  `);
}

async function nkConfirmServe(statementId) {
  const servedAt = document.getElementById('nk-serve-date')?.value;
  const servedMethod = document.getElementById('nk-serve-method')?.value;
  const servedNote = document.getElementById('nk-serve-note')?.value?.trim() || null;

  if (!servedAt) {
    Alpine.store('toast').error('Zustelldatum ist Pflicht');
    return;
  }

  try {
    const result = await approvalMutation('nk-statements.serve', 'POST', { statement_id: statementId }, {
      served_at: servedAt,
      served_method: servedMethod,
      served_note: servedNote,
    });

    if (result === false) return; // cancelled

    closeModal();
    Alpine.store('toast').success('Zustellung eingetragen');

    // Refresh run detail
    const nk = Alpine.store('nk');
    if (nk.selectedRun) {
      nkShowRunDetail(nk.selectedRun.id);
    }
  } catch (e) {
    // approvalMutation already shows toast
  }
}

// ── §556 Obligations (property-scoped) ───────────────────────────────────

async function nkLoadObligationsForProperty() {
  const nk = Alpine.store('nk');
  const target = document.getElementById('nk-obligations-list');
  if (!target || !nk.selectedPropertyCode) return;
  target.innerHTML = '<div class="spinner">Laden...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const url = `/api/assets/properties/${nk.selectedPropertyCode}/nk-period-obligations`;
    const res = await csrf.fetch(url);
    const obligations = res.ok ? await res.json() : [];
    nk.obligations = obligations;

    if (!obligations.length) {
      target.innerHTML = '<div class="empty">Keine Pflichten f\u00fcr dieses Objekt</div>';
      return;
    }

    let html = `<table class="assets-table">
      <thead><tr><th>Objekt</th><th>Jahr</th><th>Frist bis</th><th>Status</th><th>Verbleibend</th><th>Aktionen</th></tr></thead>
      <tbody>`;

    for (const o of obligations) {
      const now = new Date();
      const deadline = o.service_deadline_at ? new Date(o.service_deadline_at) : null;
      const daysRemaining = deadline ? Math.floor((deadline - now) / 86400000) : null;

      const statusLabels = {
        pending: 'Ausstehend',
        active_run: 'In Bearbeitung',
        served: 'Zugestellt',
        expired: 'Verfristet',
        not_applicable: 'Nicht anwendbar',
      };
      const statusLabel = statusLabels[o.status] || o.status;
      const statusClass = `status-${o.status || 'pending'}`;

      let actions = '';
      if (o.status === 'pending') {
        actions += `<button class="btn" style="font-size:11px" onclick="nkObligationMarkNotApplicable(${o.id})">Nicht anwendbar</button> `;
        actions += `<button class="btn btn-danger" style="font-size:11px" onclick="nkObligationMarkExpired(${o.id})">Verfristet</button>`;
      } else if (o.status === 'active_run') {
        actions += `<button class="btn btn-danger" style="font-size:11px" onclick="nkObligationMarkExpired(${o.id})">Verfristet</button>`;
      } else if (o.status === 'expired') {
        actions += `<button class="btn" style="font-size:11px" onclick="nkObligationReopen(${o.id})">Wieder\u00f6ffnen</button>`;
      }

      html += `<tr>
        <td>${esc(o.property_name || o.property_code || o.property_id || '')}</td>
        <td>${o.year || (o.period_end ? o.period_end.slice(0, 4) : '\u2013')}</td>
        <td>${fmtDate(o.service_deadline_at)}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${daysRemaining != null ? (daysRemaining >= 0 ? daysRemaining + ' Tage' : '<span style="color:var(--red)">Ueberfaellig</span>') : '\u2013'}</td>
        <td>${actions}</td>
      </tr>`;
    }

    html += '</tbody></table>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

async function nkObligationMarkNotApplicable(obligationId) {
  const notes = prompt('Begr\u00fcndung (Pflicht):');
  if (!notes) return;
  try {
    await approvalMutation('nk-period-obligations.update', 'PATCH', { obligation_id: obligationId }, {
      status: 'not_applicable',
      notes: notes,
    });
    nkLoadObligationsForProperty();
  } catch (e) {}
}

async function nkObligationMarkExpired(obligationId) {
  if (!confirm('Als verfristet markieren?')) return;
  try {
    await approvalMutation('nk-period-obligations.update', 'PATCH', { obligation_id: obligationId }, {
      status: 'expired',
    });
    nkLoadObligationsForProperty();
  } catch (e) {}
}

async function nkObligationReopen(obligationId) {
  if (!confirm('Pflicht wieder\u00f6ffnen?')) return;
  try {
    await approvalMutation('nk-period-obligations.update', 'PATCH', { obligation_id: obligationId }, {
      status: 'pending',
    });
    nkLoadObligationsForProperty();
  } catch (e) {}
}
