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
  'banking-accounts.archive':    (p) => `/api/banking/accounts/${p.account_id}/archive`,
  'banking-accounts.bulk-archive': () => '/api/banking/accounts/bulk-archive',
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
            <div class="form-hint">Weitere Banken werden später unterstützt.</div>
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
            <div class="form-hint">PIN wird nur verschlüsselt übertragen und nicht gespeichert.</div>
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
          <!-- pending_tan_decoupled (pushTAN) — Dashboard-native flow (Sprint 2.9) -->
          <template x-if="connectResult.status === 'tan_required' && connectResult.challengeType === 'pushTAN'">
            <div>
              <template x-if="!pushTanTimedOut">
                <div>
                  <div class="alert alert-info" style="margin-bottom:12px">
                    Bitte Freigabe in der S-pushTAN App bestätigen.
                  </div>
                  <div x-show="connectResult.message" style="color:var(--muted);font-size:13px;margin-bottom:12px"
                       x-text="connectResult.message"></div>
                  <div x-show="pushTanRetryMsg" class="alert alert-warning" style="margin-bottom:12px"
                       x-text="pushTanRetryMsg"></div>
                  <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                    <button type="button" class="btn btn-ghost" @click="cancelPushTan()" :disabled="connectInProgress">Abbrechen</button>
                    <button type="button" class="btn btn-primary" @click="confirmPushTan()" :disabled="connectInProgress">
                      <span x-show="!connectInProgress">TAN bestätigen</span>
                      <span x-show="connectInProgress">Prüfe…</span>
                    </button>
                  </div>
                </div>
              </template>
              <template x-if="pushTanTimedOut">
                <div>
                  <div class="alert alert-warning" style="margin-bottom:12px">
                    Keine Reaktion. Bitte Bankvorgang erneut starten.
                  </div>
                  <button class="btn btn-ghost" @click="resetForm()">Erneut versuchen</button>
                </div>
              </template>
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
              <div class="alert" style="background:var(--green-weak);border-color:var(--green);color:var(--green);margin-bottom:12px">
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
              <button class="btn btn-ghost" @click="resetForm()">Zurück</button>
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
        <button class="btn btn-ghost" style="margin-right:8px"
                @click="toggleBulkMode()"
                x-text="bulkToggleLabel()"></button>
        <button class="btn btn-primary" x-show="!bulkMode" @click="showConnectForm()">+ Bank verbinden</button>
      </div>

      <template x-if="bankingLoading">
        <div class="spinner">Laden…</div>
      </template>

      <template x-if="!bankingLoading && bankingError">
        <div class="alert alert-error" x-text="bankingError"></div>
      </template>

      <template x-if="!bankingLoading && !bankingError">
        <div>
          <!-- A2 (Phase 3): Verbindungsstand und Saldostand getrennt benannt. -->
          <template x-if="verbindungZeilen().length > 0">
            <div class="card card-pad bank-stand" style="margin-bottom:12px">
              <template x-for="z in verbindungZeilen()" :key="z.id">
                <div class="bank-stand-institut">
                  <div class="bank-stand-name" x-text="z.name"></div>
                  <div class="bank-stand-zeile" x-text="z.verbindung"></div>
                  <div class="bank-stand-zeile" :class="z.alt ? 'bank-stand-warn' : ''">
                    <span x-show="z.alt" aria-hidden="true">\u26a0\ufe0f </span><span x-text="z.abgleich"></span>
                  </div>
                </div>
              </template>
              <div class="bank-stand-hinweis" x-text="verbindungHinweis()"></div>
            </div>
          </template>
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
              <div>
                <template x-for="inst in institutions" :key="inst.id">
                <div class="card card-pad" style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <strong x-text="inst.name"></strong>
                      <span class="badge badge-muted" x-text="instBlzLabel(inst.blz)" style="margin-left:8px"></span>
                    </div>
                  </div>
                  <template x-if="accountsForInst(inst.id).length > 0">
                    <div style="margin-top:8px">
                      <template x-for="acct in accountsForInst(inst.id)" :key="acct.id">
                        <!-- P2-3: eigene Klasse, damit die Zeile schmal stapeln kann.
                             P2-9: die Zeile nennt jetzt Kontobezeichnung, Status,
                             Waehrung und den Datenstand des Saldos und fuehrt per
                             Klick in die Umsatzliste. Vorher standen nur IBAN und
                             Saldo da, und der Saldo fuehrte nirgendwohin. -->
                        <div class="bank-konto-zeile">
                          <span class="bank-konto-iban">
                            <input type="checkbox" x-show="bulkMode"
                                   aria-label="Konto auswählen"
                                   :checked="isSelected(acct.id)"
                                   @change="toggleSelection(acct.id)"
                                   style="width:18px;height:18px;cursor:pointer">
                            <button class="bank-konto-knopf" @click="umsaetzeOeffnen(acct.id)"
                                    :title="kontoTitel(acct)">
                              <span class="bank-konto-name" x-text="kontoName(acct)"></span>
                              <span class="bank-konto-sub" x-text="kontoZusatz(acct)"></span>
                            </button>
                          </span>
                          <span class="bank-konto-wert">
                            <span class="bank-konto-saldo" :class="saldoKlasse(acct)" x-text="saldoText(acct)"></span>
                            <button aria-label="Konto archivieren" class="btn btn-danger" style="font-size:13px;padding:3px 8px"
                                    x-show="!bulkMode"
                                    @click="archiveSingle(acct.id)"
                                    title="Konto archivieren">📦</button>
                          </span>
                        </div>
                      </template>
                    </div>
                  </template>
                  <template x-if="accountsForInst(inst.id).length === 0">
                    <div style="margin-top:8px;color:var(--muted);font-size:13px">Keine aktiven Konten bei diesem Institut.</div>
                  </template>
                </div>
              </template>
              </div>
              <!-- P2-9: Summe je Waehrung ueber die AKTIVEN Konten. Getrennt
                   summiert, damit nie unkommentiert ueber Waehrungen hinweg
                   addiert wird. -->
              <div class="bank-summe" x-show="summenZeilen().length > 0">
                <template x-for="z in summenZeilen()" :key="z.waehrung">
                  <div class="bank-summe-zeile">
                    <span class="bank-summe-text" x-text="z.text"></span>
                  </div>
                </template>
                <div class="bank-summe-hinweis" x-text="summeHinweis()"></div>
              </div>

              <!-- Archivierte Konten: getrennt und eingeklappt. -->
              <details class="bank-archiv" x-show="archivierteKonten().length > 0">
                <summary x-text="archivTitel()"></summary>
                <div>
                  <template x-for="acct in archivierteKonten()" :key="acct.id">
                    <div class="bank-konto-zeile bank-konto-archiv">
                      <span class="bank-konto-iban">
                        <button class="bank-konto-knopf" @click="umsaetzeOeffnen(acct.id)" :title="kontoTitel(acct)">
                          <span class="bank-konto-name" x-text="kontoName(acct)"></span>
                          <span class="bank-konto-sub" x-text="kontoZusatz(acct)"></span>
                        </button>
                      </span>
                      <span class="bank-konto-wert">
                        <span class="bank-konto-saldo" x-text="saldoText(acct)"></span>
                      </span>
                    </div>
                  </template>
                </div>
              </details>

              <!-- Umsatzliste des gewaehlten Kontos (lesend). -->
              <div id="bank-umsaetze" class="bank-umsaetze"></div>

              <div x-show="hasBulkSelection()"
                   style="position:sticky;bottom:0;background:var(--surface);padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;margin-top:16px">
              <span x-text="selectionCountLabel()"></span>
              <button class="btn btn-danger"
                      @click="openBulkConfirm()"
                      x-text="archiveBtnLabel()"></button>
            </div>
            <div x-show="bulkConfirmVisible"
                 class="modal-overlay" style="z-index:200"
                 x-on:click.self="closeBulkConfirm()"
                 @keydown.escape.window="closeBulkConfirm()">
              <div class="modal" style="max-width:540px">
                <h3 style="margin-bottom:12px"
                    x-text="modalTitle()"></h3>
                <div style="margin-bottom:16px;padding:10px;background:var(--red-weak);border:1px solid var(--red);border-radius:6px;font-size:13px;color:var(--red)">
                  Transaktionen und Umsätze bleiben erhalten. Archivierte Konten können nicht reaktiviert werden.
                </div>
                <div style="font-size:13px;color:var(--muted);margin-bottom:12px"
                     x-show="hasBulkTimer()">
                  Gültig: <span x-text="bulkTimerText"></span>
                </div>
                <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">
                  <template x-for="group in selectedAccountsGrouped()" :key="group.institution.id">
                    <div style="margin-bottom:12px">
                      <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:var(--muted)"
                           x-text="group.institution.name"></div>
                      <template x-for="acct in group.accounts" :key="acct.id">
                        <div style="padding:4px 0;font-size:13px"
                             x-text="formatIban(acct.iban)"></div>
                      </template>
                    </div>
                  </template>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px">
                  <button class="btn btn-ghost" @click="closeBulkConfirm()">Abbrechen</button>
                  <button class="btn btn-danger"
                          @click="confirmBulkArchive()"
                          :disabled="isBulkConfirmDisabled()"
                          x-text="bulkArchivingLabel()"></button>
                </div>
              </div>
            </div>
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

    // pushTAN decoupled state (Sprint 2.9)
    sessionId: null,
    connectInProgress: false,
    pushTanTimeoutId: null,
    pushTanTimedOut: false,
    pushTanRetryMsg: null,

    // Bulk-selection state (c2)
    bulkMode: false,
    selectedIds: [],
    bulkConfirmVisible: false,
    bulkConfirmToken: null,
    bulkConfirmExpiresAt: null,
    bulkTimerText: '',
    bulkArchiving: false,
    _bulkTimerInterval: null,
    /* A2 (Phase 3): Antwort von GET /api/banking/verbindungsstand. */
    verbindung: null,

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
        const [instRes, acctRes, verbRes] = await Promise.all([
          csrf.fetch('/api/banking/institutions'),
          csrf.fetch('/api/banking/accounts'),
          /* A2 (Phase 3): Verbindungsstand getrennt vom Saldostand. */
          csrf.fetch('/api/banking/verbindungsstand'),
        ]);
        if (instRes.ok) this.institutions = await instRes.json();
        if (acctRes.ok) this.accounts = await acctRes.json();
        this.verbindung = verbRes.ok ? await verbRes.json() : null;
        this.meldeDatenstand();
      } catch (e) {
        this.bankingError = netzFehlerText(e);
        this.meldeDatenstand(netzFehlerText(e));
      }
      this.bankingLoading = false;
    },

    /* ── A2 (Phase 3): zwei Zeitpunkte, die nie verwechselt werden duerfen ────
       BEFUND: Der Owner hat am 05.10.2026 "Bank verbinden" durchlaufen (mit
       pushTAN) und erwartete danach aktuelle Salden. Das Dashboard zeigte
       weiterhin den 29.06.2026 — zu Recht: der Verbindungsweg holt die
       SEPA-Kontenliste, nicht die Salden und nicht die Umsaetze. Nachgewiesen
       ist das am Zugriffsprotokoll (nur connect/complete-tan am 05.10.), am
       FinTS-Protokoll ("fetching accounts") und an banking_sync_runs (jungste
       Zeile 29.06.2026).
       Die Anzeige nennt deshalb jetzt BEIDE Zeitpunkte ausdruecklich und sagt,
       was welcher bedeutet. */
    verbindungZeilen() {
      const v = this.verbindung;
      if (!v || !Array.isArray(v.institute) || !v.institute.length) return [];
      return v.institute.map(i => {
        const verbTeile = [];
        if (i.verbindung_erneuert_am) {
          verbTeile.push('zuletzt erfolgreich am ' + fmtDT(i.verbindung_erneuert_am)
            + ' (' + altersText(i.verbindung_erneuert_am) + ')');
        } else {
          verbTeile.push('kein erfolgreicher Verbindungsaufbau erfasst');
        }
        if (i.verbindung_gueltig_bis) {
          verbTeile.push('Sitzung gültig bis ' + fmtDate(i.verbindung_gueltig_bis));
        }
        const abgTeile = [];
        if (i.abgleich_letzter_erfolg) {
          abgTeile.push('zuletzt erfolgreich am ' + fmtDT(i.abgleich_letzter_erfolg)
            + ' (' + altersText(i.abgleich_letzter_erfolg) + ')');
        } else {
          abgTeile.push(i.abgleich_laeufe_gesamt
            ? 'kein erfolgreicher Abgleich erfasst'
            : 'noch kein Abgleich erfasst');
        }
        abgTeile.push(i.abgleich_laeufe_gesamt
          + (i.abgleich_laeufe_gesamt === 1 ? ' protokollierter Lauf' : ' protokollierte Läufe')
          + ' insgesamt');
        return {
          id: i.id,
          name: i.name || ('Institut ' + i.id),
          verbindung: 'Bankverbindung: ' + verbTeile.join(' \u00b7 '),
          abgleich: 'Datenstand der Salden und Umsätze: ' + abgTeile.join(' \u00b7 '),
          alt: !!(i.verbindung_erneuert_am && i.abgleich_letzter_erfolg
            && new Date(i.verbindung_erneuert_am) > new Date(i.abgleich_letzter_erfolg)),
        };
      });
    },

    verbindungHinweis() {
      return 'Zwei verschiedene Dinge: \u201eBank verbinden\u201c stellt den FinTS-Zugang her '
        + 'und holt die Kontenliste \u2014 es holt KEINE Salden und KEINE Ums\u00e4tze. '
        + 'Salden und Ums\u00e4tze entstehen nur beim Abgleich, und der wird nicht aus dem '
        + 'Dashboard ausgel\u00f6st.';
    },

    /* Salden stammen aus dem letzten FinTS-Abgleich, nicht aus dem Seitenaufruf.
       Der jüngste `lastSyncAt` über alle Konten ist der Datenstand des Bereichs.
       Ohne diese Angabe sah ein 97 Tage alter Saldo wie ein aktueller aus. */
    meldeDatenstand(fehler) {
      if (typeof setDatenstand !== 'function') return;
      if (fehler) {
        setDatenstand([{ quelle: 'Bankkonten (FinTS)', zustand: 'getrennt', stand: null,
          abgleich: null, hinweis: 'Abruf fehlgeschlagen: ' + fehler }]);
        return;
      }
      const zeiten = this.accounts
        .map(a => a.lastSyncAt)
        .filter(Boolean)
        .map(x => new Date(x).getTime())
        .filter(t => Number.isFinite(t));
      const letzter = zeiten.length ? new Date(Math.max(...zeiten)).toISOString() : null;
      const aktive = this.accounts.filter(a => a.status === 'active').length;
      setDatenstand([{
        quelle: 'Bankkonten (FinTS)',
        stand: letzter,
        abgleich: letzter,
        hinweis: aktive + ' aktive Konten von ' + this.accounts.length
          + '. Dies ist der Stand des letzten ABGLEICHS, nicht des letzten '
          + 'Verbindungsaufbaus. Ein Abgleich wird nicht aus dem Dashboard ausgelöst.',
      }]);
    },

    accountsForInst(instId) {
      return this.accounts.filter(a => a.institutionId === instId && a.status === 'active');
    },

    formatIban(iban) {
      return iban ? iban.match(/.{1,4}/g).join(' ') : '';
    },

    formatBalance(balance, currency) {
      if (balance == null) return '';
      return Number(balance).toLocaleString('de-DE', { minimumFractionDigits: 2 })
        + '\u00a0' + (currency || '');
    },

    /* ── P2-9: Kontozeile, Summe und Umsätze ─────────────────────────────────
       Die Antwort von /api/banking/accounts enthält zu jedem Konto
       `accountType`, `displayName`, `ownerName`, `currency`, `currentBalance`,
       `lastSyncAt` und `status`. Angezeigt wurden davon nur IBAN und Saldo.
       `accountType` und `ownerName` sind im Bestand bei ALLEN Konten leer und
       `displayName` enthält jeweils nur die IBAN — ein Kontozweck steht also
       nicht in den Daten und wird auch nicht erfunden. */

    /* Bezeichnung: der Anzeigename nur dann, wenn er von der IBAN abweicht. */
    kontoName(acct) {
      const name = String(acct.displayName || '').trim();
      const iban = String(acct.iban || '').trim();
      if (name && name !== iban) return name;
      return this.formatIban(acct.iban) || ('Konto ' + acct.id);
    },

    /* Zweite Zeile: Status, Währung und Datenstand des Saldos mit Alter. */
    kontoZusatz(acct) {
      const teile = [];
      teile.push(acct.status === 'active' ? 'Aktiv' : acct.status === 'archived' ? 'Archiviert' : String(acct.status || 'Status unbekannt'));
      if (acct.currency) teile.push(acct.currency);
      if (acct.lastSyncAt) {
        teile.push('Saldo vom ' + fmtDate(acct.lastSyncAt) + ' (' + altersText(acct.lastSyncAt) + ')');
      } else {
        teile.push('kein Abgleich erfasst');
      }
      return teile.join(' · ');
    },

    kontoTitel(acct) {
      return 'Umsätze dieses Kontos anzeigen';
    },

    /* Kein Saldo ist NICHT null Euro. */
    saldoText(acct) {
      if (acct.currentBalance == null) return 'kein Saldo erfasst';
      return this.formatBalance(acct.currentBalance, acct.currency);
    },

    saldoKlasse(acct) {
      if (acct.currentBalance == null) return 'bank-saldo-leer';
      return acct.currentBalance < 0 ? 'bank-saldo-minus' : 'bank-saldo-plus';
    },

    aktiveKonten() {
      return this.accounts.filter(a => a.status === 'active');
    },

    archivierteKonten() {
      return this.accounts.filter(a => a.status !== 'active');
    },

    archivTitel() {
      const n = this.archivierteKonten().length;
      return n + (n === 1 ? ' archiviertes Konto' : ' archivierte Konten') + ' anzeigen';
    },

    /* Summe JE WÄHRUNG. Niemals über Währungen hinweg addieren. */
    summenZeilen() {
      const jeWaehrung = {};
      for (const a of this.aktiveKonten()) {
        if (a.currentBalance == null) continue;
        const w = a.currency || 'ohne Währung';
        jeWaehrung[w] = (jeWaehrung[w] || 0) + Number(a.currentBalance);
      }
      return Object.keys(jeWaehrung).sort().map(w => ({
        waehrung: w,
        text: 'Summe der aktiven Konten: '
          + Number(jeWaehrung[w]).toLocaleString('de-DE', { minimumFractionDigits: 2 })
          + '\u00a0' + w,
      }));
    },

    summeHinweis() {
      const aktiv = this.aktiveKonten();
      const ohne = aktiv.filter(a => a.currentBalance == null).length;
      const stand = aktiv.map(a => a.lastSyncAt).filter(Boolean).sort().slice(-1)[0] || null;
      const teile = [aktiv.length + (aktiv.length === 1 ? ' aktives Konto' : ' aktive Konten')];
      if (ohne) teile.push(ohne + ' davon ohne erfassten Saldo (nicht mitgerechnet)');
      if (stand) teile.push('Datenstand ' + fmtDate(stand) + ', ' + altersText(stand));
      teile.push('Summiert wird je Währung getrennt');
      return teile.join(' · ') + '.';
    },

    umsaetzeOeffnen(accountId) {
      const konto = this.accounts.find(a => a.id === accountId) || null;
      bankingUmsaetzeRendern(konto);
    },

    toggleBulkMode() {
      this.bulkMode = !this.bulkMode;
      this.selectedIds = [];
    },

    toggleSelection(accountId) {
      const idx = this.selectedIds.indexOf(accountId);
      if (idx === -1) {
        this.selectedIds.push(accountId);
      } else {
        this.selectedIds.splice(idx, 1);
      }
    },

    isSelected(accountId) {
      return this.selectedIds.indexOf(accountId) !== -1;
    },

    hasBulkSelection() {
      return this.bulkMode && this.selectedIds.length > 0;
    },

    bulkToggleLabel() {
      return this.bulkMode ? 'Auswahl beenden' : 'Mehrere auswählen';
    },

    selectionCountLabel() {
      return this.selectedIds.length + (this.selectedIds.length === 1 ? ' Konto ausgewählt' : ' Konten ausgewählt');
    },

    archiveBtnLabel() {
      return 'Archivieren (' + this.selectedIds.length + ')';
    },

    modalTitle() {
      return this.selectedIds.length + ' Konto(en) archivieren';
    },

    instBlzLabel(blz) {
      return 'BLZ ' + blz;
    },

    selectedAccountsGrouped() {
      const selected = this.accounts.filter(a => this.selectedIds.indexOf(a.id) !== -1);
      const groups = [];
      for (const inst of this.institutions) {
        const accts = selected.filter(a => a.institutionId === inst.id);
        if (accts.length > 0) {
          groups.push({ institution: inst, accounts: accts });
        }
      }
      return groups;
    },

    async openBulkConfirm() {
      if (this.selectedIds.length === 0) return;
      const groups = this.selectedAccountsGrouped();
      if (groups.length > 1) {
        Alpine.store('toast').error('Konten aus verschiedenen Banken koennen nicht zusammen archiviert werden.');
        return;
      }
      try {
        const csrf = Alpine.store('csrf');
        const sortedIds = this.selectedIds.slice().sort((a, b) => a - b);
        const resp = await csrf.fetch('/api/banking/approval-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint_key: 'banking-accounts.bulk-archive',
            method: 'POST',
            body: { account_ids: sortedIds },
          }),
        });
        if (!resp.ok) throw new Error('Preview fehlgeschlagen');
        const data = await resp.json();
        this.bulkConfirmToken = data.token;
        this.bulkConfirmExpiresAt = data.expires_at;
        this.bulkConfirmVisible = true;
        this._startBulkTimer();
      } catch (e) {
        Alpine.store('toast').error('Fehler beim Laden der Bestaetigung');
      }
    },

    closeBulkConfirm() {
      this._cleanupBulk();
    },

    async confirmBulkArchive() {
      if (!this.bulkConfirmToken || this.bulkArchiving) return;
      if (this.isTokenExpired()) return;
      this.bulkArchiving = true;
      try {
        const csrf = Alpine.store('csrf');
        const sortedIds = this.selectedIds.slice().sort((a, b) => a - b);
        const resp = await csrf.fetch('/api/banking/accounts/bulk-archive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Approval-Token': this.bulkConfirmToken,
          },
          body: JSON.stringify({ account_ids: sortedIds }),
        });
        if (!resp.ok) throw new Error('Archivierung fehlgeschlagen');
        const data = await resp.json();
        const archivedCount = data.archived ? data.archived.length : 0;
        const skippedCount = data.skipped ? data.skipped.length : 0;
        if (skippedCount > 0) {
          Alpine.store('toast').info(archivedCount + ' archiviert, ' + skippedCount + ' uebersprungen');
        } else {
          Alpine.store('toast').success(archivedCount + ' Konten archiviert');
        }
        this._cleanupBulk();
        await this.loadOverview();
      } catch (e) {
        Alpine.store('toast').error('Archivierung fehlgeschlagen');
        this.bulkArchiving = false;
      }
    },

    _startBulkTimer() {
      if (this._bulkTimerInterval) clearInterval(this._bulkTimerInterval);
      this._updateBulkTimerText();
      this._bulkTimerInterval = setInterval(() => {
        this._updateBulkTimerText();
      }, 1000);
    },

    _updateBulkTimerText() {
      if (!this.bulkConfirmExpiresAt) return;
      const remaining = Math.max(0, Math.floor((new Date(this.bulkConfirmExpiresAt) - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      this.bulkTimerText = mins + ':' + (secs < 10 ? '0' : '') + secs;
      if (remaining <= 0) {
        this.bulkTimerText = 'Abgelaufen';
        clearInterval(this._bulkTimerInterval);
      }
    },

    _cleanupBulk() {
      if (this._bulkTimerInterval) clearInterval(this._bulkTimerInterval);
      this.bulkConfirmVisible = false;
      this.bulkConfirmToken = null;
      this.bulkConfirmExpiresAt = null;
      this.bulkTimerText = '';
      this.bulkArchiving = false;
      this._bulkTimerInterval = null;
      this.selectedIds = [];
      this.bulkMode = false;
    },

    isTokenExpired() {
      if (!this.bulkConfirmExpiresAt) return false;
      return Date.now() >= new Date(this.bulkConfirmExpiresAt).getTime();
    },

    isBulkConfirmDisabled() {
      return this.bulkArchiving || this.isTokenExpired();
    },

    bulkArchivingLabel() {
      if (this.bulkArchiving) return 'Wird archiviert...';
      if (this.isTokenExpired()) return 'Abgelaufen';
      return 'Archivieren';
    },

    hasBulkTimer() {
      return this.bulkTimerText.length > 0;
    },

    async archiveSingle(accountId) {
      try {
        const result = await bankingApprovalMutation(
          'banking-accounts.archive', 'POST',
          { account_id: accountId },
          {}
        );
        if (result !== false) await this.loadOverview();
      } catch {}
    },

    showConnectForm() {
      this.view = 'connect';
      this.resetForm();
    },

    resetForm() {
      this.clearPushTanTimeout();
      this.userId = '';
      this.pin = '';
      this.tanMedium = 'pushTAN1';
      this.submitting = false;
      this.connectError = null;
      this.connectResult = null;
      this.tanCode = '';
      this.tanSubmitting = false;
      this.tanError = null;
      this.sessionId = null;
      this.connectInProgress = false;
      this.pushTanTimedOut = false;
      this.pushTanRetryMsg = null;
    },

    clearPushTanTimeout() {
      if (this.pushTanTimeoutId) {
        clearTimeout(this.pushTanTimeoutId);
        this.pushTanTimeoutId = null;
      }
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

        // Store session_id for complete-tan + cancel (Sprint 2.9)
        if (result && result.session_id) {
          this.sessionId = result.session_id;
        }

        // Handle sidecar 501 (returned as error from proxy)
        if (result.status === 'error' && result.error && result.error.includes('501')) {
          this.connectResult = { status: 'sidecar_unavailable' };
        } else {
          this.connectResult = result;
        }

        // Start 120s timeout for pushTAN decoupled flow (Sprint 2.9)
        if (this.connectResult.status === 'tan_required' && this.connectResult.challengeType === 'pushTAN') {
          this.pushTanTimeoutId = setTimeout(() => {
            this.pushTanTimedOut = true;
            // fire-and-forget cancel parked sidecar session
            const csrf = Alpine.store('csrf');
            if (this.sessionId) {
              csrf.fetch(`/api/banking/session/${this.sessionId}`, { method: 'DELETE' }).catch(() => {});
            }
          }, 120_000);
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

    async confirmPushTan() {
      if (this.connectInProgress || !this.sessionId) return;
      this.connectInProgress = true;
      this.pushTanRetryMsg = null;

      const csrf = Alpine.store('csrf');
      try {
        const res = await csrf.fetch('/api/banking/complete-tan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.sessionId,
            tan: '',
          }),
        });

        if (!res.ok) {
          this.pushTanRetryMsg = 'Pruefung fehlgeschlagen. Bitte erneut versuchen.';
          this.connectInProgress = false;
          return;
        }

        const result = await res.json();

        if (result.status === 'tan_required') {
          // 3956: not yet confirmed — user can retry
          this.pushTanRetryMsg = 'Noch nicht bestaetigt. Bitte zuerst in der App freigeben.';
          // Update connectResult with fresh state for next attempt
          this.connectResult = result;
          this.connectInProgress = false;
          return;
        }

        if (result.status === 'connected') {
          this.clearPushTanTimeout();
          this.connectResult = result;
          Alpine.store('toast').success('Verbindung erfolgreich!');
          setTimeout(() => {
            this.view = 'overview';
            this.resetForm();
            this.loadOverview();
          }, 2000);
          this.connectInProgress = false;
          return;
        }

        if (result.status === 'error') {
          this.pushTanRetryMsg = result.error || 'Fehler bei der TAN-Pruefung.';
        }
      } catch (e) {
        this.pushTanRetryMsg = 'Verbindungsfehler. Bitte erneut versuchen.';
      }
      this.connectInProgress = false;
    },

    cancelPushTan() {
      this.clearPushTanTimeout();
      // fire-and-forget cancel parked sidecar session
      const csrf = Alpine.store('csrf');
      if (this.sessionId) {
        csrf.fetch(`/api/banking/session/${this.sessionId}`, { method: 'DELETE' }).catch(() => {});
      }
      this.resetForm();
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

/* ═══════════════════════════════════════════════════════════════════════════
   Umsatzliste eines Kontos (P2-9)

   Der lesende Zugriff war in der Spec als „nicht verifiziert" vermerkt. Er
   existiert: `GET /api/banking/accounts/:id/transactions` liefert die Zeilen
   aus `banking_transactions` (derzeit 1.633 Zeilen im Bestand).

   NUR LESEND: kein Abgleich, keine Bankverbindung, keine Transaktion. Die
   Liste zeigt den Stand des letzten FinTS-Abgleichs — nicht den aktuellen
   Kontostand bei der Bank. Das steht ausdrücklich darüber.

   Die IBAN der Gegenseite wird maskiert und erst auf Klick gezeigt — dasselbe
   Muster wie bei den Mieter-IBANs (`iban-masked` / `iban-reveal`).
   ═══════════════════════════════════════════════════════════════════════════ */

const BANK_UMSATZ_SCHRITT = 50;

let _bankUmsatzKonto = null;
let _bankUmsatzAnzahl = BANK_UMSATZ_SCHRITT;

async function bankingUmsaetzeRendern(konto, mehr) {
  const ziel = document.getElementById('bank-umsaetze');
  if (!ziel) return;

  /* Derselbe Klick auf dasselbe Konto schließt die Liste wieder. */
  if (!mehr && _bankUmsatzKonto && konto && _bankUmsatzKonto.id === konto.id) {
    _bankUmsatzKonto = null;
    ziel.innerHTML = '';
    return;
  }
  if (!konto) return;
  if (!mehr) _bankUmsatzAnzahl = BANK_UMSATZ_SCHRITT;
  _bankUmsatzKonto = konto;

  ziel.innerHTML = '<div class="spinner">Umsätze werden geladen…</div>';
  let zeilen;
  try {
    const csrf = Alpine.store('csrf');
    const res = await csrf.fetch('/api/banking/accounts/' + encodeURIComponent(konto.id) + '/transactions');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    zeilen = await res.json();
  } catch (e) {
    ziel.innerHTML = zustandBlock('fehler', 'Die Umsätze sind nicht abrufbar: ' + netzFehlerText(e),
      { aktion: netzWiederholenKnopf('bankingUmsaetzeRendern(_bankUmsatzKonto, true)') });
    return;
  }

  const kopf = '<div class="bank-umsatz-kopf">'
    + '<div class="bank-umsatz-titel">' + esc('Umsätze ' + (konto.displayName || konto.iban || konto.id)) + '</div>'
    + '<button class="btn" onclick="bankingUmsaetzeSchliessen()">Schließen</button>'
    + '</div>';

  if (!Array.isArray(zeilen) || !zeilen.length) {
    ziel.innerHTML = kopf + zustandBlock('keine_daten',
      'Für dieses Konto sind keine Umsätze gespeichert. Umsätze entstehen beim FinTS-Abgleich; '
      + 'der wird nicht aus dem Dashboard ausgelöst.');
    return;
  }

  const sortiert = zeilen.slice().sort((a, b) =>
    String(b.bookingDate || '').localeCompare(String(a.bookingDate || '')));
  const sichtbar = sortiert.slice(0, _bankUmsatzAnzahl);
  const juengste = sortiert[0] ? sortiert[0].bookingDate : null;

  const tabelle = '<table class="data-table" data-tabelle="karten">'
    + '<thead><tr><th>Buchung</th><th>Gegenseite</th><th>Verwendungszweck</th>'
    + '<th style="text-align:right">Betrag</th></tr></thead><tbody>'
    + sichtbar.map(t => {
      const betrag = Number(t.amount);
      const klasse = betrag < 0 ? 'bank-saldo-minus' : 'bank-saldo-plus';
      const iban = String(t.counterpartyIban || '');
      const maskiert = iban
        ? '<span class="iban-masked">***' + esc(iban.slice(-4)) + '</span> '
          + '<button class="iban-reveal" onclick="assetsRevealIban(this, \'' + esc(iban) + '\')">Anzeigen</button>'
        : '';
      return '<tr>'
        + '<td>' + esc(fmtDate(t.bookingDate))
          + (t.valueDate && t.valueDate !== t.bookingDate
              ? '<div class="bank-umsatz-sub">Wertstellung ' + esc(fmtDate(t.valueDate)) + '</div>' : '')
        + '</td>'
        + '<td>' + esc(t.counterpartyName || 'nicht angegeben')
          + (maskiert ? '<div class="bank-umsatz-sub">' + maskiert + '</div>' : '') + '</td>'
        + '<td>' + esc(t.reference || '–')
          + (t.transactionCode ? '<div class="bank-umsatz-sub">' + esc(t.transactionCode) + '</div>' : '')
        + '</td>'
        + '<td style="text-align:right" class="' + klasse + '">'
          + esc(betrag.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' ' + (t.currency || ''))
        + '</td></tr>';
    }).join('') + '</tbody></table>';

  const mehrKnopf = sortiert.length > sichtbar.length
    ? '<div class="bank-umsatz-mehr"><button class="btn" onclick="bankingUmsaetzeMehr()">'
      + esc('Weitere ' + Math.min(BANK_UMSATZ_SCHRITT, sortiert.length - sichtbar.length) + ' laden')
      + '</button></div>'
    : '';

  ziel.innerHTML = kopf
    + '<div class="treffer-zeile">' + esc(sichtbar.length + ' von ' + sortiert.length
      + (sortiert.length === 1 ? ' Umsatz' : ' Umsätzen')
      + (juengste ? ' · jüngste Buchung ' + fmtDate(juengste) + ' (' + altersText(juengste) + ')' : ''))
    + '</div>'
    + '<div class="bank-umsatz-hinweis">' + esc(
      'Stand des letzten FinTS-Abgleichs — nicht der aktuelle Stand bei der Bank. '
      + 'Ein Abgleich wird nicht aus dem Dashboard ausgelöst.') + '</div>'
    + tabelle + mehrKnopf;
}

function bankingUmsaetzeMehr() {
  _bankUmsatzAnzahl += BANK_UMSATZ_SCHRITT;
  bankingUmsaetzeRendern(_bankUmsatzKonto, true);
}

function bankingUmsaetzeSchliessen() {
  _bankUmsatzKonto = null;
  const ziel = document.getElementById('bank-umsaetze');
  if (ziel) ziel.innerHTML = '';
}
