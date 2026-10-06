/* ═══════════════════════════════════════════════════════════════════════════
   Instagram — Content-Plan und Rohmaterial
   Paket P2-7 (Befund J, Owner-Entscheidung Nr. 2)

   AUSGANGSLAGE
   Der frühere Content-Kalender kam vollständig aus `_INSTA_MOCK`: Überschrift
   „KW 10–11" als festes Textliteral, Tagesangaben ohne Jahr und Verweise auf
   Entwürfe `insta-001`/`insta-002`, die im echten Bestand nie existierten.
   P1-1 hat den Block nach Owner-Entscheidung Nr. 2 ausgeblendet; dieses Paket
   baut ihn auf echter Grundlage wieder auf.

   Die Rohmaterialliste rendete alle 907 Sessions als Karte — ohne Suche,
   ohne Filter, ohne Begrenzung, ohne Vorschaubild. Angezeigt wurde je Karte
   nur die technische Kennung.

   WAS ES AN ECHTEN PLANUNGSDATEN GIBT — UND WAS NICHT
   `GET /api/instagram/drafts` liefert je Entwurf `id`, `status`, `caption`,
   `hashtags`, `media_type`, `media_files`, `createdAt`, `updatedAt`.
   Ein Feld für einen geplanten Veröffentlichungszeitpunkt wird **nicht**
   gefüllt. Es gibt also keinen Terminplan — und deshalb wird auch keiner
   dargestellt. Die Liste sagt das ausdrücklich und ordnet nach Erstellung.

   Weil der Plan aus dem Entwurfsbestand selbst entsteht, kann kein Eintrag
   auf einen nicht vorhandenen Entwurf verweisen. Der Klickpfad prüft das
   trotzdem und sagt es, falls ein Entwurf zwischenzeitlich verschwunden ist
   (Spec: „Fehlt eine Verknüpfung, wird das erklärt, nicht als toter Verweis
   dargestellt").

   Abhängigkeiten: `esc`, `fmtDate`, `fmtDT`, `apiFetch`, `TOKEN`, `openModal`,
   `meldung` aus index.html; `zustandBlock()` aus datenstand.js (P2-5);
   `_instaStatusBadge`, `_instaTypeIcon`, `_instaDraftEdit` aus index.html.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Content-Plan ─────────────────────────────────────────────────────────── */

function instaArtText(art) {
  return { image: 'Bild', reel: 'Reel', carousel: 'Karussell', story: 'Story' }[art] || (art || 'unbekannt');
}

