/* ═══════════════════════════════════════════════════════════════════════════
   Mietverhältnisse — Verknüpfungen, Hauptmieter und Klärungsbedarf
   Paket P2-11 (Befund H, Owner-Entscheidungen Nr. 3 und 4)

   NUR ANZEIGE. Dieser Baustein schreibt nichts: keine Statusänderung, keine
   Datumskorrektur, keine Zusammenführung von Mieterdatensätzen. Alles
   Datenverändernde bleibt ausgesetzt (Owner-Entscheidungen Nr. 3 und 4).

   WAS IN DEN DATEN STEHT (lesend geprüft)
   - Alle 17 Mietverträge haben `status = 'active'`; es gibt keine Zeile mit
     `ended` oder `future`.
   - `n24-w6-2024` ist aktiv, hat aber `actual_move_out = 2024-11-15` und
     `termination_date = 2025-11-30` — das Auszugsdatum liegt ein Jahr VOR der
     Kündigung. Dieselbe Einheit trägt mit `n24-w6-2025` einen zweiten aktiven
     Vertrag ab 01.12.2025.
   - Vier Mieterdatensätze lauten auf denselben Namen und dieselbe E-Mail.
     Owner-Entscheidung Nr. 4: **die Datensätze sind korrekt.** Der Eigentümer
     ist Hauptmieter temporär vermieteter Wohnungen mit Untermietern. Nicht
     zusammenführen; als Hauptmieter-Verhältnis darstellen.

   WAS NICHT IN DEN DATEN STEHT
   Untermieter sind nicht erfasst. `lease_tenants.role` lässt per
   CHECK-Bedingung nur `contract_party`, `occupant` und `guarantor` zu — eine
   Untermieter-Rolle gibt es im Schema nicht. Die Untervermietung ist deshalb
   ausschließlich am Vertragstyp „Wohnung befristet" erkennbar, und genau so
   wird sie beschrieben. Ein eigenes Untermietverhältnis zu erfassen wäre eine
   Schemaänderung und damit eine Owner-Entscheidung.

   VERKNÜPFUNG MIETER ↔ VERTRAG
   Der Core liefert keinen Endpunkt für die n:m-Tabelle `lease_tenants`; die
   Liste `/api/assets/leases` liefert aber `tenant_names` je Vertrag, und jede
   `tenant_code` endet auf Objekt und Einheit (`jbickel-n24w3` → n24 / W3).
   Beide Wege werden benutzt und gegeneinander geprüft — Namensgleichheit
   allein wäre bei vier gleichnamigen Datensätzen nicht eindeutig.

   Abhängigkeiten: `esc`, `fmtDate`, `apiFetch`-Ersatz über `Alpine.store('csrf')`,
   `begriff`/`begriffBadge` aus begriffe.js, `zustandBlock` aus datenstand.js.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Gemeinsamer Zwischenspeicher. Beide Ansichten (Verträge, Mieter) und die
   Übersicht „Klärungsbedarf" arbeiten auf demselben Stand. */
const MIET = { leases: [], tenants: [], geladen: false, fehler: null };

async function mietDatenLaden(neuLaden) {
  if (MIET.geladen && !neuLaden) return MIET;
  const csrf = Alpine.store('csrf');
  try {
    const [lRes, tRes] = await Promise.all([
      csrf.fetch('/api/assets/leases'),
      csrf.fetch('/api/assets/tenants'),
    ]);
    MIET.leases = lRes.ok ? await lRes.json() : [];
    MIET.tenants = tRes.ok ? await tRes.json() : [];
    MIET.fehler = null;
  } catch (e) {
    MIET.fehler = netzFehlerText(e);
  }
  MIET.geladen = true;
  return MIET;
}

/* ── Verknüpfung ──────────────────────────────────────────────────────────── */

/* Objekt- und Einheitenteil einer Mieterkennung: `jbickel-n24w3` → "n24w3",
   `bickel-l19w4+` → "l19w4+". Vergleichsform ohne Trennzeichen. */
