/* ═══════════════════════════════════════════════════════════════════════════
   Assets Status & NK-Readiness — Sub-Tab 3
   NK-Readiness, Obligations, Audit Viewer
   Sprint 5.5a-2 Stages g-i
   ═══════════════════════════════════════════════════════════════════════════ */

// Deep-link action map
const DEEPLINK_MAP = {
  'open_property_drawer': (entityId) => assetsOpenPropertyDrawer(entityId),
  'open_unit_drawer': (entityId) => assetsOpenUnitDrawer(entityId, null),
  'open_lease_drawer': (entityId) => assetsOpenLeaseDrawer(entityId),
  'open_meter_list': (entityId) => { vertraegeSwitch('meters'); },
  'open_expense_booking': (entityId) => assetsEditExpense(entityId),
  'open_allocation_rule': (entityId) => { vertraegeSwitch('allocation'); },
};

document.addEventListener('alpine:init', () => {

  Alpine.data('statusTab', () => ({
    loaded: false,
    section: 'nk-readiness', // nk-readiness | obligations | audit
    properties: [],
    showAdvanced: false,

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      await this.loadProperties();
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
      this.section = s;
      this.$nextTick(() => this.renderContent());
    },

    renderContent() {
      const target = this.$refs.statusContent;
      if (!target) return;

      let html = `<div class="filters-row" style="margin-bottom:16px">
        <button class="btn ${this.section === 'nk-readiness' ? 'btn-primary' : ''}" onclick="statusSwitch('nk-readiness')">NK-Readiness</button>
        <button class="btn ${this.section === 'audit' ? 'btn-primary' : ''}" onclick="statusSwitch('audit')">Erweitert</button>
      </div>`;

      if (this.section === 'nk-readiness') {
        html += this._renderNkReadiness();
      } else if (this.section === 'audit') {
        html += this._renderAuditViewer();
      }

      target.innerHTML = html;

      // Auto-load data for active section
      if (this.section === 'nk-readiness') loadNkReadiness();
    },

    _renderNkReadiness() {
      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2];
      let html = `
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:16px">NK-Readiness Uebersicht</h3>
          <table class="assets-table">
            <thead><tr><th>Objekt</th>`;
      for (const y of years) html += `<th style="text-align:center">${y}</th>`;
      html += `</tr></thead><tbody id="nk-readiness-tbody">`;

      for (const p of this.properties) {
        html += `<tr><td><strong>${esc(p.name || p.code || 'ID ' + p.id)}</strong></td>`;
        for (const y of years) {
          html += `<td style="text-align:center" id="nk-${p.code}-${y}"><span class="spinner" style="font-size:11px;padding:0">...</span></td>`;
        }
        html += '</tr>';
      }

      html += '</tbody></table></div>';
      html += '<div id="nk-findings-detail" style="margin-top:16px"></div>';
      return html;
    },

    _renderAuditViewer() {
      return `
        <div class="card card-pad">
          <h3 style="font-size:15px;margin-bottom:16px">Audit-Log</h3>
          <div class="filters-row">
            <input class="form-input" placeholder="Entity-Typ..." id="audit-entity-type" style="width:150px">
            <input class="form-input" placeholder="Entity-ID..." id="audit-entity-id" style="width:100px">
            <input class="form-input" type="date" id="audit-since" style="width:150px">
            <button class="btn btn-primary" onclick="loadAuditLog()">Suchen</button>
          </div>
          <div id="audit-results"><div class="empty">Filter setzen und suchen</div></div>
        </div>
      `;
    },
  }));
});

// ── Global helpers for Status tab ───────────────────────────────────────────

function statusSwitch(section) {
  const tabEl = document.querySelector('[x-data="statusTab"]');
  if (tabEl) {
    const d = Alpine.$data(tabEl);
    d.section = section;
    d.$nextTick(() => d.renderContent());
  }
}

// ── NK-Readiness ────────────────────────────────────────────────────────────

