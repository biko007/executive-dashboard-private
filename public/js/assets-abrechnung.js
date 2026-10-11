/* ═══════════════════════════════════════════════════════════════════════════
   Abrechnung — Darstellung je Einheit

   Owner-Anforderung: „schöne Darstellung mit Verbräuchen". Je Wohnung eine
   Karte mit Zählerständen Anfang und Ende, Verbrauch je Medium, Kostenarten
   mit ihrem Verteilschlüssel, Vorauszahlung, Saldo und verlinkten Belegen.

   Drei Dinge, die diese Ansicht bewusst anders macht als die bisherige
   Vorschau:

   1. **Zählerstände statt Brüche.** „26,96 von 437" sagt einem Mieter nichts.
      „Ihr Kaltwasserzähler lief von 0 auf 26,96 m³" schon.
   2. **Der Verteilschlüssel im Klartext.** Nicht `sqm`, sondern „nach
      Wohnfläche"; nicht `methodA(…30/70)`, sondern „30 % nach Wohnfläche,
      70 % nach Verbrauch".
   3. **Befunde sichtbar.** Ein ungemessener Rest oder eine Abweichung von der
      Heizkostenverordnung gehört in die Abrechnung geschrieben — wer sie
      versteckt, bekommt die Frage später vom Mieter.

   Es ist eine VORSCHAU: Es entsteht kein Dokument und es wird nichts
   versendet. Das steht auch so auf der Seite.

   Aufbau wie die übrigen Unterbereiche: HTML ins x-ref-Ziel, globale
   Funktionen an den Schaltflächen, keine Alpine-Ausdrücke im Markup.
   ═══════════════════════════════════════════════════════════════════════════ */

function abrGeld(wert) {
  const n = Number(wert);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function abrZahl(wert, stellen) {
  const n = Number(wert);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: stellen === undefined ? 2 : stellen,
    maximumFractionDigits: stellen === undefined ? 2 : stellen,
  });
}

/* Zwei Wärmemengenzähler in derselben Wohnung heißen beide „Wärme" — ohne
   den Zweck ist nicht zu erkennen, was sie unterscheidet. Die Werte stammen
   aus `submetering_purpose` (nk/heating.ts). */
const ABR_ZWECK = {
  space_heating_heat: 'Raumw&#228;rme',
  warm_water_heat: 'Warmwasserbereitung',
};

function abrDatum(wert) {
  if (!wert) return '—';
  const d = new Date(wert);
  return isNaN(d.getTime()) ? String(wert).slice(0, 10) : d.toLocaleDateString('de-DE');
}

/* Saldofarben: Eine Nachzahlung ist für den Mieter die unangenehme Nachricht
   und soll nicht grün aussehen. */
function abrSaldoFarbe(saldo) {
  const n = Number(saldo);
  if (!isFinite(n) || Math.abs(n) < 0.005) return '#57606a';
  return n > 0 ? '#b42318' : '#1a7f37';
}

function abrSaldoWort(saldo) {
  const n = Number(saldo);
  if (!isFinite(n) || Math.abs(n) < 0.005) return 'ausgeglichen';
  return n > 0 ? 'Nachzahlung' : 'Guthaben';
}

/* Wen betrifft ein Befund? Bevorzugt die sprechende Kennung (Zählernummer,
   Einheit), nicht die technische Satznummer — der Owner sucht im Dashboard
   nach „MG24-W1-KW", nicht nach „meter_id 83". */
function abrBetroffen(f) {
  const d = (f && f.details) || null;
  if (!d || typeof d !== 'object') return '';
  for (const k of ['meter_number', 'unit_code', 'category', 'meters', 'meter_id', 'unit_id']) {
    if (d[k] !== null && d[k] !== undefined && d[k] !== '') return String(d[k]);
  }
  return '';
}

