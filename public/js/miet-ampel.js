/* ═══════════════════════════════════════════════════════════════════════════
   Mietforderungen — Lämpchen und Monatsübersicht

   Owner-Auftrag 15.10.2026. Aus jedem Mietvertrag entsteht im Core für jeden
   Monat eine Forderung; die Bankeingänge werden ihr zugeordnet. Hier steht nur
   die Anzeige davon:

     - je Objektkachel ein Punkt mit der Zahl der säumigen Mieter,
     - je Mieterzeile ein Punkt mit den fehlenden Monaten,
     - ein Klick öffnet die Monatsübersicht Soll / Ist / Datum / Umsatz.

   NUR GRÜN UND ROT, so hat der Owner entschieden: Eine halb bezahlte Miete ist
   nicht bezahlt. Der Punkt steht nie allein — daneben steht immer ein Text,
   sonst wäre die Information für jeden unsichtbar, der Farben schlecht
   unterscheidet.

   Die Daten kommen einmal und liegen dann im Speicher. Jede Ansicht, die ein
   Lämpchen zeichnet, fragt `mietAmpelDaten()` — läuft der Abruf schon, wird er
   geteilt statt wiederholt.
   ═══════════════════════════════════════════════════════════════════════════ */

let _mietAmpel = null;
let _mietAmpelLauf = null;

async function mietAmpelDaten(neu) {
  if (neu) { _mietAmpel = null; _mietAmpelLauf = null; }
  if (_mietAmpel) return _mietAmpel;
  if (_mietAmpelLauf) return _mietAmpelLauf;
  _mietAmpelLauf = (async () => {
    try {
      const csrf = Alpine.store('csrf');
      const res = await csrf.fetch('/api/assets/mietforderungen/ampel');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _mietAmpel = await res.json();
      return _mietAmpel;
    } catch (e) {
      /* Kein Lärm in der Kachelansicht: Fehlt die Auskunft, bleibt das
         Lämpchen einfach weg. Der Fehler steht in der Konsole. */
      console.warn('Mietforderungen nicht abrufbar:', e);
      _mietAmpel = { mieter: [], objekte: [], fehler: String(e && e.message || e) };
      return _mietAmpel;
    } finally {
      _mietAmpelLauf = null;
    }
  })();
  return _mietAmpelLauf;
}

/** Ein Lämpchen als HTML. `text` steht neben dem Punkt, `sub` darunter. */
function mietAmpelHtml(farbe, text, sub) {
  const k = farbe === 'rot' ? 'miet-ampel-rot' : 'miet-ampel-gruen';
  return '<span class="miet-ampel ' + k + '">'
    + '<span class="miet-ampel-punkt" aria-hidden="true"></span>'
    + '<span>' + esc(text) + '</span>'
    + (sub ? '<span class="miet-ampel-sub">' + esc(sub) + '</span>' : '')
    + '</span>';
}