function mietKennungOrt(tenantCode) {
  const m = /-([a-z0-9+]+)$/i.exec(String(tenantCode || ''));
  return m ? m[1].toLowerCase() : null;
}

function mietVertragOrt(lease) {
  return ((lease.property_code || '') + (lease.unit_code || '')).toLowerCase().replace(/[^a-z0-9+]/g, '');
}

/* Alle Verträge einer Person. Zwei Wege, bewusst beide:
   1. die Ortsangabe in der Mieterkennung,
   2. der Name in `tenant_names` des Vertrags.
   Treffer aus (1) gelten als gesichert, Treffer nur aus (2) als zusätzlich. */
function mietVertraegeZuMieter(tenant, leases) {
  const ort = mietKennungOrt(tenant.tenant_code);
  const name = String(tenant.name || '').trim().toLowerCase();
  const raus = [];
  for (const l of leases) {
    const perKennung = !!ort && mietVertragOrt(l) === ort;
    const perName = !!name && String(l.tenant_names || '').toLowerCase().includes(name);
    if (perKennung || perName) raus.push({ lease: l, perKennung, perName });
  }
  return raus.sort((a, b) => String(b.lease.start_date || '').localeCompare(String(a.lease.start_date || '')));
}

/* A6 (Phase 3): mietParteienZuVertrag() ist entfallen. Sie bestimmte die
   Vertragsparteien aus dem Orts-Teil der Mieterkennung und lieferte damit alle
   Personen der EINHEIT statt der Parteien des VERTRAGS — das war der Befund
   n24-w6-2025. Maßgeblich ist jetzt GET /api/assets/leases/:id/parteien
   (Tabelle lease_tenants). */

/* Alle Verträge derselben Einheit — macht einen Mieterwechsel sichtbar. */
function mietVertraegeZuEinheit(lease, leases) {
  return leases
    .filter(l => l.unit_id === lease.unit_id)
    .sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')));
}

/* Mieterdatensätze mit identischem Namen UND identischer E-Mail.
   Nach Owner-Entscheidung Nr. 4 ist das kein Doppeleintrag, sondern ein
   Hauptmieter mit mehreren Mietverhältnissen. */
function mietGleichnamige(tenant, tenants) {
  const name = String(tenant.name || '').trim().toLowerCase();
  const mail = String(tenant.email || '').trim().toLowerCase();
  if (!name) return [];
  return tenants.filter(t => t.id !== tenant.id
    && String(t.name || '').trim().toLowerCase() === name
    && String(t.email || '').trim().toLowerCase() === mail);
}

/* ── Inkonsistenzen ───────────────────────────────────────────────────────── */

function mietHeuteTag() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/* Alles, was auffällt — ohne Bewertung und ohne Korrekturvorschlag, der
   ausgeführt wird. Jeder Eintrag nennt den Owner als Entscheider. */
