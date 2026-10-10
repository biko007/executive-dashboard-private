/* ═══════════════════════════════════════════════════════════════════════════
   Kostenvorschläge — Unterbereich 5 von Immobilien

   Zeigt die Buchungsvorschläge, die der Core aus den Bankumsätzen erzeugt hat
   (Regeln in system_settings.expense_rules). Jeder Vorschlag nennt die Regel,
   die ihn erzeugt hat, und wird erst durch einen Klick zur Buchung.

   Aufbau wie die übrigen Unterbereiche: Die Komponente baut HTML in ihr
   x-ref-Ziel, die Schaltflächen rufen globale Funktionen. Dadurch stehen keine
   Alpine-Ausdrücke im erzeugten Markup — die CSP-Hausregeln für x-if/x-text
   betreffen diesen Bereich nicht.
   ═══════════════════════════════════════════════════════════════════════════ */

const VORSCHLAG_SICHERHEIT = {
  hoch:    { text: 'sicher',      farbe: '#1a7f37' },
  mittel:  { text: 'zu prüfen',   farbe: '#9a6700' },
  niedrig: { text: 'unsicher',    farbe: '#b42318' },
};

const VORSCHLAG_STATUS = {
  offen:      'offen',
  bestaetigt: 'übernommen',
  verworfen:  'verworfen',
};