document.addEventListener('alpine:init', () => {

  Alpine.data('abrechnungTab', () => ({
    loaded: false,
    objekt: '',
    objekte: [],
    jahr: new Date().getFullYear() - 1,
    /* Leer = volles Kalenderjahr. Ein gesetzter Stichtag macht daraus eine
       Zwischenabrechnung; der Jahresbeginn bleibt der Anfang. */
    stichtag: '',
    daten: null,
    laeuft: false,
    fehler: '',

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
      this.fehler = '';
      this.rendern();
      try {
        const bis = this.stichtag ? `&bis=${encodeURIComponent(this.stichtag)}` : '';
        const res = await csrf.fetch(
          `/api/assets/properties/${encodeURIComponent(this.objekt)}/abrechnung-ansicht?jahr=${this.jahr}${bis}`);
        if (res.ok) {
          this.daten = await res.json();
        } else {
          const f = await res.json().catch(() => ({}));
          this.daten = null;
          this.fehler = f.error || ('HTTP ' + res.status);
        }
      } catch (e) {
        this.daten = null;
        this.fehler = netzFehlerText(e);
      }
      this.laeuft = false;
      this.rendern();
    },

    rendern() {
      const ziel = this.$refs.abrechnungContent;
      if (!ziel) return;

      let html = '<div class="filters-row" style="margin-bottom:16px">';
      html += '<label>Objekt <select class="form-input" id="abr-objekt" onchange="abrObjektWechseln()" style="width:180px">';
      for (const p of this.objekte) {
        const sel = p.code === this.objekt ? ' selected' : '';
        html += `<option value="${esc(p.code)}"${sel}>${esc(p.name || p.code)}</option>`;
      }
      html += '</select></label>';
      html += '<label>Jahr <select class="form-input" id="abr-jahr" onchange="abrJahrWechseln()" style="width:110px">';
      const jetzt = new Date().getFullYear();
      for (let j = jetzt; j >= jetzt - 4; j--) {
        html += `<option value="${j}"${j === Number(this.jahr) ? ' selected' : ''}>${j}</option>`;
      }
      html += '</select></label>';
      html += '<label>Stichtag <input type="date" class="form-input" id="abr-stichtag"'
        + ` value="${esc(this.stichtag)}" min="${this.jahr}-01-01" max="${this.jahr}-12-31"`
        + ' onchange="abrStichtagWechseln()" style="width:170px"></label>';
      if (this.stichtag) {
        html += '<button class="btn btn-ghost" onclick="abrStichtagLoeschen()">Ganzes Jahr</button>';
      }
      html += '<button class="btn" onclick="abrNeuLaden()">Neu rechnen</button>';
      html += '</div>';

      if (this.laeuft) { ziel.innerHTML = html + '<div class="spinner">Rechnen&#8230;</div>'; return; }
      if (this.fehler) {
        ziel.innerHTML = html + `<div class="alert alert-error">${esc(this.fehler)}</div>`;
        return;
      }
      if (!this.daten) {
        ziel.innerHTML = html + '<div class="card card-pad"><div class="empty">Keine Daten.</div></div>';
        return;
      }

      html += this.renderKopf();
      for (const e of this.daten.einheiten) html += this.renderEinheit(e);
      html += this.renderEigentuemer();
      html += this.renderBefunde();
      ziel.innerHTML = html;
    },

    renderKopf() {
      const d = this.daten;
      const h = d.heizung;
      return '<div class="card card-pad" style="margin-bottom:14px">'
        + `<div style="font-size:19px;font-weight:600">${esc(d.objekt_name)} &#183; Abrechnung ${esc(String(d.jahr))}</div>`
        + `<div style="color:#57606a;margin-top:2px">${esc(d.adresse)}</div>`
        + '<div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:12px">'
        + `<div><div style="color:#57606a;font-size:13px">Zeitraum</div>`
        + `<strong>${esc(abrDatum(d.zeitraum.von))} – ${esc(abrDatum(d.zeitraum.bis))}</strong></div>`
        + (d.blockiert ? '' : `<div><div style="color:#57606a;font-size:13px">Kosten gesamt</div>`
          + `<strong>${esc(abrGeld(d.summe_objekt))}</strong></div>`)
        + `<div><div style="color:#57606a;font-size:13px">Wohnungen</div>`
        + `<strong>${d.einheiten.length}</strong></div>`
        + (h ? `<div><div style="color:#57606a;font-size:13px">Heizkosten</div>`
          + `<strong>${esc(abrZahl(h.grundkosten_prozent, 0))} % Fl&#228;che / `
          + `${esc(abrZahl(h.verbrauch_prozent, 0))} % Verbrauch</strong></div>` : '')
        + '</div>'
        + (d.blockiert ? this.renderSperre() : '')
        + '<div style="margin-top:12px;padding:10px;background:#fff8e1;border-radius:6px;font-size:13px">'
        + (d.blockiert
          ? '<strong>Keine Abrechnung.</strong> Die Vorpr&#252;fung hat gesperrt. Unten stehen die '
            + 'Z&#228;hlerst&#228;nde, damit Sie sehen, woran es liegt — Betr&#228;ge werden bewusst '
            + 'keine gezeigt.'
          : d.zwischenabrechnung
          ? '<strong>Zwischenabrechnung zum ' + esc(abrDatum(d.zeitraum.bis)) + '.</strong> '
            + 'Keine Schlussabrechnung: Kosten, die erst sp&#228;ter im Jahr anfallen oder '
            + 'abgerechnet werden, fehlen. Anteilig gerechnete Posten und veraltete '
            + 'Z&#228;hlerst&#228;nde stehen unten bei den Hinweisen.'
          : '<strong>Vorschau.</strong> Diese Darstellung rechnet mit dem heutigen Datenstand. '
            + 'Es entsteht kein Dokument, und es wird nichts versendet.')
        + '</div></div>';
    },

    renderSperre() {
      const d = this.daten;
      let html = '<div style="margin-top:12px;padding:12px;background:#fff1f0;'
        + 'border:1px solid #f3b0a8;border-radius:6px">'
        + `<div style="color:#b42318;font-weight:600;margin-bottom:6px">`
        + `Abrechnung gesperrt — ${d.blocker.length} `
        + `${d.blocker.length === 1 ? 'Grund' : 'Gr&#252;nde'}</div>`
        + '<ul style="margin:0 0 0 18px;line-height:1.6;font-size:13px">';
      for (const b of d.blocker) html += `<li>${esc(b)}</li>`;
      html += '</ul></div>';
      return html;
    },

    renderEinheit(e) {
      const farbe = abrSaldoFarbe(e.saldo);
      let html = '<div class="card card-pad" style="margin-bottom:14px">';

      // Kopfzeile der Wohnung
      html += '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline">'
        + `<span style="font-size:17px;font-weight:600">${esc(e.einheit)}</span>`
        + (e.lage ? `<span style="color:#57606a">${esc(e.lage)}</span>` : '')
        + (e.wohnflaeche !== null ? `<span style="color:#57606a">${esc(abrZahl(e.wohnflaeche))} m&#178;</span>` : '')
        + (this.daten.blockiert ? ''
          : `<span style="color:#57606a">${e.tage} von ${e.tage_im_jahr} Tagen`
            + `${this.daten.zwischenabrechnung ? ' im Zeitraum' : ''}</span>`)
        + '<span style="flex:1"></span>'
        + (this.daten.blockiert
          ? '<span style="color:#b42318;font-weight:600">kein Ergebnis — gesperrt</span>'
          : `<span style="color:${farbe};font-size:17px;font-weight:600">`
            + `${esc(abrGeld(Math.abs(Number(e.saldo))))} ${esc(abrSaldoWort(e.saldo))}</span>`)
        + '</div>';

      /* § 9b-Hinweis direkt auf der Karte: Wer liest, was er zahlt, soll an
         derselben Stelle sehen, dass der Anteil aufgeteilt und nicht
         abgelesen wurde. */
      if (e.aufteilung_9b) {
        html += '<div style="margin-top:10px;padding:8px 10px;background:#fff8e1;'
          + `border-radius:6px;font-size:13px;color:#7a5900">${esc(e.aufteilung_9b)}</div>`;
      }

      // Verbrauch
      const aktive = (e.zaehler || []).filter(z => z.aktiv);
      const stille = (e.zaehler || []).filter(z => !z.aktiv);
      if (aktive.length > 0) {
        html += '<h4 style="font-size:14px;margin:16px 0 8px">Ihr Verbrauch</h4>'
          + '<div><table class="assets-table"><thead><tr>'
          + '<th>Medium</th><th>Z&#228;hler</th><th style="text-align:right">Stand Anfang</th>'
          + '<th style="text-align:right">Stand Ende</th><th style="text-align:right">Verbrauch</th>'
          + '</tr></thead><tbody>';
        for (const z of aktive) {
          const anfang = z.stand_anfang === null ? '—'
            : abrZahl(z.stand_anfang, 2) + (z.anfang_aus_anfangswert ? ' *' : '');
          html += `<tr${z.gesperrt ? ' style="background:#fff1f0"' : ''}>`
            + `<td>${esc(z.medium_name)}`
            + (ABR_ZWECK[z.zweck] ? `<br><span style="font-size:12px;color:#57606a">${ABR_ZWECK[z.zweck]}</span>` : '')
            + '</td>'
            + `<td style="font-size:12px">${z.gesperrt
              ? `<span style="color:#b42318;font-weight:600">${esc(z.nummer)}</span>`
              : esc(z.nummer)}</td>`
            + `<td style="text-align:right">${esc(anfang)}`
            + (z.stand_anfang_am ? `<br><span style="color:#57606a;font-size:12px">${esc(abrDatum(z.stand_anfang_am))}</span>` : '')
            + '</td>'
            + `<td style="text-align:right">${z.stand_ende === null ? '—' : esc(abrZahl(z.stand_ende, 2))}`
            + (z.stand_ende_am ? `<br><span style="color:#57606a;font-size:12px">${esc(abrDatum(z.stand_ende_am))}</span>` : '')
            + '</td>'
            + `<td style="text-align:right"><strong>${esc(abrZahl(z.verbrauch, 2))} ${esc(z.einheit)}</strong>`
            + (z.stand_anfang === null ? ' <span style="color:#9a6700">&#8224;</span>' : '')
            + '</td>'
            + '</tr>';
        }
        html += '</tbody></table></div>';
        if (aktive.some(z => z.anfang_aus_anfangswert)) {
          html += '<div style="font-size:12px;color:#57606a;margin-top:6px">'
            + '* Der Anfangsstand stammt aus dem beim Einbau hinterlegten Wert, nicht aus einer '
            + 'Ablesung zum Jahresbeginn.</div>';
        }
        if (aktive.some(z => z.stand_anfang === null)) {
          html += '<div style="font-size:12px;color:#9a6700;margin-top:6px">'
            + '&#8224; F&#252;r diesen Z&#228;hler liegt kein Anfangsstand vor. Gerechnet wird '
            + 'mit dem Endstand allein; der ausgewiesene Verbrauch ist damit eher zu hoch als '
            + 'zu niedrig. Vor einer verbindlichen Abrechnung muss der Anfangsstand nachgetragen '
            + 'werden.</div>';
        }
      }
      if (stille.length > 0) {
        html += '<div style="font-size:13px;color:#9a6700;margin-top:8px">'
          + `${stille.length} Z&#228;hler ist bis zur Kl&#228;rung abgeschaltet und geht nicht in die `
          + `Abrechnung ein: ${esc(stille.map(z => z.nummer).join(', '))}.</div>`;
      }

      // Kosten
      if (this.daten.blockiert) {
        html += '<div style="margin-top:12px;font-size:13px;color:#b42318">'
          + 'Die rot markierten Z&#228;hler haben keinen belegten Anfangsstand. Solange er fehlt, '
          + 'w&#252;rde der gesamte Z&#228;hlerstand seit Einbau als Verbrauch dieses Zeitraums '
          + 'abgerechnet — also auch Estrichtrocknung, Bauheizung und Leerstand.</div></div>';
        return html;
      }

      /* Fünf Spalten, nicht sechs: Ab sechs stellt responsiv.js schmal auf
         einen seitlichen Scrollbereich um, und die Hauptsache der Seite läge
         dann auf dem Telefon halb außerhalb des Bildes. Die Belege stehen
         deshalb als Zeile unter der Kostenart — dort gehören sie ohnehin hin. */
      html += '<h4 style="font-size:14px;margin:18px 0 8px">Ihre Kostenanteile</h4>'
        + '<div><table class="assets-table"><thead><tr>'
        + '<th>Kostenart</th><th style="text-align:right">Gesamt Objekt</th><th>Verteilt</th>'
        + '<th style="text-align:right">Ihr Anteil</th><th style="text-align:right">Betrag</th>'
        + '</tr></thead><tbody>';
      for (const k of e.kosten) {
        /* Buchungen ohne Rechnungsnummer UND ohne hinterlegtes PDF ergeben nur
           einen Gedankenstrich — eine Reihe davon sagt nichts und verdeckt die
           Belege, die es wirklich gibt. */
        const belege = (k.belege || [])
          .filter(b => b.link_code || b.rechnungsnummer)
          .map(b => b.link_code
            ? `<a href="/dashboard/api/belege/${esc(b.link_code)}" target="_blank" rel="noopener">${esc(b.rechnungsnummer || 'PDF')}</a>`
            : esc(b.rechnungsnummer)).join(', ');
        const ohneBeleg = (k.belege || []).length - (k.belege || []).filter(b => b.link_code || b.rechnungsnummer).length;
        html += '<tr>'
          + `<td>${esc(k.kostenart_name)}`
          + (belege ? `<br><span style="font-size:12px;color:#57606a">Beleg: ${belege}</span>` : '')
          + (ohneBeleg > 0
            ? `<br><span style="font-size:12px;color:#9a6700">${ohneBeleg} Buchung`
              + `${ohneBeleg === 1 ? '' : 'en'} ohne Belegnachweis</span>` : '')
          + '</td>'
          + `<td style="text-align:right">${k.gesamt_objekt === null ? '—' : esc(abrGeld(k.gesamt_objekt))}</td>`
          + `<td style="font-size:13px">${esc(k.schluessel_klartext)}</td>`
          + `<td style="text-align:right">${k.anteil_prozent === null ? '—' : esc(abrZahl(k.anteil_prozent, 2)) + ' %'}</td>`
          + `<td style="text-align:right"><strong>${esc(abrGeld(k.betrag))}</strong></td>`
          + '</tr>';
      }
      html += '</tbody></table></div>';

      // Abschluss
      html += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #d8dee4">'
        + '<table class="assets-table" style="max-width:420px"><tbody>'
        + `<tr><td>Summe Ihrer Kostenanteile</td><td style="text-align:right">${esc(abrGeld(e.kosten_summe))}</td></tr>`
        + `<tr><td>Ihre Vorauszahlungen</td><td style="text-align:right">− ${esc(abrGeld(e.vorauszahlung))}</td></tr>`
        + (Math.abs(Number(e.rundung)) >= 0.005
          ? `<tr><td>Rundungsausgleich</td><td style="text-align:right">${esc(abrGeld(e.rundung))}</td></tr>` : '')
        + `<tr><td><strong>${esc(abrSaldoWort(e.saldo))}</strong></td>`
        + `<td style="text-align:right;color:${farbe}"><strong>${esc(abrGeld(Math.abs(Number(e.saldo))))}</strong></td></tr>`
        + '</tbody></table></div>';

      html += '</div>';
      return html;
    },

    renderEigentuemer() {
      const ei = this.daten.eigentuemer;
      if (!ei || Math.abs(Number(ei.kosten_summe)) < 0.005) return '';
      let html = '<div class="card card-pad" style="margin-bottom:14px">'
        + '<h4 style="font-size:15px;margin-bottom:4px">Anteil des Eigent&#252;mers</h4>'
        + '<div style="color:#57606a;font-size:13px;margin-bottom:12px">'
        + 'Leerstand, nicht umlagef&#228;hige Posten und — bei Verbrauchsverteilung — der Teil der '
        + 'Versorgermenge, den kein Wohnungsz&#228;hler erfasst hat.</div>'
        + '<div><table class="assets-table"><thead><tr>'
        + '<th>Kostenart</th><th>Verteilt</th><th style="text-align:right">Betrag</th>'
        + '</tr></thead><tbody>';
      for (const k of ei.kosten) {
        html += `<tr><td>${esc(k.kostenart_name)}</td>`
          + `<td style="font-size:13px">${esc(k.schluessel_klartext)}</td>`
          + `<td style="text-align:right">${esc(abrGeld(k.betrag))}</td></tr>`;
      }
      html += `<tr><td colspan="2"><strong>Summe</strong></td>`
        + `<td style="text-align:right"><strong>${esc(abrGeld(ei.kosten_summe))}</strong></td></tr>`
        + '</tbody></table></div></div>';
      return html;
    },

    renderBefunde() {
      const b = this.daten.befunde || [];
      if (b.length === 0) return '';

      /* Nach Prüfcode bündeln. Der Core meldet „Ablesung fehlt" je Zähler —
         vierzehnmal derselbe Satz untereinander liest niemand. Einmal der
         Satz, dahinter die betroffenen Zähler. */
      const gruppen = new Map();
      for (const f of b) {
        let g = gruppen.get(f.code);
        if (!g) { g = { code: f.code, schwere: f.schwere, texte: [], betroffen: [] }; gruppen.set(f.code, g); }
        if (!g.texte.includes(f.text)) g.texte.push(f.text);
        const wen = abrBetroffen(f);
        if (wen && !g.betroffen.includes(wen)) g.betroffen.push(wen);
        // Der schwerste Fall bestimmt die Farbe der Gruppe.
        if (f.schwere === 'blocker') g.schwere = 'blocker';
        else if (f.schwere === 'warning' && g.schwere !== 'blocker') g.schwere = 'warning';
      }

      let html = '<div class="card card-pad">'
        + `<h4 style="font-size:15px;margin-bottom:4px">Hinweise zu dieser Abrechnung (${gruppen.size})</h4>`
        + '<div style="color:#57606a;font-size:13px;margin-bottom:12px">'
        + 'Diese Hinweise geh&#246;ren in die Abrechnung. Wer sie verschweigt, bekommt die Frage '
        + 'sp&#228;ter vom Mieter.</div><ul style="line-height:1.6;padding-left:20px">';

      for (const g of gruppen.values()) {
        const erkl = typeof nkBefund === 'function' ? nkBefund(g) : null;
        const bekannt = erkl && erkl.bekannt;
        const farbe = g.schwere === 'blocker' ? '#b42318'
          : g.schwere === 'warning' ? '#9a6700' : '#57606a';
        html += '<li style="margin-bottom:10px">'
          + `<strong style="color:${farbe}">${esc(bekannt ? erkl.titel : g.code)}</strong>`
          + (g.betroffen.length > 0
            ? ` <span style="color:#57606a">(${g.betroffen.length})</span>` : '');
        // Deutsche Erklärung, wo eine hinterlegt ist; sonst die Rohmeldung des
        // Core — eine erfundene Umschreibung wäre schlechter als die Urfassung.
        html += bekannt
          ? `<br>${esc(erkl.ursache)}`
          : `<br>${esc(g.texte.join(' · '))}`;
        if (g.betroffen.length > 0) {
          html += `<br><span style="color:#57606a;font-size:13px">Betrifft: ${esc(g.betroffen.join(', '))}</span>`;
        }
        if (bekannt && erkl.schritt) {
          html += `<br><span style="color:#57606a;font-size:13px">N&#228;chster Schritt: ${esc(erkl.schritt)}</span>`;
        }
        html += '</li>';
      }
      html += '</ul></div>';
      return html;
    },
  }));
});

