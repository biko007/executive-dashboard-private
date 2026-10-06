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
  'open_meter_list': (entityId) => { assetsSwitchSubTab('vertraege'); vertraegeSwitch('meters'); },
  'open_expense_booking': (entityId) => assetsEditExpense(entityId),
  'open_allocation_rule': (entityId) => { assetsSwitchSubTab('vertraege'); vertraegeSwitch('allocation'); },
};

/* Globale Bruecke in den Assets-Unterbereich. Alle vier Unterbereiche sind
   gleichzeitig im DOM (x-show, x-init beim Aufbau) — es genuegt also, den
   sichtbaren zu wechseln. */
function assetsSwitchSubTab(tab) {
  const el = document.querySelector('[x-data="assetsRoot"]');
  if (!el) return;
  try { Alpine.$data(el).switchSubTab(tab); } catch { /* Komponente nicht bereit */ }
}

/* P1-6: Zielansicht eines Nebenkosten-Befunds. Der Core liefert kein
   suggested_action; das Ziel kommt aus der Zuordnung in nk-befunde.js.
   Einheiten- und Objektbefunde landen im Objekt-Schubfach — dort stehen die
   Heizungskonfiguration UND die Einheitenliste mit Verweis in jede Einheit. */
function nkBeheben(ziel, propertyCode, entityId) {
  switch (ziel) {
    case 'objekt':
    case 'einheiten':
      assetsSwitchSubTab('stammdaten');
      assetsOpenPropertyDrawer(propertyCode);
      break;
    case 'zaehler':
      assetsSwitchSubTab('vertraege');
      vertraegeSwitch('meters');
      break;
    case 'verteilung':
      assetsSwitchSubTab('vertraege');
      vertraegeSwitch('allocation');
      break;
    case 'ausgaben':
      assetsSwitchSubTab('vertraege');
      vertraegeSwitch('expenses');
      break;
    case 'vertrag':
      if (entityId) { assetsOpenLeaseDrawer(entityId); }
      else { assetsSwitchSubTab('vertraege'); vertraegeSwitch('leases'); }
      break;
    default:
      break;
  }
}

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
          <h3 style="font-size:15px;margin-bottom:16px">Abrechnungsreife je Objekt und Jahr</h3>
          <table class="assets-table">
            <thead><tr><th>Objekt</th>`;
      for (const y of years) html += `<th style="text-align:center">${y}</th>`;
      html += `</tr></thead><tbody id="nk-readiness-tbody">`;

      for (const p of this.properties) {
        html += `<tr><td><strong>${esc(p.name || p.code || 'ID ' + p.id)}</strong></td>`;
        for (const y of years) {
          html += `<td style="text-align:center" id="nk-${p.code}-${y}"><span class="spinner" style="font-size:13px;padding:0">...</span></td>`;
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
          cell.innerHTML = '<span class="nk-badge nk-badge-grau" title="HTTP ' + res.status
            + '">Nicht abrufbar</span>';
          continue;
        }
        const data = await res.json();
        /* P1-6: Die Zelle zeigte nur eine nackte Zahl ("2", "3"); die
           Erlaeuterung steckte ausschliesslich im title-Attribut und war damit
           nur per Hover erreichbar (Spec §6: nichts nur ueber Hover).
           Jetzt steht der benannte Zustand in der Zelle. */
        const ampel = nkAmpel(data);
        cell.innerHTML = `<span class="nk-badge ${ampel.klasse}" style="cursor:pointer"
          onclick="event.stopPropagation();showNkFindings('${esc(p.code)}', ${y})"
          title="${esc(ampel.lang)}">${esc(ampel.kurz)}</span>
          <div class="nk-matrix-sub">${esc(ampel.lang)}</div>`;
      } catch (e) {
        /* Ladefehler ist nicht "bereit" und nicht "keine Befunde". */
        cell.innerHTML = '<span class="nk-badge nk-badge-grau" title="' + esc(e.message || 'Abruf fehlgeschlagen')
          + '">Nicht abrufbar</span>';
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
      target.innerHTML = '<div class="card card-pad"><div class="empty">'
        + '<div style="font-weight:600;color:var(--text);margin-bottom:6px">Keine Befunde</div>'
        + '<div style="font-size:13px">Die Prüfung lief durch und hat nichts beanstandet.</div>'
        + '</div></div>';
      return;
    }

    /* P1-6: dieselbe Lesefehler-Korrektur wie im Pre-Check — 'blocker' statt
       'blocking', `message` statt `detail` — plus die deutschen Erklaerungen
       aus nk-befunde.js. */
    let html = `<div class="card card-pad">
      <h4 style="font-size:14px;margin-bottom:12px">Befunde — Objekt ${esc(propertyId)} / ${year}</h4>
      <div class="nk-befundliste">`;

    for (const f of findings) {
      html += nkBefundBlock(f, propertyId, year);
    }

    html += '</div></div>';
    target.innerHTML = html;
  } catch (e) {
    /* Ladefehler ist nicht "keine Befunde". */
    target.innerHTML = '<div class="card card-pad"><div class="ds-leerzustand">'
      + '<span class="ds-leer-symbol" aria-hidden="true">\u26a0\ufe0f</span><div>'
      + '<div class="ds-leer-titel">Befunde konnten nicht geladen werden</div>'
      + '<div class="ds-leer-sub">' + esc(e.message)
      + ' \u2014 der Bereitschaftszustand ist unbekannt, nicht in Ordnung.</div>'
      + '<div style="margin-top:12px"><button class="btn btn-primary" style="font-size:13px"'
      + ' onclick="showNkFindings(\'' + esc(propertyId) + '\', ' + Number(year) + ')">Erneut versuchen</button></div>'
      + '</div></div></div>';
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
      target.innerHTML = '<div class="empty">Keine Audit-Einträge</div>';
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
        <td style="color:var(--muted);font-size:13px">${esc(e.actor || '')}</td>
        <td style="font-size:13px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(JSON.stringify(e.changes || e.masked_changes || ''))}</td>
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
