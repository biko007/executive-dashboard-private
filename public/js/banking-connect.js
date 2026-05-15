/* ═══════════════════════════════════════════════════════════════════════════
   Banking Connect — Alpine.js form + ENDPOINT_MAP extension
   Sprint 7b Etappe d.1

   Hard rules:
     - PIN NEVER in URL, localStorage, sessionStorage, or error messages
     - autocomplete="new-password" on PIN field
     - Form reset + JS null after response
     - Submit single-shot (disabled during request)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── ENDPOINT_MAP Extension for Banking ──────────────────────────────────────

Object.assign(ENDPOINT_MAP, {
  'banking.institutions.list':   () => '/api/banking/institutions',
  'banking.accounts.list':       () => '/api/banking/accounts',
  'banking-connect.initiate':    () => '/api/banking/connect',
  'banking-complete-tan':        () => '/api/banking/complete-tan',
  'banking.approval-preview':    () => '/api/banking/approval-preview',
});

// ── Banking Approval Mutation Helper ────────────────────────────────────────

async function bankingApprovalMutation(endpointKey, httpMethod, pathParams, body, options) {
  return approvalMutation(endpointKey, httpMethod, pathParams, body, {
    ...options,
    previewEndpointKey: 'banking.approval-preview',
  });
}

// ── Banking Connect Form — Alpine Component ─────────────────────────────────

function bankingConnectFormHtml() {
  return `
    <div class="card card-pad" style="max-width:520px">
      <h3 style="margin-bottom:16px">Bank verbinden</h3>

      <!-- Form -->
      <template x-if="!connectResult">
        <form @submit.prevent="submitConnect()" autocomplete="off">
          <div class="form-group">
            <label class="form-label">Bank / BLZ</label>
            <select class="form-select" x-model="blz" disabled>
              <option value="64350070">Kreissparkasse Tuttlingen (64350070)</option>
            </select>
            <div class="form-hint">Weitere Banken werden spaeter unterstuetzt.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Anmeldename</label>
            <input class="form-input" type="text" x-model="userId" required
                   placeholder="Benutzerkennung" autocomplete="off" />
          </div>

          <div class="form-group">
            <label class="form-label">PIN</label>
            <input class="form-input" type="password" x-model="pin" required
                   placeholder="Online-Banking PIN" autocomplete="new-password"
                   x-ref="pinInput" />
            <div class="form-hint">PIN wird nur verschluesselt uebertragen und nicht gespeichert.</div>
          </div>

          <div class="form-group">
            <label class="form-label">TAN-Verfahren</label>
            <select class="form-select" x-model="tanMedium">
              <option value="pushTAN1">S-pushTAN (empfohlen)</option>
              <option value="smsTAN">smsTAN</option>
            </select>
          </div>

          <div x-show="connectError" class="alert alert-error" style="margin-top:12px"
               x-text="connectError"></div>

          <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="btn btn-ghost" @click="showTab('banking')">Abbrechen</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting || !userId || !pin">
              <span x-show="!submitting">Verbinden</span>
              <span x-show="submitting">Verbinde…</span>
            </button>
          </div>
        </form>
      </template>

      <!-- Result States -->
      <template x-if="connectResult">
        <div>
          <!-- pending_tan_decoupled (pushTAN) -->
          <template x-if="connectResult.status === 'tan_required' && connectResult.challengeType === 'pushTAN'">
            <div>
              <div class="alert alert-info" style="margin-bottom:12px">
                Push auf S-pushTAN App bestätigen.<br>
                Danach im Telegram-Bot <code>/tan ok</code> tippen.<br><br>
                Diese Seite kann geschlossen werden.
              </div>
              <div x-show="connectResult.message" style="color:var(--muted);font-size:13px;margin-bottom:12px"
                   x-text="connectResult.message"></div>
              <button class="btn btn-ghost" @click="resetForm()">Neue Verbindung</button>
            </div>
          </template>

          <!-- pending_tan_code (photoTAN, smsTAN etc.) -->
          <template x-if="connectResult.status === 'tan_required' && connectResult.challengeType !== 'pushTAN'">
            <div>
              <div class="alert alert-info" style="margin-bottom:12px">
                TAN erforderlich (<span x-text="connectResult.challengeType"></span>)
              </div>
              <div x-show="connectResult.message" style="color:var(--muted);font-size:13px;margin-bottom:12px"
                   x-text="connectResult.message"></div>

              <form @submit.prevent="submitTan()" autocomplete="off">
                <div class="form-group">
                  <label class="form-label">TAN-Code</label>
                  <input class="form-input" type="text" x-model="tanCode" required
                         placeholder="TAN eingeben" autocomplete="off"
                         inputmode="numeric" pattern="[0-9]*" />
                </div>
                <div x-show="tanError" class="alert alert-error" style="margin-top:8px"
                     x-text="tanError"></div>
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                  <button type="button" class="btn btn-ghost" @click="resetForm()">Abbrechen</button>
                  <button type="submit" class="btn btn-primary" :disabled="tanSubmitting || !tanCode">
                    <span x-show="!tanSubmitting">TAN senden</span>
                    <span x-show="tanSubmitting">Sende…</span>
                  </button>
                </div>
              </form>
            </div>
          </template>

          <!-- connected -->
          <template x-if="connectResult.status === 'connected'">
            <div>
              <div class="alert" style="background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.25);color:var(--green);margin-bottom:12px">
                Verbindung erfolgreich!
                <span x-show="connectResult.accountCount">
                  <span x-text="connectResult.accountCount"></span> Konto(en) gefunden.
                </span>
              </div>
              <div style="color:var(--muted);font-size:13px">Weiterleitung…</div>
            </div>
          </template>

          <!-- error -->
          <template x-if="connectResult.status === 'error'">
            <div>
              <div class="alert alert-error" style="margin-bottom:12px">
                Connect fehlgeschlagen — Details im Audit-Log.
              </div>
              <button class="btn btn-ghost" @click="resetForm()">Erneut versuchen</button>
            </div>
          </template>

          <!-- sidecar not ready (501) -->
          <template x-if="connectResult.status === 'sidecar_unavailable'">
            <div>
              <div class="alert alert-warning" style="margin-bottom:12px">
                Sidecar noch nicht aktiv (Etappe f pending).<br>
                Die Bankverbindung wird eingerichtet, sobald der FinTS-Sidecar bereit ist.
              </div>
              <button class="btn btn-ghost" @click="resetForm()">Zurueck</button>
            </div>
          </template>
        </div>
      </template>
    </div>`;
}

// ── Banking Overview ────────────────────────────────────────────────────────

function bankingOverviewHtml() {
  return `
    <div>
      <div class="filters-row" style="margin-bottom:16px">
        <h2 style="margin:0;font-size:18px">Banking</h2>
        <div style="flex:1"></div>
        <button class="btn btn-primary" @click="showConnectForm()">+ Bank verbinden</button>
      </div>

      <template x-if="bankingLoading">
        <div class="spinner">Laden…</div>
      </template>

      <template x-if="!bankingLoading && bankingError">
        <div class="alert alert-error" x-text="bankingError"></div>
      </template>

      <template x-if="!bankingLoading && !bankingError">
        <div>
          <!-- Institutions + Accounts -->
          <template x-if="institutions.length === 0 && accounts.length === 0">
            <div class="empty" style="text-align:center;padding:40px">
              <div style="font-size:48px;margin-bottom:12px">🏦</div>
              <p style="color:var(--muted)">Noch keine Bankverbindung eingerichtet.</p>
              <button class="btn btn-primary" style="margin-top:12px" @click="showConnectForm()">Bank verbinden</button>
            </div>
          </template>

          <template x-if="institutions.length > 0">
            <div>
              <template x-for="inst in institutions" :key="inst.id">
                <div class="card card-pad" style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <strong x-text="inst.name"></strong>
                      <span class="badge badge-muted" x-text="'BLZ ' + inst.blz" style="margin-left:8px"></span>
                    </div>
                  </div>
                  <template x-if="accountsForInst(inst.id).length > 0">
                    <div style="margin-top:8px">
                      <template x-for="acct in accountsForInst(inst.id)" :key="acct.id">
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
                          <span>
                            <span x-text="acct.displayName"></span>
                            <span style="color:var(--muted)" x-text="'(…' + acct.iban.slice(-4) + ')'"></span>
                          </span>
                          <span x-show="acct.currentBalance != null"
                                :style="{ color: acct.currentBalance >= 0 ? 'var(--green)' : 'var(--red)' }"
                                x-text="Number(acct.currentBalance).toLocaleString('de-DE', {minimumFractionDigits:2}) + ' ' + acct.currency">
                          </span>
                        </div>
                      </template>
                    </div>
                  </template>
                  <template x-if="accountsForInst(inst.id).length === 0">
                    <div style="margin-top:8px;color:var(--muted);font-size:13px">Keine Konten gefunden.</div>
                  </template>
                </div>
              </template>
            </div>
          </template>
        </div>
      </template>
    </div>`;
}

// ── Alpine.js Component Registration ────────────────────────────────────────

document.addEventListener('alpine:init', () => {
  Alpine.data('bankingRoot', () => ({
    // Overview state
    view: 'overview', // 'overview' | 'connect'
    bankingLoading: true,
    bankingError: null,
    institutions: [],
    accounts: [],

    // Connect form state
    blz: '64350070',
    userId: '',
    pin: '',
    tanMedium: 'pushTAN1',
    submitting: false,
    connectError: null,
    connectResult: null,

    // TAN form state
    tanCode: '',
    tanSubmitting: false,
    tanError: null,

    async init() {
      // Fetch CSRF token
      await Alpine.store('csrf').refresh();
      // Check deep link
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'banking-connect') {
        this.view = 'connect';
      }
      await this.loadOverview();
    },

    async loadOverview() {
      this.bankingLoading = true;
      this.bankingError = null;
      try {
        const csrf = Alpine.store('csrf');
        const [instRes, acctRes] = await Promise.all([
          csrf.fetch('/api/banking/institutions'),
          csrf.fetch('/api/banking/accounts'),
        ]);
        if (instRes.ok) this.institutions = await instRes.json();
        if (acctRes.ok) this.accounts = await acctRes.json();
      } catch (e) {
        this.bankingError = e.message;
      }
      this.bankingLoading = false;
    },

    accountsForInst(instId) {
      return this.accounts.filter(a => a.institutionId === instId && a.status === 'active');
    },

    showConnectForm() {
      this.view = 'connect';
      this.resetForm();
    },

    resetForm() {
      this.userId = '';
      this.pin = '';
      this.tanMedium = 'pushTAN1';
      this.submitting = false;
      this.connectError = null;
      this.connectResult = null;
      this.tanCode = '';
      this.tanSubmitting = false;
      this.tanError = null;
    },

    async submitConnect() {
      if (this.submitting) return; // single-shot guard
      this.submitting = true;
      this.connectError = null;

      // Build body — PIN only in POST body, never in URL/storage
      const body = {
        blz: this.blz,
        bank_name: 'Kreissparkasse Tuttlingen',
        fints_url: 'https://banking-bw1.s-fints-pt-bw.de/fints30',
        user_id: this.userId,
        pin: this.pin,
        tan_medium: this.tanMedium,
      };

      try {
        const result = await bankingApprovalMutation(
          'banking-connect.initiate', 'POST', {}, body
        );

        // Clear PIN from memory immediately
        this.pin = '';
        body.pin = null;
        body.user_id = null;
        const pinInput = this.$refs.pinInput;
        if (pinInput) pinInput.value = '';

        if (result === false) {
          // User cancelled approval
          this.submitting = false;
          return;
        }

        // Handle sidecar 501 (returned as error from proxy)
        if (result.status === 'error' && result.error && result.error.includes('501')) {
          this.connectResult = { status: 'sidecar_unavailable' };
        } else {
          this.connectResult = result;
        }

        // Auto-redirect on success
        if (this.connectResult.status === 'connected') {
          setTimeout(() => {
            this.view = 'overview';
            this.resetForm();
            this.loadOverview();
          }, 2000);
        }
      } catch (e) {
        // Clear PIN on error too
        this.pin = '';
        body.pin = null;
        body.user_id = null;

        const msg = e.message || '';
        // Detect sidecar 501 from error message
        if (msg.includes('501') || msg.includes('Not Implemented') || msg.includes('sidecar')) {
          this.connectResult = { status: 'sidecar_unavailable' };
        } else {
          // Generic error — never echo PIN
          this.connectError = 'Connect fehlgeschlagen — Details im Audit-Log.';
        }
      }
      this.submitting = false;
    },

    async submitTan() {
      if (this.tanSubmitting) return;
      this.tanSubmitting = true;
      this.tanError = null;

      const csrf = Alpine.store('csrf');
      try {
        const res = await csrf.fetch('/api/banking/complete-tan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.connectResult.session_id,
            tan: this.tanCode,
          }),
        });

        // Clear TAN from memory immediately
        this.tanCode = '';

        if (!res.ok) {
          this.tanError = 'TAN-Pruefung fehlgeschlagen — Details im Audit-Log.';
          this.tanSubmitting = false;
          return;
        }

        const result = await res.json();
        this.connectResult = result;

        if (result.status === 'connected') {
          Alpine.store('toast').success('Verbindung erfolgreich!');
          setTimeout(() => {
            this.view = 'overview';
            this.resetForm();
            this.loadOverview();
          }, 2000);
        } else if (result.status === 'error') {
          this.tanError = 'TAN-Pruefung fehlgeschlagen — Details im Audit-Log.';
        }
      } catch (e) {
        this.tanCode = '';
        this.tanError = 'TAN-Pruefung fehlgeschlagen — Details im Audit-Log.';
      }
      this.tanSubmitting = false;
    },
  }));
});