// ── Globale Helfer ─────────────────────────────────────────────────────────

function abrDaten() {
  const el = document.querySelector('[x-data="abrechnungTab"]');
  return el ? Alpine.$data(el) : null;
}

function abrObjektWechseln() {
  const d = abrDaten();
  const feld = document.getElementById('abr-objekt');
  if (!d || !feld) return;
  d.objekt = feld.value;
  d.lade();
}

function abrJahrWechseln() {
  const d = abrDaten();
  const feld = document.getElementById('abr-jahr');
  if (!d || !feld) return;
  d.jahr = parseInt(feld.value, 10);
  // Ein Stichtag aus dem alten Jahr passt nicht mehr — die Engine lehnt ihn ab.
  if (d.stichtag && !d.stichtag.startsWith(String(d.jahr) + '-')) d.stichtag = '';
  d.lade();
}

function abrStichtagWechseln() {
  const d = abrDaten();
  const feld = document.getElementById('abr-stichtag');
  if (!d || !feld) return;
  d.stichtag = feld.value;
  d.lade();
}

function abrStichtagLoeschen() {
  const d = abrDaten();
  if (!d) return;
  d.stichtag = '';
  d.lade();
}

function abrNeuLaden() {
  const d = abrDaten();
  if (d) d.lade();
}