function vorschlagGeld(wert) {
  const n = Number(wert);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function vorschlagDatum(wert) {
  if (!wert) return '—';
  const d = new Date(wert);
  if (isNaN(d.getTime())) return String(wert).slice(0, 10);
  return d.toLocaleDateString('de-DE');
}

function vorschlagZeitraum(von, bis) {
  if (!von && !bis) return 'kein Leistungszeitraum';
  return vorschlagDatum(von) + ' – ' + vorschlagDatum(bis);
}

/* Lange Verwendungszwecke sind im Bankformat umgebrochen und enthalten
   Vertragsnummern, die zur Zuordnung wichtig sind — deshalb kürzen statt
   weglassen. */
function vorschlagZweck(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'kein Verwendungszweck';
  return t.length > 160 ? t.slice(0, 157) + '…' : t;
}

document.addEventListener('alpine:init', () => {

  Alpine.data('vorschlaegeTab', () => ({
    loaded: false,
    status: 'offen',
    vorschlaege: [],
    kostenarten: [],
    laeuft: false,

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      await this.ladeKostenarten();
      await this.lade();
    },

    async ladeKostenarten() {
      const csrf = Alpine.store('csrf');
      try {
        const res = await csrf.fetch('/api/assets/cost-categories');
        this.kostenarten = res.ok ? await res.json() : [];
      } catch (e) {
        this.kostenarten = [];
      }
    },

    async lade() {
      const csrf = Alpine.store('csrf');
      this.laeuft = true;
      this.rendern();
      try {
        const res = await csrf.fetch('/api/assets/expense-proposals?status=' + encodeURIComponent(this.status));
        this.vorschlaege = res.ok ? await res.json() : [];
      } catch (e) {
        this.vorschlaege = [];
        Alpine.store('toast').error('Fehler: ' + netzFehlerText(e));
      }
      this.laeuft = false;
      this.rendern();
    },

    rendern() {
      const ziel = this.$refs.vorschlaegeContent;
      if (!ziel) return;

      let html = '<div class="filters-row" style="margin-bottom:16px">';
      for (const s of ['offen', 'bestaetigt', 'verworfen']) {
        const aktiv = this.status === s ? 'btn-primary' : '';
        html += `<button class="btn ${aktiv}" onclick="vorschlaegeStatus('${s}')">`
          + esc(VORSCHLAG_STATUS[s]) + '</button>';
      }
      html += '<span style="flex:1"></span>'
        + '<button class="btn" onclick="vorschlaegeNeuErzeugen()">Vorschl&#228;ge aktualisieren</button>'
        + '</div>';

      if (this.laeuft) {
        ziel.innerHTML = html + '<div class="spinner">Laden&#8230;</div>';
        return;
      }

      if (this.vorschlaege.length === 0) {
        html += '<div class="card card-pad"><div class="empty">'
          + (this.status === 'offen'
            ? 'Keine offenen Kostenvorschl&#228;ge. Neue entstehen automatisch nach jedem Bankabgleich.'
            : 'Keine Vorschl&#228;ge mit diesem Status.')
          + '</div></div>';
        ziel.innerHTML = html;
        return;
      }

      const summe = this.vorschlaege.reduce((n, v) => n + Number(v.amount_gross || 0), 0);
      html += `<div class="card card-pad" style="margin-bottom:12px">`
        + `<strong>${this.vorschlaege.length}</strong> Vorschl&#228;ge, zusammen `
        + `<strong>${esc(vorschlagGeld(summe))}</strong>`
        + '</div>';

      for (const v of this.vorschlaege) html += this.karte(v);
      ziel.innerHTML = html;
    },

    karte(v) {
      const sicher = VORSCHLAG_SICHERHEIT[v.sicherheit] || VORSCHLAG_SICHERHEIT.mittel;
      const offen = v.status === 'offen';

      let html = '<div class="card card-pad" style="margin-bottom:10px">';

      html += '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline">'
        + `<strong style="font-size:16px">${esc(vorschlagGeld(v.amount_gross))}</strong>`
        + `<span>${esc(v.vendor_name || 'ohne Gegenpartei')}</span>`
        + `<span style="color:#57606a">${esc(vorschlagDatum(v.booking_date))}</span>`
        + `<span style="color:${sicher.farbe};font-weight:600">${esc(sicher.text)}</span>`
        + `<span style="flex:1"></span>`
        + `<span style="color:#57606a">${esc(v.property_code || '')}</span>`
        + '</div>';

      html += '<div style="margin-top:8px">'
        + `<span style="color:#57606a">Kostenart:</span> <strong>${esc(v.cost_category_name || v.cost_category_code || '')}</strong>`
        + ` &#183; <span style="color:#57606a">umlagef&#228;hig:</span> <strong>${v.umlagefaehig ? 'ja' : 'nein'}</strong>`
        + ` &#183; <span style="color:#57606a">Leistungszeitraum:</span> ${esc(vorschlagZeitraum(v.service_period_start, v.service_period_end))}`
        + '</div>';

      if (Number(v.anteil) !== 1) {
        html += `<div style="margin-top:4px;color:#9a6700">Anteil am Zahlbetrag: `
          + `${esc((Number(v.anteil) * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''))} %</div>`;
      }

      html += `<div style="margin-top:8px;color:#57606a;font-size:13px">${esc(vorschlagZweck(v.reference))}</div>`;
      html += `<div style="margin-top:6px;font-size:13px">${esc(v.begruendung || '')}</div>`;

      if (v.notiz) {
        html += `<div style="margin-top:6px;font-size:13px;color:#57606a">Notiz: ${esc(v.notiz)}</div>`;
      }

      if (offen) {
        html += `<div id="vorschlag-aendern-${v.id}" style="display:none;margin-top:10px;padding:10px;background:#f6f8fa;border-radius:6px">`
          + '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">'
          + `<label>Kostenart <select class="form-input" id="vorschlag-art-${v.id}" style="width:260px">`;
        for (const k of this.kostenarten) {
          const gewaehlt = Number(k.id) === Number(v.cost_category_id) ? ' selected' : '';
          html += `<option value="${esc(String(k.id))}"${gewaehlt}>${esc(k.name || k.code)}</option>`;
        }
        html += '</select></label>'
          + `<label><input type="checkbox" id="vorschlag-umlage-${v.id}"${v.umlagefaehig ? ' checked' : ''}> umlagef&#228;hig</label>`
          + '</div></div>';

        html += '<div class="filters-row" style="margin-top:12px">'
          + `<button class="btn btn-primary" onclick="vorschlagUebernehmen(${v.id})">&#220;bernehmen</button>`
          + `<button class="btn" onclick="vorschlagAendernZeigen(${v.id})">&#196;ndern</button>`
          + `<button class="btn" onclick="vorschlagVerwerfen(${v.id})">Verwerfen</button>`
          + '</div>';
      } else {
        html += `<div style="margin-top:10px;color:#57606a">Status: ${esc(VORSCHLAG_STATUS[v.status] || v.status)}`
          + (v.expense_booking_id ? ` &#183; Buchung #${esc(String(v.expense_booking_id))}` : '')
          + (v.entschieden_am ? ` &#183; ${esc(vorschlagDatum(v.entschieden_am))}` : '')
          + '</div>';
      }

      html += '</div>';
      return html;
    },
  }));
});