function mietBefunde(leases) {
  const heute = mietHeuteTag();
  const befunde = [];

  for (const l of leases) {
    if (l.status !== 'active') continue;

    if (l.actual_move_out && String(l.actual_move_out).slice(0, 10) < heute) {
      befunde.push({
        art: 'auszug_trotz_aktiv',
        lease_id: l.id,
        titel: 'Vertrag ' + (l.lease_number || '#' + l.id) + ': Auszug erfasst, Status weiterhin „Aktiv"',
        text: 'Auszug am ' + fmtDate(l.actual_move_out) + ' erfasst, Status weiterhin „Aktiv" — '
          + 'Klärung offen.'
          + (l.termination_date && String(l.termination_date).slice(0, 10) > String(l.actual_move_out).slice(0, 10)
              ? ' Zusätzlich liegt das Auszugsdatum vor dem Kündigungsdatum ('
                + fmtDate(l.termination_date) + '); ob das ein Tippfehler im Jahr ist, ist nicht bewertet.'
              : ''),
      });
    } else if (l.end_date && String(l.end_date).slice(0, 10) < heute) {
      befunde.push({
        art: 'ende_trotz_aktiv',
        lease_id: l.id,
        titel: 'Vertrag ' + (l.lease_number || '#' + l.id) + ': Ende in der Vergangenheit, Status „Aktiv"',
        text: 'Vertragsende am ' + fmtDate(l.end_date) + ', Status weiterhin „Aktiv" — Klärung offen.',
      });
    }
  }

  /* Mehrere aktive Verträge auf derselben Einheit. Das kann ein
     nachvollziehbarer Mieterwechsel sein — entschieden wird es nicht hier. */
  const jeEinheit = {};
  for (const l of leases) {
    if (l.status !== 'active') continue;
    (jeEinheit[l.unit_id] ||= []).push(l);
  }
  for (const [unitId, liste] of Object.entries(jeEinheit)) {
    if (liste.length < 2) continue;
    const sortiert = liste.slice().sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')));
    befunde.push({
      art: 'einheit_mehrfach',
      lease_id: sortiert[sortiert.length - 1].id,
      unit_id: Number(unitId),
      titel: 'Einheit ' + (sortiert[0].unit_label || sortiert[0].unit_code || unitId)
        + ': ' + liste.length + ' gleichzeitig aktive Verträge',
      text: sortiert.map(l => (l.lease_number || '#' + l.id) + ' ab ' + fmtDate(l.start_date)
        + (l.actual_move_out ? ', Auszug ' + fmtDate(l.actual_move_out) : '')).join(' · ')
        + '. Ein Mieterwechsel sieht so aus, wenn der Altvertrag nicht auf „Beendet" gesetzt wurde.',
    });
  }

  return befunde;
}

function mietBefundeZuVertrag(leaseId, leases) {
  return mietBefunde(leases).filter(b => b.lease_id === leaseId);
}

/* ── Anzeigebausteine ─────────────────────────────────────────────────────── */

/* Hinweisfeld an einem Vertrag. Kennzeichnen, nicht korrigieren. */
function mietHinweisHtml(befunde) {
  if (!befunde.length) return '';
  return '<div class="miet-hinweise">' + befunde.map(b => '<div class="miet-hinweis">'
    + '<span class="miet-hinweis-symbol" aria-hidden="true">⚠️</span>'
    + '<div><div class="miet-hinweis-titel">' + esc(b.titel) + '</div>'
    + '<div class="miet-hinweis-text">' + esc(b.text) + '</div>'
    + '<div class="miet-hinweis-owner">Die Entscheidung liegt beim Owner. '
    + 'Es wurde nichts geändert.</div></div></div>').join('') + '</div>';
}

/* Abzeichen für die Vertragsliste — damit der Fall schon in der Übersicht
   sichtbar ist und nicht erst im Detail. */
function mietKlaerungBadge(leaseId, leases) {
  return mietBefundeZuVertrag(leaseId, leases).length
    ? '<span class="badge badge-yellow" title="Klärungsbedarf — siehe Vertragsdetail">⚠️ Klärung</span>'
    : '';
}

/* Erläuterung mehrerer Verträge auf denselben Namen (Owner-Entscheidung 4). */
function mietHauptmieterHtml(tenant, tenants, leases) {
  const gleich = mietGleichnamige(tenant, tenants);
  if (!gleich.length) return '';
  const vertraege = mietVertraegeZuMieter(tenant, leases);
  const befristet = vertraege.filter(v => v.lease.lease_type === 'temporary').length;
  return '<div class="miet-hauptmieter">'
    + '<div class="miet-hauptmieter-titel">Mehrere Mietverhältnisse auf denselben Namen</div>'
    + '<div class="miet-hauptmieter-text">' + esc(
      'Zu „' + (tenant.name || '') + '" gibt es ' + (gleich.length + 1)
      + ' Mieterdatensätze mit derselben E-Mail, je einen pro Vertrag. '
      + 'Das ist beabsichtigt und vom Eigentümer bestätigt: er ist Hauptmieter temporär '
      + 'vermieteter Wohnungen und vermietet unter. '
      + 'Kein Doppeleintrag — die Datensätze werden nicht zusammengeführt.'
      + (befristet ? ' ' + befristet + ' der Verträge sind als „Wohnung befristet" erfasst.' : ''))
    + '</div>'
    + '<div class="miet-hauptmieter-text">' + esc(
      'Untermieter sind in den Daten nicht erfasst. Erfasst werden können nur die Rollen '
      + 'Vertragspartei, Bewohner und Bürge; für ein eigenes Untermietverhältnis fehlt die '
      + 'Rolle. Das lässt sich nicht in der Anzeige lösen.') + '</div>'
    + '</div>';
}