/* Ein Eintrag des Content-Plans. Alle Datumsangaben vollständig mit Jahr. */
function instaPlanZeile(d) {
  const medien = Array.isArray(d.media_files) ? d.media_files : [];
  const hashtags = Array.isArray(d.hashtags) ? d.hashtags.length : 0;
  const titel = instaPlanTitel(d);
  const safeId = String(d.id).replace(/'/g, "\\'");
  return `<tr>
    <td>
      <div class="insta-plan-titel">${esc(titel)}</div>
      <div class="insta-plan-id">${esc(d.id)}</div>
    </td>
    <td>${esc(fmtDate(d.createdAt))}</td>
    <td><span aria-hidden="true">${_instaTypeIcon(d.media_type)}</span> ${esc(instaArtText(d.media_type))}</td>
    <td>${_instaStatusBadge(d.status)}</td>
    <td>${medien.length
          ? esc(medien.length + (medien.length === 1 ? ' Datei' : ' Dateien'))
          : '<span class="insta-fehlt">kein Medium hinterlegt</span>'}</td>
    <td>${hashtags ? esc(hashtags + ' Hashtags') : '<span class="insta-fehlt">keine Hashtags</span>'}</td>
    <td><button type="button" class="btn" onclick="instaPlanEntwurfOeffnen('${safeId}')">Entwurf öffnen</button></td>
  </tr>`;
}

/* Die Entwürfe tragen keinen Titel. Der erste Satz der Caption ist die
   einzige vorhandene Bezeichnung — besser als die technische Kennung allein,
   und ohne etwas zu erfinden. */
function instaPlanTitel(d) {
  const text = String(d.caption || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'ohne Text';
  const satz = text.split(/(?<=[.!?])\s/)[0] || text;
  return satz.length > 70 ? satz.slice(0, 70).trim() + '…' : satz;
}

/* Springt in den Unterbereich „Drafts" und hebt den Entwurf hervor.
   Fehlt er im Bestand, wird das gesagt statt nichts zu tun. */
function instaPlanEntwurfOeffnen(id) {
  const vorhanden = (_instaDraftsCache || []).some(d => d.id === id);
  if (!vorhanden) {
    meldung('Zu diesem Eintrag gibt es keinen Entwurf mehr: ' + id, 'error');
    return;
  }
  _instaSubTab = 'drafts';
  _instaEntwurfHervorheben = id;
  loadInstagram();
}

/* Wird nach dem Aufbau des Drafts-Unterbereichs aufgerufen. */
let _instaEntwurfHervorheben = null;

function instaEntwurfHervorhebung() {
  if (!_instaEntwurfHervorheben) return;
  const ziel = document.getElementById('draft-card-' + _instaEntwurfHervorheben);
  _instaEntwurfHervorheben = null;
  if (!ziel) return;
  ziel.classList.add('insta-hervorgehoben');
  ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => ziel.classList.remove('insta-hervorgehoben'), 2500);
}

function instaContentPlanHtml(drafts) {
  const liste = Array.isArray(drafts) ? drafts : null;
  if (!liste) {
    return zustandBlock('fehler', 'Der Entwurfsbestand ist nicht abrufbar.');
  }
  if (!liste.length) {
    return zustandBlock('keine_daten',
      'Es ist kein Entwurf angelegt. Entwürfe entstehen im Telegram-Bot; der Content-Plan '
      + 'zeigt sie anschließend hier.');
  }
  const sortiert = liste.slice().sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const hinweis = '<div class="insta-plan-hinweis">'
    + esc('Es gibt keine Terminplanung in den Daten: bei allen ' + liste.length
      + ' Entwürfen ist kein Veröffentlichungszeitpunkt hinterlegt. Die Liste ordnet deshalb '
      + 'nach Erstellungsdatum. Jeder Eintrag ist ein vorhandener Entwurf — ein Verweis ins '
      + 'Leere ist nicht möglich.')
    + '</div>';

  return hinweis
    + '<div class="insta-plan-tabelle"><table class="data-table" data-tabelle="karten">'
    + '<thead><tr><th>Entwurf</th><th>Erstellt</th><th>Art</th><th>Status</th>'
    + '<th>Medien</th><th>Hashtags</th><th>Aktion</th></tr></thead>'
    + '<tbody>' + sortiert.map(instaPlanZeile).join('') + '</tbody></table></div>';
}

/* ── Rohmaterial ──────────────────────────────────────────────────────────── */

/* Suchzustand des Rohmaterials. `limit` wächst über „mehr laden"; der Server
   begrenzt auf 200 je Abruf. */
const INSTA_RAW_SCHRITT = 25;

let _instaRawFilter = { q: '', typ: '', status: '', limit: INSTA_RAW_SCHRITT };

function instaRawFilterAktiv() {
  return !!(_instaRawFilter.q || _instaRawFilter.typ || _instaRawFilter.status);
}

function instaRawFilterText() {
  const teile = [];
  if (_instaRawFilter.q) teile.push('Suche „' + _instaRawFilter.q + '"');
  if (_instaRawFilter.typ) {
    teile.push('Medientyp ' + ({ image: 'Bilder', video: 'Videos', leer: 'ohne Dateien' }[_instaRawFilter.typ] || _instaRawFilter.typ));
  }
  if (_instaRawFilter.status) {
    teile.push('Status ' + ({ active: 'Aktiv', crafting: 'In Craft' }[_instaRawFilter.status] || _instaRawFilter.status));
  }
  return teile.join(', ');
}

function instaRawWerkzeugzeile() {
  const gewaehlt = (feld, wert) => (_instaRawFilter[feld] === wert ? ' selected' : '');
  return `<div class="filters-row">
    <input class="search-input" id="insta-raw-suche" type="search"
           placeholder="Session oder Dateiname suchen…" value="${esc(_instaRawFilter.q)}"
           aria-label="Rohmaterial durchsuchen" oninput="instaRawFilterAendern()">
    <select class="filter-select" id="insta-raw-typ" aria-label="Medientyp filtern" onchange="instaRawFilterAendern()">
      <option value=""${gewaehlt('typ', '')}>Alle Medientypen</option>
      <option value="image"${gewaehlt('typ', 'image')}>Mit Bildern</option>
      <option value="video"${gewaehlt('typ', 'video')}>Mit Videos</option>
      <option value="leer"${gewaehlt('typ', 'leer')}>Ohne Dateien</option>
    </select>
    <select class="filter-select" id="insta-raw-status" aria-label="Status filtern" onchange="instaRawFilterAendern()">
      <option value=""${gewaehlt('status', '')}>Alle Status</option>
      <option value="active"${gewaehlt('status', 'active')}>Aktiv</option>
      <option value="crafting"${gewaehlt('status', 'crafting')}>In Craft</option>
    </select>
    <button class="btn btn-ghost" onclick="instaRawFilterZuruecksetzen()">Filter zurücksetzen</button>
    <button class="btn btn-primary" onclick="_instaNewSessionModal()">+ Neue Session</button>
  </div>`;
}

/* Vorschaubild oder Typsymbol. Das Bild wird serverseitig aus dem Original
   gerechnet (kein abgelegtes Vorschaubild — die Rohdaten bleiben unberührt);
   schlägt das fehl, bleibt das Symbol stehen. */
function instaRawVorschau(s) {
  const symbol = s.videoAnzahl && !s.bildAnzahl ? '🎬' : s.bildAnzahl ? '🖼️' : '📄';
  if (!s.vorschauDatei) {
    return `<div class="insta-raw-bild insta-raw-bild-leer"><span aria-hidden="true">${symbol}</span></div>`;
  }
  const url = '/dashboard/api/instagram/raw/' + encodeURIComponent(s.id)
    + '/thumb/' + encodeURIComponent(s.vorschauDatei) + '?token=' + encodeURIComponent(TOKEN);
  return `<div class="insta-raw-bild">
    <img src="${esc(url)}" alt="" loading="lazy"
         onerror="this.style.display='none';this.parentNode.classList.add('insta-raw-bild-leer');this.parentNode.insertAdjacentHTML('beforeend','<span aria-hidden=\\'true\\'>${symbol}</span>')">
  </div>`;
}

function instaRawKarte(s) {
  const teile = [];
  if (s.bildAnzahl) teile.push(s.bildAnzahl + (s.bildAnzahl === 1 ? ' Bild' : ' Bilder'));
  if (s.videoAnzahl) teile.push(s.videoAnzahl + (s.videoAnzahl === 1 ? ' Video' : ' Videos'));
  const sonstige = s.fileCount - s.bildAnzahl - s.videoAnzahl;
  if (sonstige > 0) teile.push(sonstige + (sonstige === 1 ? ' weitere Datei' : ' weitere Dateien'));
  const dateien = teile.length ? teile.join(' · ') : 'keine Dateien';
  /* Der erste Dateiname sagt mehr als die technische Sessionkennung. */
  const ersteDatei = (s.files || []).length ? s.files[0].name : null;
  const safeId = String(s.id).replace(/'/g, "\\'");

  return `<div class="card insta-raw-karte">
    ${instaRawVorschau(s)}
    <div class="insta-raw-text">
      <div class="insta-raw-kopf">
        <span class="insta-raw-name">${esc(ersteDatei || s.id)}</span>
        ${_instaStatusBadge(s.status)}
      </div>
      <div class="insta-raw-sub">${esc(fmtDT(s.created_at))} · ${esc(dateien)}</div>
      <div class="insta-raw-kennung">Session ${esc(s.id)}</div>
      <div class="insta-raw-aktionen">
        <button class="btn" onclick="_rawDetailSession='${safeId}';_instaLoadRaw()">Details</button>
        <button class="btn" onclick="_instaRawUpload('${safeId}')">Hochladen</button>
        <button class="btn" onclick="instaRawScanKopieren('${safeId}')">Scan-Befehl kopieren</button>
        <button class="btn btn-danger" onclick="instaRawLoeschenFragen('${safeId}')">Löschen</button>
      </div>
    </div>
  </div>`;
}

function instaRawScanKopieren(id) {
  const befehl = '/instascan ' + id;
  /* Kein Scan aus dem Dashboard: der Befehl wird nur in die Ablage gelegt
     und im Telegram-Bot ausgeführt (dieselbe Linie wie /instasync). */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(befehl)
      .then(() => meldung('In die Ablage kopiert: ' + befehl, 'info'))
      .catch(() => meldung('Befehl für den Telegram-Bot: ' + befehl, 'info'));
  } else {
    meldung('Befehl für den Telegram-Bot: ' + befehl, 'info');
  }
}

function instaRawLoeschenFragen(id) {
  openModal(`
    <h3 id="modalTitel" style="margin-bottom:12px">Session löschen</h3>
    <p style="font-size:14px;line-height:1.5;margin-bottom:16px">
      Die Session <strong>${esc(id)}</strong> wird samt ihrer Dateien gelöscht.
      Das lässt sich nicht zurücknehmen.
    </p>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-danger" onclick="closeModal();_instaRawDelete('${String(id).replace(/'/g, "\\'")}')">Löschen</button>
    </div>
  `);
}

function instaRawFilterAendern() {
  _instaRawFilter.q = document.getElementById('insta-raw-suche')?.value || '';
  _instaRawFilter.typ = document.getElementById('insta-raw-typ')?.value || '';
  _instaRawFilter.status = document.getElementById('insta-raw-status')?.value || '';
  /* Jede Filteränderung beginnt wieder bei der ersten Seite. */
  _instaRawFilter.limit = INSTA_RAW_SCHRITT;
  instaRawListeLaden();
}

function instaRawFilterZuruecksetzen() {
  _instaRawFilter = { q: '', typ: '', status: '', limit: INSTA_RAW_SCHRITT };
  _instaLoadRaw();
}

function instaRawMehrLaden() {
  _instaRawFilter.limit += INSTA_RAW_SCHRITT;
  instaRawListeLaden();
}

/* Lädt nur die Trefferliste neu und lässt die Werkzeugzeile stehen — sonst
   verliert das Suchfeld beim Tippen Inhalt und Fokus (dieselbe Lösung wie
   bei den Mietvertragsfiltern aus P1-3). */
async function instaRawListeLaden() {
  const ziel = document.getElementById('insta-raw-liste');
  if (!ziel) return;
  const p = new URLSearchParams();
  if (_instaRawFilter.q) p.set('q', _instaRawFilter.q);
  if (_instaRawFilter.typ) p.set('type', _instaRawFilter.typ);
  if (_instaRawFilter.status) p.set('status', _instaRawFilter.status);
  p.set('limit', String(Math.min(200, _instaRawFilter.limit)));
  try {
    const d = await apiFetch('/api/instagram/raw?' + p.toString());
    ziel.innerHTML = instaRawTrefferHtml(d);
  } catch (e) {
    ziel.innerHTML = zustandBlock('fehler', 'Rohmaterial nicht abrufbar: ' + netzFehlerText(e),
      { aktion: netzWiederholenKnopf('instaRawListeLaden()') });
  }
}

function instaRawTrefferHtml(d) {
  const sessions = d.sessions || [];
  if (!d.gesamt) {
    return zustandBlock('keine_daten',
      'Es ist keine Rohmaterial-Session vorhanden. Sessions entstehen beim Senden von Dateien '
      + 'an den Telegram-Bot oder über „+ Neue Session".');
  }
  if (!sessions.length) {
    return '<div class="treffer-zeile">' + esc('0 von ' + d.gesamt + ' Sessions · ' + instaRawFilterText()) + '</div>'
      + zustandBlock('keine_treffer',
        'Keine Session passt zu: ' + instaRawFilterText() + '. Insgesamt sind '
        + d.gesamt + ' Sessions vorhanden.',
        { aktion: '<button class="btn btn-primary" onclick="instaRawFilterZuruecksetzen()">Filter zurücksetzen</button>' });
  }
  const zeile = instaRawFilterAktiv()
    ? sessions.length + ' von ' + d.treffer + ' Treffern · ' + instaRawFilterText()
      + ' · ' + d.gesamt + ' Sessions insgesamt'
    : sessions.length + ' von ' + d.gesamt + ' Sessions';
  const mehr = d.treffer > sessions.length
    ? '<div class="insta-raw-mehr"><button class="btn" onclick="instaRawMehrLaden()">'
      + esc('Weitere ' + Math.min(INSTA_RAW_SCHRITT, d.treffer - sessions.length) + ' laden')
      + '</button></div>'
    : '';
  return '<div class="treffer-zeile">' + esc(zeile) + '</div>'
    + '<div class="insta-raw-liste">' + sessions.map(instaRawKarte).join('') + '</div>'
    + mehr;
}
