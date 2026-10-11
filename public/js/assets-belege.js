/* ═══════════════════════════════════════════════════════════════════════════
   Belege & Strom — Unterbereich von Immobilien

   Zwei Abschnitte:

   1. BELEGE — je Objekt die archivierten Rechnungen mit Jahr, Sparte, Betrag,
      Leistungszeitraum, Zählernummern und einem Link auf die PDF. Erfüllt die
      Owner-Anforderung „alle Rechnungen müssen als digitale Kopie bei Bedarf
      zur Verfügung stehen".

   2. STROM & MIETERSTROM — der Strom von MG24 läuft über eine Kundenanlage und
      wird von energiekonzept getrennt mit den Mietern abgerechnet. Er gehört
      damit nicht in die Nebenkosten, aber sehr wohl in die Objektverwaltung.
      Der Abschnitt stellt zusammen, was dazu an Daten vorliegt: Zähler,
      Strombuchungen nach Rechnungszeiträumen und die Belege.

   Aufbau wie die übrigen Unterbereiche: Die Komponente baut HTML in ihr
   x-ref-Ziel, die Schaltflächen rufen globale Funktionen. Keine
   Alpine-Ausdrücke im erzeugten Markup.
   ═══════════════════════════════════════════════════════════════════════════ */

function belegGeld(wert) {
  const n = Number(wert);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function belegDatum(wert) {
  if (!wert) return '—';
  const d = new Date(wert);
  return isNaN(d.getTime()) ? String(wert).slice(0, 10) : d.toLocaleDateString('de-DE');
}

/* Stromzähler und ihre Rolle. Die Nummern stehen so auf den Rechnungen; die
   Rolle ist das, was man beim Lesen einer Abrechnung wissen muss. */
const STROMZAEHLER_ROLLE = {
  '1APA0116042112': 'Baustrom während der Bauphase (SWT Kd 492014, Vertrag 328879)',
  '1EMH0012291975': 'Allgemein-/Objektstrom bis 16.06.2025, Zählerfaktor 50 (SWT Vertrag 348661)',
  '1LGZ0071678615': 'Übergabezähler der Kundenanlage ab 17.06.2025, Zählerfaktor 50',
  '1LGZ0075661371': 'Allgemeinstromzähler ab 24.06.2025 — 954 kWh in 2025',
};

document.addEventListener('alpine:init', () => {

  Alpine.data('belegeTab', () => ({
    loaded: false,
    abschnitt: 'belege',   // belege | strom
    objekt: '',
    objekte: [],
    belege: [],
    archivVorhanden: true,
    buchungen: [],
    zaehler: [],
    laeuft: false,

    async init() {
      if (this.loaded) return;
      this.loaded = true;
      const csrf = Alpine.store('csrf');
      try {
        const res = await csrf.fetch('/api/assets/properties');
        this.objekte = res.ok ? await res.json() : [];
      } catch (e) {
        this.objekte = [];
      }
      this.objekt = this.objekte.length > 0
        ? (this.objekte.find(p => p.code === 'mg24')?.code || this.objekte[0].code) : '';
      await this.lade();
    },

    async lade() {
      if (!this.objekt) { this.rendern(); return; }
      const csrf = Alpine.store('csrf');
      this.laeuft = true;
      this.rendern();
      try {
        const [b, e, m] = await Promise.all([
          csrf.fetch(`/api/assets/properties/${encodeURIComponent(this.objekt)}/belege`),
          csrf.fetch(`/api/assets/properties/${encodeURIComponent(this.objekt)}/expense-bookings`),
          csrf.fetch(`/api/assets/meters?property_id=${encodeURIComponent(this.objektId())}`),
        ]);
        const bd = b.ok ? await b.json() : { belege: [], archiv_vorhanden: false };
        this.belege = bd.belege || [];
        this.archivVorhanden = bd.archiv_vorhanden !== false;
        this.buchungen = e.ok ? await e.json() : [];
        this.zaehler = m.ok ? await m.json() : [];
      } catch (err) {
        Alpine.store('toast').error('Fehler: ' + netzFehlerText(err));
      }
      this.laeuft = false;
      this.rendern();
    },

    objektId() {
      const p = this.objekte.find(x => x.code === this.objekt);
      return p ? p.id : '';
    },

    rendern() {
      const ziel = this.$refs.belegeContent;
      if (!ziel) return;

      let html = '<div class="filters-row" style="margin-bottom:16px">';
      html += '<label>Objekt <select class="form-input" id="beleg-objekt" onchange="belegeObjektWechseln()" style="width:200px">';
      for (const p of this.objekte) {
        const sel = p.code === this.objekt ? ' selected' : '';
        html += `<option value="${esc(p.code)}"${sel}>${esc(p.name || p.code)}</option>`;
      }
      html += '</select></label>';
      for (const [k, t] of [['belege', 'Belege'], ['strom', 'Strom & Mieterstrom']]) {
        const aktiv = this.abschnitt === k ? 'btn-primary' : '';
        html += `<button class="btn ${aktiv}" onclick="belegeAbschnitt('${k}')">${esc(t)}</button>`;
      }
      html += '</div>';

      if (this.laeuft) { ziel.innerHTML = html + '<div class="spinner">Laden&#8230;</div>'; return; }

      html += this.abschnitt === 'belege' ? this.renderBelege() : this.renderStrom();
      ziel.innerHTML = html;
    },

    // ── Abschnitt 1: Belege ────────────────────────────────────────────────
    renderBelege() {
      if (!this.archivVorhanden) {
        return '<div class="card card-pad"><div class="empty">Es ist noch kein Belegarchiv '
          + 'angelegt.</div></div>';
      }
      if (this.belege.length === 0) {
        return '<div class="card card-pad"><div class="empty">Für dieses Objekt liegen keine '
          + 'archivierten Belege vor.</div></div>';
      }

      const jahre = [...new Set(this.belege.map(b => b.jahr))].sort((a, b) => b - a);
      let html = '';

      for (const jahr of jahre) {
        const imJahr = this.belege.filter(b => b.jahr === jahr);
        const summe = imJahr.reduce((n, b) => n + Number(b.brutto || 0), 0);
        html += `<div class="card card-pad" style="margin-bottom:12px">`
          + `<h3 style="font-size:15px;margin-bottom:12px">${esc(String(jahr))} &#183; `
          + `${imJahr.length} Belege &#183; ${esc(belegGeld(summe))}</h3>`
          + '<div style="overflow-x:auto"><table class="assets-table"><thead><tr>'
          + '<th>Datum</th><th>Sparte</th><th style="text-align:right">Betrag</th>'
          + '<th>Leistungszeitraum</th><th>Vertrag</th><th>Z&#228;hler</th><th>Datei</th>'
          + '</tr></thead><tbody>';

        for (const b of imJahr) {
          const warn = b.nachbargebaeude
            ? ' <span style="color:#b42318;font-weight:600">[Nachbargeb&#228;ude]</span>' : '';
          const sp = b.sharepoint
            ? ' <span style="color:#57606a" title="liegt auch in SharePoint">&#183; SP</span>' : '';
          html += '<tr>'
            + `<td>${esc(belegDatum(b.rechnungsdatum))}</td>`
            + `<td>${esc((b.sparten || []).join(', ') || '—')}${warn}</td>`
            + `<td style="text-align:right">${esc(belegGeld(b.brutto))}</td>`
            + `<td>${esc(b.leistungszeitraum || '—')}</td>`
            + `<td>${esc(b.rechnungseinheit || '')}</td>`
            + `<td style="font-size:12px">${esc((b.zaehlernummern || []).join(', ') || '—')}</td>`
            + `<td>${b.link_code
              ? `<a href="/dashboard/api/belege/${esc(b.link_code)}" target="_blank" rel="noopener">PDF</a>${sp}`
              : '—'}</td>`
            + '</tr>';
        }
        html += '</tbody></table></div></div>';
      }

      const mitSp = this.belege.filter(b => b.sharepoint).length;
      html += '<div class="card card-pad" style="font-size:13px;color:#57606a">'
        + 'Jeder Beleg liegt als Kopie im Belegarchiv und ist über die Pr&#252;fsumme '
        + 'wiedererkennbar. „SP" heißt: dieselbe Rechnung liegt auch in SharePoint — sie ist '
        + `dort nicht ein zweites Mal abgelegt worden (${mitSp} von ${this.belege.length}).`
        + '</div>';
      return html;
    },

    // ── Abschnitt 2: Strom & Mieterstrom ───────────────────────────────────
    renderStrom() {
      const stromBelege = this.belege.filter(b => (b.sparten || []).includes('Strom'));
      const stromZaehler = this.zaehler.filter(
        m => ['electricity', 'power', 'strom'].includes(String(m.medium || '').toLowerCase()));
      const stromBuchungen = this.buchungen.filter(b =>
        /strom|kundenanlage|baustrom|allgemeinstrom/i.test(
          `${b.source_key || ''} ${b.notes || ''} ${b.vendor_name || ''}`));

      let html = '<div class="card card-pad" style="margin-bottom:12px">'
        + '<h3 style="font-size:15px;margin-bottom:8px">Wie der Strom hier l&#228;uft</h3>'
        + '<div style="font-size:14px;line-height:1.6">'
        + 'Der Strom wird <strong>nicht</strong> &#252;ber die Nebenkosten abgerechnet. Das Objekt '
        + 'bezieht Strom als Kundenanlage; die Verteilung auf die Mieter macht energiekonzept '
        + 'ortenau getrennt (Mieterstrom). In der Nebenkostenabrechnung erscheint nur der '
        + '<strong>Allgemeinstrom</strong>. Deshalb stehen die Bez&#252;ge der Kundenanlage unten '
        + 'als „nicht umlagef&#228;hig".'
        + '</div></div>';

      // Zähler
      html += '<div class="card card-pad" style="margin-bottom:12px">'
        + '<h3 style="font-size:15px;margin-bottom:12px">Z&#228;hler</h3>';
      const bekannt = Object.keys(STROMZAEHLER_ROLLE);
      const ausBelegen = [...new Set(
        stromBelege.flatMap(b => b.zaehlernummern || []))].filter(n => n);
      const alle = [...new Set([...ausBelegen, ...bekannt])];
      if (alle.length === 0) {
        html += '<div class="empty">Keine Stromz&#228;hler bekannt.</div>';
      } else {
        html += '<div style="overflow-x:auto"><table class="assets-table"><thead><tr>'
          + '<th>Nummer</th><th>Rolle</th><th>im Bestand</th></tr></thead><tbody>';
        for (const n of alle) {
          const imBestand = stromZaehler.some(m => m.meter_number === n || m.meterNumber === n);
          html += `<tr><td style="font-size:12px">${esc(n)}</td>`
            + `<td>${esc(STROMZAEHLER_ROLLE[n] || 'Rolle nicht hinterlegt')}</td>`
            + `<td>${imBestand ? 'ja' : 'nein — nur auf den Rechnungen'}</td></tr>`;
        }
        html += '</tbody></table></div>';
      }
      html += '</div>';

      // Buchungen
      html += '<div class="card card-pad" style="margin-bottom:12px">'
        + '<h3 style="font-size:15px;margin-bottom:12px">Strombuchungen nach Rechnungszeitr&#228;umen</h3>';
      if (stromBuchungen.length === 0) {
        html += '<div class="empty">Keine Strombuchungen erfasst.</div>';
      } else {
        const summeUml = stromBuchungen.filter(b => b.umlagefaehig)
          .reduce((n, b) => n + Number(b.amount_gross || 0), 0);
        const summeNicht = stromBuchungen.filter(b => !b.umlagefaehig)
          .reduce((n, b) => n + Number(b.amount_gross || 0), 0);
        html += '<div style="overflow-x:auto"><table class="assets-table"><thead><tr>'
          + '<th>Leistungszeitraum</th><th>Kostenart</th><th style="text-align:right">Betrag</th>'
          + '<th>umlagef&#228;hig</th><th>Rechnung</th></tr></thead><tbody>';
        for (const b of stromBuchungen.slice().sort((x, y) =>
          String(x.service_period_start).localeCompare(String(y.service_period_start)))) {
          html += '<tr>'
            + `<td>${esc(belegDatum(b.service_period_start))} – ${esc(belegDatum(b.service_period_end))}</td>`
            + `<td>${esc(b.cost_category_name || b.cost_category_code || '')}</td>`
            + `<td style="text-align:right">${esc(belegGeld(b.amount_gross))}</td>`
            + `<td>${b.umlagefaehig ? 'ja' : 'nein'}</td>`
            + `<td style="font-size:12px">${esc(b.invoice_number || '—')}</td>`
            + '</tr>';
        }
        html += '</tbody></table></div>'
          + `<div style="margin-top:10px">Umlagef&#228;hig <strong>${esc(belegGeld(summeUml))}</strong>`
          + ` &#183; nicht umlagef&#228;hig <strong>${esc(belegGeld(summeNicht))}</strong></div>`;
      }
      html += '</div>';

      // Was fehlt
      html += '<div class="card card-pad">'
        + '<h3 style="font-size:15px;margin-bottom:12px">Was f&#252;r eine vollst&#228;ndige '
        + 'Strom&#252;bersicht noch fehlt</h3>'
        + '<ul style="line-height:1.7;padding-left:20px">'
        + '<li>Die <strong>Kundenanlagenabrechnung von energiekonzept</strong> f&#252;r 2025 — '
        + 'erst sie belegt, welche Mengen den Mietern weiterberechnet wurden. Solange sie '
        + 'fehlt, stehen die Bez&#252;ge der Kundenanlage als Arbeitsannahme auf „nicht '
        + 'umlagef&#228;hig".</li>'
        + '<li><strong>PV-Erzeugung und Mieterstrommengen je Wohnung</strong> — daf&#252;r gibt es '
        + 'im Bestand keine Tabelle; sie sind bisher nur in den energiekonzept-Belegen '
        + 'enthalten.</li>'
        + '<li>Der <strong>Allgemeinstromz&#228;hler 1LGZ0075661371</strong> ist noch nicht als '
        + 'Z&#228;hler erfasst; die 954 kWh f&#252;r 2025 stammen aus einem Beleg.</li>'
        + '</ul></div>';

      return html;
    },
  }));
});

// ── Globale Helfer ─────────────────────────────────────────────────────────

function belegeDaten() {
  const el = document.querySelector('[x-data="belegeTab"]');
  return el ? Alpine.$data(el) : null;
}

function belegeAbschnitt(name) {
  const d = belegeDaten();
  if (!d) return;
  d.abschnitt = name;
  d.rendern();
}

function belegeObjektWechseln() {
  const d = belegeDaten();
  const feld = document.getElementById('beleg-objekt');
  if (!d || !feld) return;
  d.objekt = feld.value;
  d.lade();
}