// ── Globale Helfer ─────────────────────────────────────────────────────────

function vorschlaegeDaten() {
  const el = document.querySelector('[x-data="vorschlaegeTab"]');
  return el ? Alpine.$data(el) : null;
}

function vorschlaegeStatus(status) {
  const d = vorschlaegeDaten();
  if (!d) return;
  d.status = status;
  d.lade();
}

function vorschlagAendernZeigen(id) {
  const box = document.getElementById('vorschlag-aendern-' + id);
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

/* Erzeugt Vorschläge aus den vorhandenen Umsätzen. Normalerweise passiert das
   nach jedem Bankabgleich von selbst; der Knopf ist für den Fall, dass Regeln
   geändert wurden. */
async function vorschlaegeNeuErzeugen() {
  const csrf = Alpine.store('csrf');
  const d = vorschlaegeDaten();
  try {
    const res = await csrf.fetch('/api/assets/expense-proposals/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      const fehler = await res.json().catch(() => ({}));
      Alpine.store('toast').error('Fehler: ' + (fehler.error || res.status));
      return;
    }
    const e = await res.json();
    const teile = [];
    if (e.angelegt) teile.push(e.angelegt + ' neu');
    if (e.aktualisiert) teile.push(e.aktualisiert + ' angepasst');
    if (e.zurueckgezogen) teile.push(e.zurueckgezogen + ' zurückgezogen');
    Alpine.store('toast').success(
      teile.length > 0 ? 'Vorschläge: ' + teile.join(', ') + '.' : 'Keine Änderung.');
    if (d) await d.lade();
  } catch (err) {
    Alpine.store('toast').error('Fehler: ' + netzFehlerText(err));
  }
}

async function vorschlagUebernehmen(id) {
  const csrf = Alpine.store('csrf');
  const d = vorschlaegeDaten();

  // Nur senden, was der Owner tatsächlich geändert hat — ein leerer Rumpf
  // übernimmt den Vorschlag so, wie er dasteht.
  const rumpf = {};
  const artFeld = document.getElementById('vorschlag-art-' + id);
  const box = document.getElementById('vorschlag-aendern-' + id);
  if (box && box.style.display === 'block') {
    if (artFeld && artFeld.value) rumpf.cost_category_id = parseInt(artFeld.value, 10);
    const umlage = document.getElementById('vorschlag-umlage-' + id);
    if (umlage) rumpf.umlagefaehig = umlage.checked;
  }

  try {
    const res = await csrf.fetch('/api/assets/expense-proposals/' + id + '/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rumpf),
    });
    if (!res.ok) {
      const fehler = await res.json().catch(() => ({}));
      Alpine.store('toast').error('Fehler: ' + (fehler.error || res.status));
      return;
    }
    const e = await res.json();
    Alpine.store('toast').success(e.bereits_bestaetigt
      ? 'War schon übernommen — Buchung #' + e.expense_booking_id + '.'
      : 'Übernommen als Buchung #' + e.expense_booking_id + '.');
    if (d) await d.lade();
  } catch (err) {
    Alpine.store('toast').error('Fehler: ' + netzFehlerText(err));
  }
}

async function vorschlagVerwerfen(id) {
  const csrf = Alpine.store('csrf');
  const d = vorschlaegeDaten();
  const grund = window.prompt('Grund für das Verwerfen (optional):', '');
  if (grund === null) return;

  try {
    const res = await csrf.fetch('/api/assets/expense-proposals/' + id + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grund: grund || undefined }),
    });
    if (!res.ok) {
      const fehler = await res.json().catch(() => ({}));
      Alpine.store('toast').error('Fehler: ' + (fehler.error || res.status));
      return;
    }
    Alpine.store('toast').success('Verworfen. Es wurde keine Buchung angelegt.');
    if (d) await d.lade();
  } catch (err) {
    Alpine.store('toast').error('Fehler: ' + netzFehlerText(err));
  }
}
