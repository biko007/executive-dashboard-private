/* ═══════════════════════════════════════════════════════════════════════════
   Assets Stores — Alpine.js stores for CSRF, Approval, Wizard, Toast
   Sprint 5.5a-2 Stage a
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Toast Container — injected in alpine:init (body exists by then) ─────────

function _initToastContainer() {
  if (document.getElementById('toast-container')) return;
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.className = 'toast-container';
  document.body.appendChild(el);
}

// ── URL builder from endpoint key ───────────────────────────────────────────

const ENDPOINT_MAP = {
  'properties.list':                 () => '/api/assets/properties',
  'properties.create':               () => '/api/assets/properties',
  'properties.read':                 (p) => `/api/assets/properties/${p.property_id}`,
  'properties.update':               (p) => `/api/assets/properties/${p.property_id}`,
  'property-heating-config.read':    (p) => `/api/assets/properties/${p.property_id}/heating-config`,
  'property-heating-config.update':  (p) => `/api/assets/properties/${p.property_id}/heating-config`,
  'units.list':                      (p) => `/api/assets/properties/${p.property_code}/units`,
  'units.create':                    (p) => `/api/assets/properties/${p.property_code}/units`,
  'units.read':                      (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}`,
  'units.update':                    (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}`,
  'units.archive':                   (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}/archive`,
  'unit-residents.list':             (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}/residents`,
  'unit-residents.create':           (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}/residents`,
  'unit-residents.read':             (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}/residents`,
  'unit-residents.update':           (p) => `/api/assets/properties/${p.property_code}/units/${p.unit_code}/residents`,
  'tenants.list':                    () => '/api/assets/tenants',
  'tenants.create':                  () => '/api/assets/tenants',
  'tenants.read':                    (p) => `/api/assets/tenants/${p.tenant_id}`,
  'tenants.update':                  (p) => `/api/assets/tenants/${p.tenant_id}`,
  'tenants.archive':                 (p) => `/api/assets/tenants/${p.tenant_id}/archive`,
  'leases.list':                     () => '/api/assets/leases',
  'leases.create':                   () => '/api/assets/leases',
  'leases.read':                     (p) => `/api/assets/leases/${p.lease_id}`,
  'leases.update':                   (p) => `/api/assets/leases/${p.lease_id}`,
  'leases.end':                      (p) => `/api/assets/leases/${p.lease_id}/end`,
  'leases.revoke-end':               (p) => `/api/assets/leases/${p.lease_id}/revoke-end`,
  'leases.move-out':                 (p) => `/api/assets/leases/${p.lease_id}/move-out`,
  'lease-charges.list':              (p) => `/api/assets/leases/${p.lease_id}/charges`,
  'lease-charges.create':            (p) => `/api/assets/leases/${p.lease_id}/charges`,
  'lease-charges.read':              (p) => `/api/assets/leases/${p.lease_id}/charges`,
  'lease-charges.update':            (p) => `/api/assets/leases/${p.lease_id}/charges`,
  'lease-charges.archive':           (p) => `/api/assets/leases/${p.lease_id}/charges`,
  'cost-categories.list':            () => '/api/assets/cost-categories',
  'expense-bookings.list':           (p) => `/api/assets/properties/${p.property_code}/expense-bookings`,
  'expense-bookings.create':         (p) => `/api/assets/properties/${p.property_code}/expense-bookings`,
  'expense-bookings.read':           (p) => `/api/assets/properties/${p.property_code}/expense-bookings/${p.booking_id}`,
  'expense-bookings.update':         (p) => `/api/assets/properties/${p.property_code}/expense-bookings/${p.booking_id}`,
  'expense-bookings.archive':        (p) => `/api/assets/properties/${p.property_code}/expense-bookings/${p.booking_id}`,
  'allocation-rules.list':           (p) => `/api/assets/properties/${p.property_code}/allocation-rules`,
  'allocation-rules.create':         (p) => `/api/assets/properties/${p.property_code}/allocation-rules`,
  'allocation-rules.read':           (p) => `/api/assets/allocation-rules/${p.rule_id}`,
  'allocation-rules.update':         (p) => `/api/assets/allocation-rules/${p.rule_id}`,
  'allocation-rules.archive':        (p) => `/api/assets/allocation-rules/${p.rule_id}/archive`,
  'allocation-rule-shares.list':     (p) => `/api/assets/allocation-rules/${p.rule_id}/shares`,
  'allocation-rule-shares.create':   (p) => `/api/assets/allocation-rules/${p.rule_id}/shares`,
  'allocation-rule-shares.read':     (p) => `/api/assets/allocation-rules/${p.rule_id}/shares/${p.share_id}`,
  'allocation-rule-shares.update':   (p) => `/api/assets/allocation-rules/${p.rule_id}/shares/${p.share_id}`,
  'allocation-rule-shares.archive':  (p) => `/api/assets/allocation-rules/${p.rule_id}/shares/${p.share_id}`,
  'meters.list':                     (p) => `/api/assets/properties/${p.property_code}/meters`,
  'meters.create':                   (p) => `/api/assets/properties/${p.property_code}/meters`,
  'meters.read':                     (p) => `/api/assets/meters/${p.meter_id}`,
  'meters.update':                   (p) => `/api/assets/meters/${p.meter_id}`,
  'meters.archive':                  (p) => `/api/assets/meters/${p.meter_id}/archive`,
  'meter-readings.list':             (p) => `/api/assets/meters/${p.meter_id}/readings`,
  'meter-readings.create':           (p) => `/api/assets/meters/${p.meter_id}/readings`,
  'meter-readings.read':             (p) => `/api/assets/meters/${p.meter_id}/readings/${p.reading_id}`,
  'meter-readings.update':           (p) => `/api/assets/meters/${p.meter_id}/readings/${p.reading_id}`,
  'meter-readings.bulk':             (p) => `/api/assets/meters/${p.meter_id}/readings/bulk`,
  'approval-preview':                () => '/api/assets/approval-preview',
  'lease-changeovers.create':        () => '/api/assets/lease-changeovers',
  'nk-readiness':                    (p) => `/api/assets/properties/${p.property_code}/nk-readiness`,
  'nk-period-obligations.by-property': (p) => `/api/assets/properties/${p.property_code}/nk-period-obligations`,
  'nk-period-obligations.list':      () => '/api/assets/nk-period-obligations',
  'nk-period-obligations.read':      (p) => `/api/assets/nk-period-obligations/${p.obligation_id}`,
  'nk-period-obligations.update':    (p) => `/api/assets/nk-period-obligations/${p.obligation_id}`,
  'audit-log':                       () => '/api/assets/audit-log',
  'nk-statements.preview':           () => '/api/assets/nk-statements/preview',
  'nk-statements.finalize':          () => '/api/assets/nk-statements/finalize',
  'nk-statements.read':              (p) => `/api/assets/nk-statements/${p.statement_id}`,
  'nk-statements.pdf':               (p) => `/api/assets/nk-statements/${p.statement_id}/pdf`,
  'nk-statements.rerender':          (p) => `/api/assets/nk-statements/${p.statement_id}/rerender`,
  'nk-statements.serve':             (p) => `/api/assets/nk-statements/${p.statement_id}/serve`,
  'nk-statement-runs.list':          () => '/api/assets/nk-statement-runs',
  'nk-statement-runs.read':          (p) => `/api/assets/nk-statement-runs/${p.run_id}`,
};

function composeUrl(endpointKey, pathParams) {
  const builder = ENDPOINT_MAP[endpointKey];
  if (!builder) throw new Error(`Unknown endpoint: ${endpointKey}`);
  return builder(pathParams || {});
}

// ── CSRF-aware fetch ────────────────────────────────────────────────────────

function _assetsApiFetch(url, opts = {}) {
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = '/dashboard' + url + sep + 'token=' + encodeURIComponent(TOKEN);
  return fetch(fullUrl, {
    credentials: 'include',
    ...opts,
  });
}

// ── Register stores on Alpine.start ─────────────────────────────────────────

document.addEventListener('alpine:init', () => {
  _initToastContainer();

  // ── CSRF Store ──────────────────────────────────────────────────────────

  Alpine.store('csrf', {
    token: '',
    refreshing: false,
    queue: [], // pending mutation promises during refresh

    init() {
      // Read from meta tag if present
      const meta = document.querySelector('meta[name="csrf-token"]');
      if (meta && meta.content) this.token = meta.content;
    },

    async refresh() {
      if (this.refreshing) {
        // Wait for in-progress refresh
        return new Promise((resolve) => { this.queue.push(resolve); });
      }
      this.refreshing = true;
      try {
        const res = await _assetsApiFetch('/api/csrf-refresh');
        if (!res.ok) throw new Error('CSRF refresh failed');
        const data = await res.json();
        this.token = data.token;
        // Update meta tag
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) meta.content = data.token;
        // Resolve queued callers
        this.queue.forEach(fn => fn());
        this.queue = [];
      } finally {
        this.refreshing = false;
      }
    },

    async fetch(url, opts = {}) {
      // Add CSRF token to mutation headers
      const method = (opts.method || 'GET').toUpperCase();
      const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

      if (isMutation && !this.token) {
        await this.refresh();
      }

      const headers = { ...(opts.headers || {}) };
      if (isMutation) {
        headers['X-CSRF-Token'] = this.token;
        if (!headers['Content-Type'] && opts.body) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const res = await _assetsApiFetch(url, { ...opts, headers });

      // Auto-retry on CSRF_INVALID
      if (res.status === 403 && isMutation) {
        try {
          const body = await res.clone().json();
          if (body?.error?.code === 'CSRF_INVALID' || (typeof body?.error === 'string' && body.error.includes('CSRF'))) {
            await this.refresh();
            headers['X-CSRF-Token'] = this.token;
            return _assetsApiFetch(url, { ...opts, headers });
          }
        } catch {}
      }

      return res;
    },
  });

  // ── Toast Store ──────────────────────────────────────────────────────────

  Alpine.store('toast', {
    items: [],

    _show(msg, type, duration) {
      const id = Date.now() + Math.random();
      const container = document.getElementById('toast-container');
      if (!container) return;

      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.textContent = msg;
      el.dataset.toastId = id;
      container.appendChild(el);

      setTimeout(() => {
        el.classList.add('toast-out');
        setTimeout(() => el.remove(), 300);
      }, duration || 4000);
    },

    success(msg) { this._show(msg, 'success', 3000); },
    error(msg)   { this._show(msg, 'error', 6000); },
    info(msg)    { this._show(msg, 'info', 4000); },
  });

  // ── Approval Store ───────────────────────────────────────────────────────

  Alpine.store('approval', {
    visible: false,
    diff: null,
    warnings: [],
    expiresAt: null,
    approvalToken: null,
    endpointKey: null,
    httpMethod: null,
    pathParams: null,
    body: null,
    options: null,
    _resolve: null,
    _reject: null,
    timerText: '',
    _timerInterval: null,

    show(data) {
      this.visible = true;
      this.diff = data.diff || {};
      this.warnings = data.warnings || [];
      this.expiresAt = data.expiresAt;
      this.approvalToken = data.approvalToken;
      this.endpointKey = data.endpointKey;
      this.httpMethod = data.httpMethod;
      this.pathParams = data.pathParams;
      this.body = data.body;
      this.options = data.options || {};
      this._startTimer();

      return new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    },

    _startTimer() {
      if (this._timerInterval) clearInterval(this._timerInterval);
      this._timerInterval = setInterval(() => {
        if (!this.expiresAt) return;
        const remaining = Math.max(0, Math.floor((new Date(this.expiresAt) - Date.now()) / 1000));
        if (remaining <= 0) {
          this.timerText = 'Abgelaufen';
          clearInterval(this._timerInterval);
          return;
        }
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        this.timerText = `${m}:${String(s).padStart(2, '0')}`;
      }, 1000);
    },

    async confirm() {
      try {
        const url = composeUrl(this.endpointKey, this.pathParams);
        const headers = {
          'Content-Type': 'application/json',
          'X-Approval-Token': this.approvalToken,
        };
        if (this.options?.idempotencyKey) {
          headers['Idempotency-Key'] = this.options.idempotencyKey;
        }
        const csrf = Alpine.store('csrf');
        const res = await csrf.fetch(url, {
          method: this.httpMethod,
          headers,
          body: JSON.stringify(this.body),
        });
        if (res.status === 410) {
          Alpine.store('toast').error('Genehmigung abgelaufen. Bitte neu pruefen.');
          this.close();
          if (this._resolve) this._resolve(false);
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.error || `HTTP ${res.status}`);
        }
        const result = await res.json().catch(() => ({}));
        Alpine.store('toast').success('Gespeichert');
        this.close();
        if (this._resolve) this._resolve(result);
      } catch (e) {
        Alpine.store('toast').error('Fehler: ' + e.message);
        if (this._reject) this._reject(e);
      }
    },

    cancel() {
      this.close();
      if (this._resolve) this._resolve(false);
    },

    close() {
      this.visible = false;
      this.diff = null;
      this.warnings = [];
      this.approvalToken = null;
      if (this._timerInterval) clearInterval(this._timerInterval);
      this._timerInterval = null;
    },
  });

  // ── Wizard Store ─────────────────────────────────────────────────────────

  Alpine.store('wizard', {
    active: false,
    step: 1,
    totalSteps: 5,
    unitId: null,
    propertyId: null,
    idempotencyKey: '',

    // Step 1: Vertragsende & Auszug
    end_date: '',
    actual_move_out: '',
    termination_reason: '',
    handover_note: '',

    // Step 2: End-Ablesungen
    end_readings: [],

    // Step 3: Neuer Mieter + Personenzahl
    tenants: [],
    new_tenant_mode: false,
    new_tenant_form: { name: '', company: '', email: '', phone: '', iban: '', address_street: '', address_postal: '', address_city: '' },
    new_unit_residents: { resident_count: null, valid_from: '', notes: '' },

    // Step 4: Neuer Lease
    new_lease: {
      lease_type: 'residential_permanent',
      start_date: '',
      handover_at: '',
      kaltmiete: '',
      nk_vorauszahlung: '',
      heizkosten_vorauszahlung: '',
      kaution: '',
      rent_due_day: 1,
      payment_method: 'bank_transfer',
      billing_mode: 'vorauszahlung',
    },
    start_readings: [],

    // Step 5: Confirmation
    error: null,
    errorStep: null,

    reset() {
      this.active = false;
      this.step = 1;
      this.unitId = null;
      this.propertyId = null;
      this.idempotencyKey = '';
      this.end_date = '';
      this.actual_move_out = '';
      this.termination_reason = '';
      this.handover_note = '';
      this.end_readings = [];
      this.tenants = [];
      this.new_tenant_mode = false;
      this.new_tenant_form = { name: '', company: '', email: '', phone: '', iban: '', address_street: '', address_postal: '', address_city: '' };
      this.new_unit_residents = { resident_count: null, valid_from: '', notes: '' };
      this.new_lease = {
        lease_type: 'residential_permanent',
        start_date: '',
        handover_at: '',
        kaltmiete: '',
        nk_vorauszahlung: '',
        heizkosten_vorauszahlung: '',
        kaution: '',
        rent_due_day: 1,
        payment_method: 'bank_transfer',
        billing_mode: 'vorauszahlung',
      };
      this.start_readings = [];
      this.error = null;
      this.errorStep = null;
    },

    start(propertyId, unitId) {
      this.reset();
      this.active = true;
      this.propertyId = propertyId;
      this.unitId = unitId;
      this.idempotencyKey = crypto.randomUUID();
      this.new_unit_residents.valid_from = '';
    },

    nextStep() {
      if (this.step < this.totalSteps) this.step++;
    },
    prevStep() {
      if (this.step > 1) this.step--;
    },
    goToStep(n) {
      if (n >= 1 && n <= this.totalSteps) this.step = n;
    },
  });

  // ── NK Store ─────────────────────────────────────────────────────────

  Alpine.store('nk', {
    selectedPropertyCode: null,
    selectedYear: 2024,
    activeSubTab: 'precheck', // precheck | preview | runs | obligations

    preCheck: null,
    previewResult: null,
    runs: [],
    selectedRun: null,
    statements: [],
    obligations: [],

    loading: false,
    error: null,
  });

  // ── Root Assets Component ──────────────────────────────────────────────

  Alpine.data('assetsRoot', () => ({
    activeSubTab: 'stammdaten',
    loading: true,
    error: null,
    properties: [],
    deepLink: null,

    init() {
      this.loadInitialData();
    },

    async loadInitialData() {
      this.loading = true;
      try {
        // Fetch CSRF token
        await Alpine.store('csrf').refresh();

        // Parse deep-link params from URL
        const params = new URLSearchParams(window.location.search);
        if (params.has('assets_subtab')) {
          this.activeSubTab = params.get('assets_subtab');
        }
        if (params.has('assets_entity_id')) {
          this.deepLink = {
            entityId: params.get('assets_entity_id'),
            action: params.get('assets_action') || null,
          };
        }

        this.loading = false;
      } catch (e) {
        this.error = e.message;
        this.loading = false;
      }
    },

    switchSubTab(tab) {
      this.activeSubTab = tab;
    },

    isSubTab(tab) {
      return this.activeSubTab === tab;
    },
  }));
});

// ── Approval Mutation Helper (global) ───────────────────────────────────────

async function approvalMutation(endpointKey, httpMethod, pathParams, body, options = {}) {
  const csrf = Alpine.store('csrf');
  const toast = Alpine.store('toast');
  const approval = Alpine.store('approval');

  const previewEndpointKey = options.previewEndpointKey || 'approval-preview';
  const previewUrl = composeUrl(previewEndpointKey);
  const targetUrl = composeUrl(endpointKey, pathParams);

  try {
    // Step 1: Preview
    const previewRes = await csrf.fetch(previewUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint_key: endpointKey,
        http_method: httpMethod,
        method: httpMethod,
        path_params: pathParams,
        body: body,
      }),
    });

    if (!previewRes.ok) {
      const err = await previewRes.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `Preview HTTP ${previewRes.status}`);
    }

    const preview = await previewRes.json();

    // Step 2: Show approval modal
    const result = await approval.show({
      diff: preview.diff || {},
      warnings: preview.warnings || [],
      expiresAt: preview.expires_at,
      approvalToken: preview.approval_token,
      endpointKey,
      httpMethod,
      pathParams,
      body,
      options,
    });

    return result;
  } catch (e) {
    toast.error('Fehler: ' + e.message);
    throw e;
  }
}

// ── Drawer helpers (global) ─────────────────────────────────────────────────

function openDrawer(html) {
  closeDrawer();
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'drawer-overlay';
  overlay.innerHTML = `<div class="drawer">${html}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDrawer();
  });
  document.body.appendChild(overlay);
}

function closeDrawer() {
  const el = document.getElementById('drawer-overlay');
  if (el) el.remove();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});