async function loadNkReadiness() {
  const csrf = Alpine.store('csrf');
  const tabEl = document.querySelector('[x-data="statusTab"]');
  const properties = tabEl ? (Alpine.$data(tabEl)?.properties || []) : [];
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  for (const p of properties) {
    for (const y of years) {
      const cell = document.getElementById(`nk-${p.code}-${y}`);
      if (!cell) continue;
      try {
        const res = await csrf.fetch(`/api/assets/properties/${p.code}/nk-readiness?year=${y}`);
        if (!res.ok) {
          cell.innerHTML = '<span class="badge badge-muted">–</span>';
          continue;
        }
        const data = await res.json();
        const blocking = data.blocking_count || 0;
        const warnings = data.warning_count || 0;
        const infos = data.info_count || 0;

        let badgeClass, icon;
        if (blocking > 0) {
          badgeClass = 'nk-badge-red';
          icon = blocking;
        } else if (warnings > 0 || infos > 0) {
          badgeClass = 'nk-badge-yellow';
          icon = warnings + infos;
        } else {
          badgeClass = 'nk-badge-green';
          icon = '✓';
        }

        cell.innerHTML = `<span class="nk-badge ${badgeClass}" onclick="event.stopPropagation();showNkFindings('${esc(p.code)}', ${y})" title="${blocking} Blocker, ${warnings} Warnungen, ${infos} Infos">${icon}</span>`;
      } catch {
        cell.innerHTML = '<span class="badge badge-muted">?</span>';
      }
    }
  }
}

async function showNkFindings(propertyId, year) {
  const target = document.getElementById('nk-findings-detail');
  if (!target) return;
  target.innerHTML = '<div class="spinner">Laden...</div>';

  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(`/api/assets/properties/${propertyId}/nk-readiness?year=${year}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const findings = data.findings || [];

    if (!findings.length) {
      target.innerHTML = '<div class="card card-pad"><div class="empty">Keine Findings</div></div>';
      return;
    }

    let html = `<div class="card card-pad">
      <h4 style="font-size:14px;margin-bottom:12px">Findings — Objekt ${propertyId} / ${year}</h4>`;

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

      if (f.suggested_action && DEEPLINK_MAP[f.suggested_action]) {
        html += `<button class="btn btn-primary" style="font-size:12px" onclick="assetsDeepLink('${esc(f.suggested_action)}', ${f.entity_id || 0})">Beheben</button>`;
      }

      html += '</div>';
    }

    html += '</div>';
    target.innerHTML = html;
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}

function assetsDeepLink(action, entityId) {
  const handler = DEEPLINK_MAP[action];
  if (handler) handler(entityId);
}

// ── Audit Viewer ────────────────────────────────────────────────────────────

let _auditOffset = 0;
const _auditLimit = 50;

async function loadAuditLog(append) {
  const target = document.getElementById('audit-results');
  if (!target) return;

  if (!append) {
    _auditOffset = 0;
    target.innerHTML = '<div class="spinner">Laden...</div>';
  }

  const entityType = document.getElementById('audit-entity-type')?.value || '';
  const entityId = document.getElementById('audit-entity-id')?.value || '';
  const since = document.getElementById('audit-since')?.value || '';

  let url = `/api/assets/audit-log?limit=${_auditLimit}&offset=${_auditOffset}`;
  if (entityType) url += `&entity_type=${encodeURIComponent(entityType)}`;
  if (entityId) url += `&entity_id=${encodeURIComponent(entityId)}`;
  if (since) url += `&since=${encodeURIComponent(since)}`;

  const csrf = Alpine.store('csrf');
  try {
    const res = await csrf.fetch(url);
    const entries = res.ok ? await res.json() : [];

    if (!entries.length && !append) {
      target.innerHTML = '<div class="empty">Keine Audit-Eintraege</div>';
      return;
    }

    let html = append ? '' : `<table class="assets-table">
      <thead><tr><th>Zeitpunkt</th><th>Aktion</th><th>Entity</th><th>Akteur</th><th>Details</th></tr></thead>
      <tbody>`;

    for (const e of entries) {
      html += `<tr>
        <td style="white-space:nowrap">${fmtDT(e.created_at)}</td>
        <td><span class="badge badge-blue">${esc(e.action || '')}</span></td>
        <td>${esc(e.entity_type || '')}:${e.entity_id || ''}</td>
        <td style="color:var(--muted);font-size:12px">${esc(e.actor || '')}</td>
        <td style="font-size:12px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(JSON.stringify(e.changes || e.masked_changes || ''))}</td>
      </tr>`;
    }

    if (!append) {
      html += '</tbody></table>';
      if (entries.length >= _auditLimit) {
        html += `<div style="text-align:center;margin-top:12px"><button class="btn" onclick="_auditOffset+=${_auditLimit};loadAuditLog(true)">Mehr laden</button></div>`;
      }
      target.innerHTML = html;
    } else {
      const tbody = target.querySelector('tbody');
      if (tbody) tbody.insertAdjacentHTML('beforeend', html);
      _auditOffset += entries.length;
    }
  } catch (e) {
    target.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
  }
}