/* Liste der Verträge einer Person — in der Mieteransicht. */
function mietVertragslisteHtml(tenant, leases) {
  const treffer = mietVertraegeZuMieter(tenant, leases);
  if (!treffer.length) {
    return zustandBlock('keine_daten',
      'Zu diesem Mieterdatensatz ist kein Vertrag auffindbar — weder über die Kennung '
      + (tenant.tenant_code ? '„' + tenant.tenant_code + '"' : '') + ' noch über den Namen.');
  }
  return '<table class="assets-table" data-tabelle="karten">'
    + '<thead><tr><th>Vertrag</th><th>Objekt/Einheit</th><th>Typ</th><th>Status</th><th>Beginn</th><th>Zuordnung</th></tr></thead><tbody>'
    + treffer.map(t => {
      const l = t.lease;
      const wie = t.perKennung && t.perName ? 'Kennung und Name'
        : t.perKennung ? 'über die Kennung'
        : 'nur über den Namen';
      return '<tr onclick="assetsOpenLeaseDrawer(' + l.id + ')" style="cursor:pointer">'
        + '<td>' + esc(l.lease_number || '#' + l.id) + ' ' + mietKlaerungBadge(l.id, leases) + '</td>'
        + '<td>' + esc((l.property_name || l.property_code || '') + ' / ' + (l.unit_label || l.unit_code || '')) + '</td>'
        + '<td>' + esc(begriff('lease_type', l.lease_type)) + '</td>'
        + '<td>' + begriffBadge('lease_status', l.status) + '</td>'
        + '<td>' + esc(fmtDate(l.start_date)) + '</td>'
        + '<td>' + esc(wie) + '</td></tr>';
    }).join('') + '</tbody></table>';
}

/* ── A6 (Phase 3): Vertragsparteien und Einheitenverlauf ─────────────────────

   BEFUND CHECKPOINT 2 (n24-w6-2025): Unter „Vertragsparteien" standen die
   aktuellen Mieter und die Mieter des früheren Vertrags gemischt.

   HERKUNFT DES FEHLERS: die Anzeige, nicht das Datenmodell.
   P2-11 bestimmte die Parteien aus dem Orts-Teil der MIETERKENNUNG
   (`westhauser-n24w6` und `schweiger-n24w6` ergeben beide "n24w6"), weil es für
   die Verknüpfungstabelle keinen Endpunkt gab. Damit erschien jede Person, die
   je in dieser Einheit gewohnt hat.

   Die Tabelle `lease_tenants` ordnet dagegen jede Person genau einem Vertrag zu
   — mit Rolle, Hauptkontakt und Zeitraum. Sie ist vollständig gefüllt
   (26 Zeilen für 17 Verträge). GET /api/assets/leases/:id/parteien macht sie
   lesbar; am Bestand wurde nichts geändert.

   Angezeigt wird jetzt getrennt:
     „Parteien dieses Vertrags"                            aus lease_tenants
     „Weitere Personen dieser Einheit (frühere Verträge)"  mit Vertrag und Zeitraum
   Fällt der Abruf aus, wird das gesagt — es wird NICHT auf die alte, falsche
   Zuordnung über die Einheit zurückgefallen. */