/** Objektkachel: grün nur, wenn jeder Mieter des Objekts grün ist. */
function mietAmpelObjekt(daten, objektCode) {
  const o = (daten.objekte || []).find(x => x.objekt === String(objektCode).toLowerCase());
  if (!o) return '';
  return o.farbe === 'gruen'
    ? mietAmpelHtml('gruen', 'Mieten bezahlt', o.mieter_gesamt + (o.mieter_gesamt === 1 ? ' Mieter' : ' Mieter'))
    : mietAmpelHtml('rot', o.mieter_rot + ' von ' + o.mieter_gesamt + ' offen',
        o.saldo.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €');
}

/** Mieterzeile: welche Monate fehlen und wie viel. */
function mietAmpelMieter(daten, leaseId) {
  const m = (daten.mieter || []).find(x => x.lease_id === Number(leaseId));
  if (!m) return '';
  if (m.owner_hauptmieter) return mietAmpelHtml('gruen', 'bezahlt', 'Hauptmieter Owner');
  /* Guthaben steht auch bei grün — mehr gezahlt als geschuldet ist eine
     Information, keine Nebensache: Dahinter steckt entweder eine Überzahlung
     oder ein zu niedrig hinterlegtes Soll. */
  const geldK = n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  if (m.farbe === 'gruen') {
    return Number(m.guthaben || 0) > 0.004
      ? mietAmpelHtml('gruen', 'bezahlt', 'Guthaben ' + geldK(m.guthaben) + ' €')
      : mietAmpelHtml('gruen', 'bezahlt', null);
  }
  const monate = m.offene_monate.length <= 3
    ? m.offene_monate.join(', ')
    : m.offene_monate.slice(0, 3).join(', ') + ' +' + (m.offene_monate.length - 3);
  /* Ein offener Posten, den die Buchhaltung noch nicht bestätigt hat, steht
     sichtbar als „unbestätigt" neben dem roten Punkt. Das Lämpchen bleibt rot
     — Owner-Vorgabe —, aber niemand soll daraus eine Mahnung ableiten. */
  const unb = Number(m.unbestaetigt || 0) > 0.004
    ? ' <span class="miet-ampel-unbestaetigt">unbestätigt'
      + (Math.abs(Number(m.unbestaetigt) - m.saldo) > 0.004
          ? ' ' + Number(m.unbestaetigt).toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €'
          : '')
      + '</span>'
    : '';
  const gut = Number(m.guthaben || 0) > 0.004
    ? ' <span class="miet-ampel-guthaben">Guthaben ' + geldK(m.guthaben) + ' €</span>' : '';
  return mietAmpelHtml('rot',
    m.saldo.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' € offen', monate) + unb + gut;
}

/* ── Monatsübersicht ────────────────────────────────────────────────────── */

async function mietAmpelDetail(leaseId, titel) {
  const ziel = document.getElementById('miet-ampel-detail')
    || (function () {
      const d = document.createElement('div');
      d.id = 'miet-ampel-detail';
      document.body.appendChild(d);
      return d;
    })();
  ziel.innerHTML = '<div class="spinner">Monatsübersicht wird geladen…</div>';
  let zeilen;
  try {
    const csrf = Alpine.store('csrf');
    const res = await csrf.fetch('/api/assets/mietforderungen/leases/' + encodeURIComponent(leaseId));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    zeilen = await res.json();
  } catch (e) {
    ziel.innerHTML = '<div class="empty">Die Monatsübersicht ist nicht abrufbar: ' + esc(String(e.message || e)) + '</div>';
    return;
  }
  if (!Array.isArray(zeilen) || !zeilen.length) {
    ziel.innerHTML = '<div class="empty">Für dieses Mietverhältnis sind keine Forderungen gestellt. '
      + 'Das ist der Fall, solange im Vertrag kein Sollbetrag steht.</div>';
    return;
  }
  const geld = n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  const kopf = '<div class="bank-umsatz-kopf">'
    + '<div class="bank-umsatz-titel">' + esc('Monatsübersicht ' + (titel || ('Vertrag ' + leaseId))) + '</div>'
    + '<button class="btn" onclick="document.getElementById(\'miet-ampel-detail\').innerHTML=\'\'">Schließen</button>'
    + '</div>';
  const tab = '<table class="data-table"><thead><tr>'
    + '<th>Monat</th><th>fällig</th><th style="text-align:right">Soll</th>'
    + '<th style="text-align:right">Ist</th><th>Zahlung</th><th>Stand</th>'
    + '</tr></thead><tbody>'
    + zeilen.map(z => {
      /* Ein Monat ohne Bankdaten wird nicht bewertet: Er ist weder bezahlt
         noch offen, sondern grau. Juli und August 2026 liegen nur als
         Kontoauszug vor; vorher las sich jeder solche Monat wie ein
         Rueckstand. */
      const grau = z.bankdaten === false;
      const offen = !grau && Number(z.soll) - Number(z.ist) > 0.005 && !z.gilt_als_bezahlt;
      /* Mehr gezahlt als geschuldet: Das steht als Guthaben da und wird nicht
         auf das Soll gekappt. */
      const ueber = !grau && Number(z.ist) - Number(z.soll) > 0.005;
      const stand = z.gilt_als_bezahlt ? 'Hauptmieter Owner'
        : grau ? 'keine Bankdaten'
        : offen ? (z.unbestaetigt ? 'offen · unbestätigt' : 'offen')
        : ueber ? 'bezahlt · Guthaben ' + geld(Number(z.ist) - Number(z.soll)) : 'bezahlt';
      const zahlungen = (z.zahlungen || []).map(p =>
        esc(fmtDate(p.datum) + ' · ' + geld(p.betrag) + ' € · ' + (p.zahler || 'ohne Angabe'))).join('<br>');
      const bestandteile = [
        z.kaltmiete ? 'Miete ' + geld(z.kaltmiete) : null,
        z.nk ? 'NK ' + geld(z.nk) : null,
        z.heizkosten ? 'Heizung ' + geld(z.heizkosten) : null,
        z.garage ? 'Garage ' + geld(z.garage) : null,
        z.kueche ? 'Küche ' + geld(z.kueche) : null,
      ].filter(Boolean).join(' · ');
      return '<tr class="' + (offen ? 'miet-ampel-rot' : grau ? 'miet-ampel-grau' : '') + '">'
        + '<td>' + esc(z.monat) + (Number(z.anteil) < 1
            ? '<div class="bank-umsatz-sub">anteilig ' + esc(String(Math.round(Number(z.anteil) * 100)) + ' %') + '</div>' : '')
          + '</td>'
        + '<td>' + esc(fmtDate(z.faellig)) + '</td>'
        + '<td style="text-align:right">' + esc(geld(z.soll))
          + (bestandteile ? '<div class="bank-umsatz-sub">' + esc(bestandteile) + '</div>' : '')
          + (Number(z.vz_entfallen || 0) > 0.004
              ? '<div class="bank-umsatz-sub">ohne NK-Vorauszahlung ' + esc(geld(z.vz_entfallen))
                + ' (nur gezahlte werden angerechnet)</div>' : '') + '</td>'
        + '<td style="text-align:right">' + esc(geld(z.ist)) + '</td>'
        + '<td>' + (zahlungen
            || (grau ? '<span class="bank-umsatz-sub">kein Kontoauszug fuer diesen Monat</span>'
                     : '<span class="bank-umsatz-offen">keine</span>')) + '</td>'
        + '<td>' + esc(stand) + (z.erzeugt ? '' : '<div class="bank-umsatz-sub">von Hand</div>') + '</td>'
        + '</tr>';
    }).join('') + '</tbody></table>';
  const soll = zeilen.reduce((s, z) => s + Number(z.soll || 0), 0);
  const ist = zeilen.reduce((s, z) => s + Number(z.gilt_als_bezahlt ? z.soll : z.ist || 0), 0);
  ziel.innerHTML = kopf + tab
    + '<div class="treffer-zeile">' + esc('Soll ' + geld(soll) + ' € · Ist ' + geld(ist)
      + ' € · Saldo ' + geld(soll - ist) + ' €') + '</div>';
  try { ziel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { ziel.scrollIntoView(); }
}