function mietZeitraumText(von, bis) {
  if (!von && !bis) return 'Zeitraum nicht erfasst';
  if (von && bis) return fmtDate(von) + ' – ' + fmtDate(bis);
  if (von) return 'ab ' + fmtDate(von);
  return 'bis ' + fmtDate(bis);
}

function mietParteienTabelle(parteien) {
  return '<table class="assets-table" data-tabelle="karten">'
    + '<thead><tr><th>Name</th><th>Kennung</th><th>Kontakt</th><th>Rolle</th><th>Zeitraum</th></tr></thead><tbody>'
    + parteien.map(t => '<tr onclick="assetsOpenTenantDrawer(' + Number(t.tenant_id) + ')" style="cursor:pointer">'
      + '<td>' + esc(t.name || '')
        + (t.is_primary_contact ? ' <span class="badge badge-blue">Hauptkontakt</span>' : '') + '</td>'
      + '<td><code>' + esc(t.tenant_code || '') + '</code></td>'
      + '<td>' + esc(t.email || '–') + '</td>'
      + '<td>' + esc(begriff('role', t.role || 'contract_party')) + '</td>'
      + '<td>' + esc(mietZeitraumText(t.valid_from, t.valid_until)) + '</td></tr>').join('')
    + '</tbody></table>';
}

function mietWeiterePersonenTabelle(personen) {
  return '<table class="assets-table" data-tabelle="karten">'
    + '<thead><tr><th>Name</th><th>Vertrag</th><th>Status</th><th>Zeitraum der Zuordnung</th>'
    + '<th>Vertragsende</th></tr></thead><tbody>'
    + personen.map(t => {
      const ende = [
        t.lease_termination ? 'Kündigung ' + fmtDate(t.lease_termination) : null,
        t.lease_move_out ? 'Auszug ' + fmtDate(t.lease_move_out) : null,
        t.lease_end ? 'Ende ' + fmtDate(t.lease_end) : null,
      ].filter(Boolean).join(' · ') || '–';
      return '<tr onclick="assetsOpenLeaseDrawer(' + Number(t.lease_id) + ')" style="cursor:pointer">'
        + '<td>' + esc(t.name || '') + '<div class="miet-quelle-klein"><code>'
          + esc(t.tenant_code || '') + '</code></div></td>'
        + '<td>' + esc(t.lease_number || '#' + t.lease_id) + '</td>'
        + '<td>' + begriffBadge('lease_status', t.lease_status) + '</td>'
        + '<td>' + esc(mietZeitraumText(t.valid_from, t.valid_until)) + '</td>'
        + '<td>' + esc(ende) + '</td></tr>';
    }).join('')
    + '</tbody></table>';
}

function mietVertragsdetailHtml(lease, leases, tenants, parteienDaten) {
  const derEinheit = mietVertraegeZuEinheit(lease, leases);

  let parteienHtml;
  let weitereHtml = '';
  if (!parteienDaten) {
    parteienHtml = zustandBlock('fehler',
      'Die Vertragsparteien sind nicht abrufbar. Angezeigt wird deshalb keine Zuordnung — '
      + 'eine Zuordnung über die Einheit wäre nicht die Zuordnung dieses Vertrags.',
      { aktion: netzWiederholenKnopf('assetsOpenLeaseDrawer(' + Number(lease.id) + ')') });
  } else if (!parteienDaten.parteien.length) {
    parteienHtml = zustandBlock('keine_daten',
      'Zu diesem Vertrag ist in der Verknüpfungstabelle keine Person erfasst.'
      + (lease.tenant_names ? ' Im Vertragstext genannt: ' + lease.tenant_names + '.' : ''));
  } else {
    parteienHtml = mietParteienTabelle(parteienDaten.parteien)
      + '<div class="miet-quelle">' + esc('Quelle: Verknüpfungstabelle Vertrag–Person. '
        + 'Maßgeblich ist der Vertrag, nicht die Einheit.') + '</div>'
      + (lease.tenant_names
          ? '<div class="miet-quelle">' + esc('Im Vertragstext genannt: ' + lease.tenant_names) + '</div>'
          : '');
  }

  if (parteienDaten && parteienDaten.weitere_personen.length) {
    weitereHtml = '<div class="drawer-section">'
      /* Der Auftrag nennt die Überschrift „Weitere Personen dieser Einheit
         (frühere Verträge)". Beim ÄLTEREN Vertrag einer Einheit sind die
         anderen Personen aber die des NACHFOLGENDEN Vertrags — „frühere" wäre
         dort sachlich falsch. Deshalb „andere Verträge"; der Zeitraum je Zeile
         sagt, ob der Vertrag vor oder nach diesem liegt. */
      + '<h4>Weitere Personen dieser Einheit (andere Verträge)</h4>'
      + mietWeiterePersonenTabelle(parteienDaten.weitere_personen)
      + '<div class="miet-quelle">' + esc('Diese Personen gehören NICHT zu diesem Vertrag. '
        + 'Sie sind anderen Verträgen derselben Einheit zugeordnet und stehen hier, weil ein '
        + 'Mieterwechsel sonst nicht erkennbar wäre.') + '</div></div>';
  }

  const einheitHtml = derEinheit.length > 1
    ? '<table class="assets-table" data-tabelle="karten">'
      + '<thead><tr><th>Vertrag</th><th>Beginn</th><th>Kündigung</th><th>Auszug</th><th>Status</th><th>Mieter</th></tr></thead><tbody>'
      + derEinheit.map(l => '<tr' + (l.id === lease.id ? ' class="miet-dieser"' : '')
        + ' onclick="assetsOpenLeaseDrawer(' + l.id + ')" style="cursor:pointer">'
        + '<td>' + esc(l.lease_number || '#' + l.id) + (l.id === lease.id ? ' <span class="badge badge-blue">dieser</span>' : '') + '</td>'
        + '<td>' + esc(fmtDate(l.start_date)) + '</td>'
        + '<td>' + esc(l.termination_date ? fmtDate(l.termination_date) : '–') + '</td>'
        + '<td>' + esc(l.actual_move_out ? fmtDate(l.actual_move_out) : '–') + '</td>'
        + '<td>' + begriffBadge('lease_status', l.status) + '</td>'
        + '<td>' + esc(l.tenant_names || '–') + '</td></tr>').join('')
      + '</tbody></table>'
      + '<div class="miet-quelle">Mehrere Verträge auf derselben Einheit — so sieht ein '
      + 'Mieterwechsel aus. Die Zeiträume stehen nebeneinander, damit erkennbar ist, '
      + 'welcher Vertrag welchen ersetzt.</div>'
    : '<div class="miet-quelle">Auf dieser Einheit gibt es nur diesen Vertrag.</div>';

  return '<div class="drawer-section">'
    + '<h4>Parteien dieses Vertrags</h4>' + parteienHtml + '</div>'
    + weitereHtml
    + '<div class="drawer-section"><h4>Verträge dieser Einheit</h4>' + einheitHtml + '</div>';
}

/* ── Übersicht „Klärungsbedarf" ───────────────────────────────────────────── */

async function mietKlaerungsbedarfRendern(zielId) {
  const ziel = document.getElementById(zielId);
  if (!ziel) return;
  ziel.innerHTML = '<div class="spinner">Laden…</div>';
  const d = await mietDatenLaden(true);
  if (d.fehler) {
    ziel.innerHTML = zustandBlock('fehler', 'Verträge und Mieter sind nicht abrufbar: ' + d.fehler,
      { aktion: netzWiederholenKnopf('mietKlaerungsbedarfRendern(\'' + zielId + '\')') });
    return;
  }

  const befunde = mietBefunde(d.leases);
  const gruppen = {};
  for (const t of d.tenants) {
    const gleich = mietGleichnamige(t, d.tenants);
    if (!gleich.length) continue;
    const schluessel = String(t.name || '').toLowerCase() + '|' + String(t.email || '').toLowerCase();
    (gruppen[schluessel] ||= []).push(t);
  }

  const statusErklaerung = '<div class="miet-erklaerung">'
    + '<div class="miet-erklaerung-titel">Was „Aktiv" bedeutet</div>'
    + '<div class="miet-erklaerung-text">' + esc(
      'Ein Vertrag gilt als „Aktiv", solange sein Status auf diesem Wert steht. Der Status '
      + 'folgt NICHT automatisch aus Kündigungsdatum oder Auszugsdatum: beide werden getrennt '
      + 'gepflegt. Ein Vertrag kann deshalb „Aktiv" sein, obwohl ein Auszug erfasst ist — '
      + 'genau diese Fälle stehen unten.') + '</div>'
    + '<div class="miet-erklaerung-text">' + esc(
      'Derzeit stehen alle ' + d.leases.length + ' Verträge auf „Aktiv"; es gibt keine Zeile '
      + 'mit „Beendet" oder „Zukünftig".') + '</div></div>';

  let befundHtml;
  if (!befunde.length) {
    befundHtml = zustandBlock('keine_daten',
      'Kein Vertrag mit Auszug oder Ende in der Vergangenheit und kein doppelt belegtes '
      + 'Mietobjekt gefunden.');
  } else {
    befundHtml = '<ul class="miet-liste">' + befunde.map(b => '<li class="miet-eintrag">'
      + '<div class="miet-eintrag-titel">' + esc(b.titel) + '</div>'
      + '<div class="miet-eintrag-text">' + esc(b.text) + '</div>'
      + '<div class="miet-eintrag-owner">Die Entscheidung liegt beim Owner — '
      + 'es wurde nichts geändert.</div>'
      + '<button type="button" class="btn" onclick="assetsOpenLeaseDrawer(' + b.lease_id + ')">'
      + 'Vertrag öffnen</button></li>').join('') + '</ul>';
  }

  const mehrfach = Object.values(gruppen);
  const mehrfachHtml = !mehrfach.length
    ? zustandBlock('keine_daten', 'Kein Name kommt in mehreren Mieterdatensätzen vor.')
    : '<ul class="miet-liste">' + mehrfach.map(liste => {
        const erster = liste[0];
        const vertraege = liste.map(t => mietVertraegeZuMieter(t, d.leases)
          .map(v => v.lease.lease_number || '#' + v.lease.id)).flat();
        const eindeutig = [...new Set(vertraege)];
        return '<li class="miet-eintrag">'
          + '<div class="miet-eintrag-titel">' + esc((erster.name || 'ohne Namen') + ': '
            + liste.length + ' Mieterdatensätze') + '</div>'
          + '<div class="miet-eintrag-text">' + esc(
            'Kennungen: ' + liste.map(t => t.tenant_code || '#' + t.id).join(', ')
            + '. Verträge: ' + (eindeutig.join(', ') || 'keine auffindbar') + '.') + '</div>'
          + '<div class="miet-eintrag-text">' + esc(
            'Beabsichtigt und bestätigt: der Eigentümer ist Hauptmieter temporär vermieteter '
            + 'Wohnungen und vermietet unter. Nicht zusammenführen.') + '</div>'
          + '<button type="button" class="btn" onclick="assetsOpenTenantDrawer(' + erster.id + ')">'
          + 'Mieter öffnen</button></li>';
      }).join('') + '</ul>';

  ziel.innerHTML = `
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 style="font-size:15px;margin-bottom:12px">Statusbedeutung</h3>
      ${statusErklaerung}
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 style="font-size:15px;margin-bottom:12px">Klärungsbedarf in den Verträgen</h3>
      <div class="treffer-zeile">${esc(befunde.length + (befunde.length === 1 ? ' Fall' : ' Fälle'))}</div>
      ${befundHtml}
    </div>
    <div class="card card-pad">
      <h3 style="font-size:15px;margin-bottom:12px">Mehrere Mietverhältnisse pro Person</h3>
      ${mehrfachHtml}
    </div>`;
}
