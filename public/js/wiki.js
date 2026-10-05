/* Wiki-Tab — Ablösung des JSPWiki bei Nuveon.
 *
 * Bewusst in demselben schlichten Stil wie die übrigen Tabs in index.html
 * (globale load*-Funktion, apiFetch, esc) und ohne Alpine: der Wiki-Tab braucht
 * keine Reaktivität, und ohne Alpine entfallen die CSP-Fallstricke vollständig.
 *
 * Erwartet aus index.html: apiFetch(), esc(), fmtDT(), TOKEN, showTab().
 */
'use strict';

const WIKI_CATEGORIES = [
  'Haus Neuhausen',
  'L19',
  'Accounts & Dienste',
  'Technik',
  'Sonstiges',
];

const wikiState = {
  pages: [],
  page: null,
  revisions: [],
  searchTerm: '',
  searchHits: null,
  mode: 'overview', // 'overview' | 'page' | 'edit' | 'new' | 'revision'
  revision: null,
  csrfToken: '',
  busy: false,
};

/* ── Hilfsfunktionen ────────────────────────────────────────────────────── */

/** CSRF-Token besorgen bzw. wiederverwenden (gilt eine Stunde). */
async function wikiCsrf() {
  if (wikiState.csrfToken) return wikiState.csrfToken;
  const res = await apiFetch('/api/csrf-refresh');
  wikiState.csrfToken = res.token;
  return wikiState.csrfToken;
}

/** Schreibende Anfrage mit CSRF-Kopfzeile. */
async function wikiWrite(url, method, body) {
  const token = await wikiCsrf();
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(
    '/dashboard' + url + sep + 'token=' + encodeURIComponent(TOKEN),
    {
      method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (res.status === 403) {
    // Token abgelaufen — einmal neu holen und denselben Aufruf wiederholen.
    wikiState.csrfToken = '';
    const retryToken = await wikiCsrf();
    const retry = await fetch(
      '/dashboard' + url + sep + 'token=' + encodeURIComponent(TOKEN),
      {
        method,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': retryToken },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    if (!retry.ok) throw new Error(await wikiErrorText(retry));
    return retry.json();
  }
  if (!res.ok) throw new Error(await wikiErrorText(res));
  return res.json();
}

async function wikiErrorText(res) {
  try {
    const data = await res.json();
    return data.error ? String(data.error) : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** Datei-URL mit Token — Anhänge liegen hinter der Dashboard-Anmeldung. */
function wikiFileUrl(kind, slug, filename) {
  return `/dashboard/api/wiki/${kind}/${encodeURIComponent(slug)}/`
    + `${encodeURIComponent(filename)}?token=${encodeURIComponent(TOKEN)}`;
}

function wikiFormatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024 * 1024) return (value / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + ' MB';
  if (value >= 1024) return Math.round(value / 1024) + ' kB';
  return value + ' B';
}

function wikiIsImage(mime) {
  return String(mime || '').startsWith('image/');
}

/**
 * Nachbearbeitung des gerenderten HTML:
 *  - interne Wiki-Links öffnen die Seite im Tab statt die Seite neu zu laden
 *  - Anhang-Links und Bilder erhalten den Token, sonst liefert der Server 401
 */
function wikiEnhanceLinks(container) {
  container.querySelectorAll('a[href^="/dashboard/wiki/"]').forEach((a) => {
    const slug = a.getAttribute('href').replace('/dashboard/wiki/', '');
    a.setAttribute('href', '#');
    a.addEventListener('click', (event) => {
      event.preventDefault();
      wikiOpenPage(slug);
    });
  });

  container.querySelectorAll('a[href^="/dashboard/api/wiki/"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href.includes('token=')) return;
    a.setAttribute('href', href + (href.includes('?') ? '&' : '?')
      + 'token=' + encodeURIComponent(TOKEN));
  });

  container.querySelectorAll('img[src^="/dashboard/api/wiki/"]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src.includes('token=')) return;
    img.setAttribute('src', src + (src.includes('?') ? '&' : '?')
      + 'token=' + encodeURIComponent(TOKEN));
  });
}

/* ── Einstieg ───────────────────────────────────────────────────────────── */

/** Vom Tab-Router aufgerufen. Beachtet ?page=<slug> für tiefe Links. */
async function loadWiki() {
  const container = document.getElementById('content');
  try {
    const data = await apiFetch('/api/wiki/pages');
    wikiState.pages = data.pages || [];
  } catch (e) {
    container.innerHTML = '<div class="empty">Wiki nicht erreichbar: ' + esc(e.message) + '</div>';
    return;
  }

  const params = new URLSearchParams(location.search);
  const deepLink = params.get('page');
  if (deepLink) {
    // Nur beim ersten Aufruf folgen, danach steuert die Oberfläche selbst.
    params.delete('page');
    const rest = params.toString();
    // Verlaufszustand erhalten (P2-2).
    history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : ''));
    await wikiOpenPage(deepLink);
    return;
  }

  wikiState.mode = 'overview';
  wikiRender();
}

/* ── Navigation ─────────────────────────────────────────────────────────── */

async function wikiOpenPage(slug) {
  const container = document.getElementById('content');
  container.innerHTML = '<div class="spinner">Laden…</div>';
  try {
    wikiState.page = await apiFetch('/api/wiki/pages/' + encodeURIComponent(slug));
    const revData = await apiFetch('/api/wiki/pages/' + encodeURIComponent(slug) + '/revisions');
    wikiState.revisions = revData.revisions || [];
    wikiState.mode = 'page';
    wikiRender();
  } catch (e) {
    container.innerHTML = '<div class="empty">Seite nicht lesbar: ' + esc(e.message) + '</div>'
      + '<div style="margin-top:12px"><button onclick="wikiBackToOverview()">Zur Übersicht</button></div>';
  }
}

function wikiBackToOverview() {
  wikiState.mode = 'overview';
  wikiState.page = null;
  wikiState.searchHits = null;
  wikiRender();
}

function wikiStartEdit() {
  wikiState.mode = 'edit';
  wikiRender();
}

function wikiStartNew() {
  wikiState.mode = 'new';
  wikiRender();
}

async function wikiOpenRevision(rev) {
  const slug = wikiState.page.slug;
  try {
    wikiState.revision = await apiFetch(
      '/api/wiki/pages/' + encodeURIComponent(slug) + '/revisions/' + encodeURIComponent(rev),
    );
    wikiState.mode = 'revision';
    wikiRender();
  } catch (e) {
    meldung('Revision nicht lesbar: ' + e.message, 'error');
  }
}

/* ── Suche ──────────────────────────────────────────────────────────────── */

async function wikiSearch() {
  const input = document.getElementById('wikiSearchInput');
  const term = input ? input.value.trim() : '';
  wikiState.searchTerm = term;
  if (!term) {
    wikiState.searchHits = null;
    wikiRender();
    return;
  }
  try {
    const data = await apiFetch('/api/wiki/search?q=' + encodeURIComponent(term));
    wikiState.searchHits = data.hits || [];
  } catch (e) {
    wikiState.searchHits = [];
    meldung('Suche fehlgeschlagen: ' + e.message, 'error');
  }
  wikiRender();
}

function wikiSearchKey(event) {
  if (event.key === 'Enter') wikiSearch();
}

function wikiClearSearch() {
  wikiState.searchTerm = '';
  wikiState.searchHits = null;
  wikiRender();
}

/* ── Speichern ──────────────────────────────────────────────────────────── */

async function wikiSave() {
  if (wikiState.busy) return;
  const title = document.getElementById('wikiEditTitle').value.trim();
  const bodyMd = document.getElementById('wikiEditBody').value;
  const category = document.getElementById('wikiEditCategory').value;
  const sensitive = document.getElementById('wikiEditSensitive').checked;
  /* P2-4: Hinweis am Feld statt im Systemfenster. */
  if (!title) {
    feldFehler('wikiEditTitle', 'Der Titel darf nicht leer sein.');
    return;
  }

  wikiState.busy = true;
  try {
    const slug = wikiState.page.slug;
    await wikiWrite('/api/wiki/pages/' + encodeURIComponent(slug), 'PUT',
      { title, bodyMd, category, sensitive });
    const data = await apiFetch('/api/wiki/pages');
    wikiState.pages = data.pages || [];
    await wikiOpenPage(slug);
  } catch (e) {
    meldung('Speichern fehlgeschlagen: ' + e.message, 'error');
  } finally {
    wikiState.busy = false;
  }
}

async function wikiCreate() {
  if (wikiState.busy) return;
  const title = document.getElementById('wikiNewTitle').value.trim();
  const bodyMd = document.getElementById('wikiNewBody').value;
  const category = document.getElementById('wikiNewCategory').value;
  if (!title) {
    feldFehler('wikiNewTitle', 'Der Titel darf nicht leer sein.');
    return;
  }

  wikiState.busy = true;
  try {
    const page = await wikiWrite('/api/wiki/pages', 'POST', { title, bodyMd, category });
    const data = await apiFetch('/api/wiki/pages');
    wikiState.pages = data.pages || [];
    await wikiOpenPage(page.slug);
  } catch (e) {
    meldung('Anlegen fehlgeschlagen: ' + e.message, 'error');
  } finally {
    wikiState.busy = false;
  }
}

async function wikiChangeCategory(select) {
  const slug = wikiState.page.slug;
  try {
    await wikiWrite('/api/wiki/pages/' + encodeURIComponent(slug) + '/category', 'PATCH',
      { category: select.value });
    wikiState.page.category = select.value;
    const data = await apiFetch('/api/wiki/pages');
    wikiState.pages = data.pages || [];
  } catch (e) {
    meldung('Kategorie nicht geändert: ' + e.message, 'error');
  }
}

/* ── Anhang hochladen ───────────────────────────────────────────────────── */

function wikiTriggerUpload() {
  document.getElementById('wikiUploadInput').click();
}

async function wikiUploadAttachment(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const slug = wikiState.page.slug;
  const status = document.getElementById('wikiUploadStatus');
  if (status) status.textContent = 'Lade ' + file.name + ' …';

  try {
    const csrf = await wikiCsrf();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      '/dashboard/api/wiki/pages/' + encodeURIComponent(slug) + '/attachments'
      + '?token=' + encodeURIComponent(TOKEN),
      { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: form },
    );
    if (!res.ok) throw new Error(await wikiErrorText(res));
    if (status) status.textContent = '';
    await wikiOpenPage(slug);
  } catch (e) {
    if (status) status.textContent = '';
    meldung('Upload fehlgeschlagen: ' + e.message, 'error');
  } finally {
    input.value = '';
  }
}

/* ── Darstellung ────────────────────────────────────────────────────────── */

function wikiRender() {
  const container = document.getElementById('content');
  if (wikiState.mode === 'page') container.innerHTML = wikiPageHtml();
  else if (wikiState.mode === 'edit') container.innerHTML = wikiEditHtml();
  else if (wikiState.mode === 'new') container.innerHTML = wikiNewHtml();
  else if (wikiState.mode === 'revision') container.innerHTML = wikiRevisionHtml();
  else container.innerHTML = wikiOverviewHtml();

  const body = document.getElementById('wikiBody');
  if (body) wikiEnhanceLinks(body);
}

function wikiCategoryOptions(selected) {
  const known = WIKI_CATEGORIES.slice();
  if (selected && known.indexOf(selected) === -1) known.push(selected);
  return known
    .map((c) => `<option value="${esc(c)}"${c === selected ? ' selected' : ''}>${esc(c)}</option>`)
    .join('');
}

function wikiSearchBarHtml() {
  return `
    <div class="wiki-searchbar">
      <input id="wikiSearchInput" type="search" placeholder="Wiki durchsuchen (auch PDF-Inhalte)…"
             value="${esc(wikiState.searchTerm)}" onkeypress="wikiSearchKey(event)">
      <button onclick="wikiSearch()">Suchen</button>
      ${wikiState.searchHits !== null ? '<button onclick="wikiClearSearch()">Zurücksetzen</button>' : ''}
      <button onclick="wikiStartNew()">+ Neue Seite</button>
    </div>`;
}

function wikiOverviewHtml() {
  if (wikiState.pages.length === 0 && wikiState.searchHits === null) {
    return wikiSearchBarHtml()
      + '<div class="empty">Noch keine Wiki-Seiten. Der Nuveon-Import ist noch nicht gelaufen.</div>';
  }

  if (wikiState.searchHits !== null) {
    const hits = wikiState.searchHits;
    const rows = hits.map((h) => `
      <div class="wiki-hit">
        <div>
          <a href="#" onclick="event.preventDefault();wikiOpenPage('${esc(h.slug)}')">${esc(h.title)}</a>
          <span class="wiki-badge">${esc(h.category)}</span>
          ${h.hitType === 'attachment' ? `<span class="wiki-badge wiki-badge-file">Anhang: ${esc(h.filename)}</span>` : ''}
        </div>
        <div class="wiki-snippet">${esc(h.snippet)}</div>
      </div>`).join('');
    return wikiSearchBarHtml()
      + `<div class="wiki-hint">${hits.length} Treffer für „${esc(wikiState.searchTerm)}"</div>`
      + (hits.length ? rows : '<div class="empty">Keine Treffer.</div>');
  }

  const byCategory = new Map();
  for (const page of wikiState.pages) {
    const list = byCategory.get(page.category) || [];
    list.push(page);
    byCategory.set(page.category, list);
  }

  const order = WIKI_CATEGORIES.filter((c) => byCategory.has(c))
    .concat([...byCategory.keys()].filter((c) => WIKI_CATEGORIES.indexOf(c) === -1));

  const blocks = order.map((category) => {
    const items = byCategory.get(category).map((page) => `
      <li>
        <a href="#" onclick="event.preventDefault();wikiOpenPage('${esc(page.slug)}')">${esc(page.title)}</a>
        ${page.sensitive ? '<span class="wiki-badge wiki-badge-warn">sensibel</span>' : ''}
        ${page.attachmentCount > 0 ? `<span class="wiki-badge">${page.attachmentCount} Anhänge</span>` : ''}
        <span class="wiki-muted">${page.sourceModifiedAt ? fmtDT(page.sourceModifiedAt) : ''}</span>
      </li>`).join('');
    return `<div class="wiki-cat"><h3>${esc(category)}
      <span class="wiki-muted">${byCategory.get(category).length}</span></h3>
      <ul class="wiki-list">${items}</ul></div>`;
  }).join('');

  return wikiSearchBarHtml()
    + `<div class="wiki-hint">${wikiState.pages.length} Seiten</div>`
    + blocks;
}

function wikiAttachmentsHtml(page) {
  const images = page.attachments.filter((a) => wikiIsImage(a.mime));
  const others = page.attachments.filter((a) => !wikiIsImage(a.mime));

  const gallery = images.length ? `
    <div class="wiki-gallery">
      ${images.map((a) => `
        <a href="${wikiFileUrl('preview', page.slug, a.filename)}" target="_blank" rel="noopener"
           title="${esc(a.filename)} — ${wikiFormatBytes(a.size)}">
          <img src="${wikiFileUrl('thumb', page.slug, a.filename)}" alt="${esc(a.filename)}" loading="lazy">
        </a>`).join('')}
    </div>` : '';

  const list = page.attachments.length ? `
    <table class="wiki-attach">
      <thead><tr><th>Datei</th><th>Typ</th><th>Größe</th><th>Geändert</th><th></th></tr></thead>
      <tbody>
        ${page.attachments.map((a) => `
          <tr>
            <td>${esc(a.filename)}${a.hasText ? '<span class="wiki-badge">Text durchsuchbar</span>' : ''}</td>
            <td class="wiki-muted">${esc(a.mime)}</td>
            <td>${wikiFormatBytes(a.size)}</td>
            <td class="wiki-muted">${a.sourceModifiedAt ? fmtDT(a.sourceModifiedAt) : '–'}</td>
            <td><a href="${wikiFileUrl('file', page.slug, a.filename)}">Herunterladen</a></td>
          </tr>`).join('')}
      </tbody>
    </table>` : '<div class="wiki-muted">Keine Anhänge.</div>';

  return `
    <div class="wiki-section">
      <h3>Anhänge (${page.attachments.length})</h3>
      ${gallery}
      ${others.length || images.length ? list : list}
      <div class="wiki-upload">
        <button onclick="wikiTriggerUpload()">Anhang hinzufügen</button>
        <span id="wikiUploadStatus" class="wiki-muted"></span>
        <input id="wikiUploadInput" type="file" style="display:none"
               onchange="wikiUploadAttachment(this)">
      </div>
    </div>`;
}

function wikiPageHtml() {
  const page = wikiState.page;
  const sensitiveNote = page.sensitive ? `
    <div class="wiki-warn">
      Diese Seite ist als <strong>sensibel</strong> markiert: sie enthält Muster von
      Zugangsdaten. Der Agent Hans_Dampf erhält sie weder über die Suche noch beim Lesen.
    </div>` : '';

  const revisionList = wikiState.revisions.length ? `
    <div class="wiki-section">
      <h3>Revisionen (${wikiState.revisions.length})</h3>
      <table class="wiki-attach">
        <thead><tr><th>Rev</th><th>Titel</th><th>Autor</th><th>Zeitpunkt</th><th></th></tr></thead>
        <tbody>
          ${wikiState.revisions.map((r) => `
            <tr>
              <td>${r.rev}</td>
              <td>${esc(r.title || '')}</td>
              <td class="wiki-muted">${esc(r.author)}</td>
              <td class="wiki-muted">${fmtDT(r.createdAt)}</td>
              <td><a href="#" onclick="event.preventDefault();wikiOpenRevision(${r.rev})">ansehen</a></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const origin = page.source === 'nuveon'
    ? `Aus Nuveon importiert${page.sourcePageName ? ' (Seite „' + esc(page.sourcePageName) + '")' : ''}`
    : 'Im Dashboard angelegt';

  return `
    <div class="wiki-head">
      <button onclick="wikiBackToOverview()">← Übersicht</button>
      <button onclick="wikiStartEdit()">Bearbeiten</button>
      <select onchange="wikiChangeCategory(this)">${wikiCategoryOptions(page.category)}</select>
    </div>
    <h2 class="wiki-title">${esc(page.title)}</h2>
    <div class="wiki-meta">
      ${origin}
      ${page.sourceAuthor ? ' · Autor ' + esc(page.sourceAuthor) : ''}
      ${page.sourceModifiedAt ? ' · Quellstand ' + fmtDT(page.sourceModifiedAt) : ''}
      · Revision ${page.latestRev} · geändert ${fmtDT(page.updatedAt)}
    </div>
    ${sensitiveNote}
    <div id="wikiBody" class="wiki-body">${page.bodyHtml || ''}</div>
    ${wikiAttachmentsHtml(page)}
    ${revisionList}`;
}

function wikiEditHtml() {
  const page = wikiState.page;
  return `
    <div class="wiki-head">
      <button onclick="wikiOpenPage('${esc(page.slug)}')">← Abbrechen</button>
      <button onclick="wikiSave()">Speichern (neue Revision)</button>
    </div>
    <div class="wiki-form">
      <label for="wikiEditTitle">Titel</label>
      <input id="wikiEditTitle" type="text" value="${esc(page.title)}">
      <label for="wikiEditCategory">Kategorie</label>
      <select id="wikiEditCategory">${wikiCategoryOptions(page.category)}</select>
      <label for="wikiEditBody">Inhalt (Markdown)</label>
      <textarea id="wikiEditBody" rows="28" spellcheck="false">${esc(page.bodyMd)}</textarea>
      <label class="wiki-check">
        <input id="wikiEditSensitive" type="checkbox"${page.sensitive ? ' checked' : ''}>
        Für den Agenten gesperrt (sensibel) — Hans_Dampf erhält diese Seite dann weder
        über die Suche noch beim Lesen. Die Markierung wird beim Speichern automatisch
        gesetzt, wenn der Text Muster von Zugangsdaten enthält; hier lässt sie sich
        bei einem Fehlalarm wieder aufheben.
      </label>
      <div class="wiki-muted">
        Jedes Speichern legt eine neue Revision an; die vorherige Fassung bleibt erhalten.
      </div>
    </div>`;
}

function wikiNewHtml() {
  return `
    <div class="wiki-head">
      <button onclick="wikiBackToOverview()">← Abbrechen</button>
      <button onclick="wikiCreate()">Anlegen</button>
    </div>
    <div class="wiki-form">
      <label for="wikiNewTitle">Titel</label>
      <input id="wikiNewTitle" type="text" placeholder="z. B. Heizung Neuhausen">
      <label for="wikiNewCategory">Kategorie</label>
      <select id="wikiNewCategory">${wikiCategoryOptions('Sonstiges')}</select>
      <label for="wikiNewBody">Inhalt (Markdown)</label>
      <textarea id="wikiNewBody" rows="24" spellcheck="false"></textarea>
    </div>`;
}

function wikiRevisionHtml() {
  const page = wikiState.page;
  const rev = wikiState.revision;
  return `
    <div class="wiki-head">
      <button onclick="wikiOpenPage('${esc(page.slug)}')">← Zurück zur Seite</button>
    </div>
    <h2 class="wiki-title">${esc(rev.title || page.title)}
      <span class="wiki-muted">Revision ${rev.rev}</span></h2>
    <div class="wiki-meta">${esc(rev.author)} · ${fmtDT(rev.createdAt)}</div>
    <pre class="wiki-raw">${esc(rev.bodyMd || '')}</pre>`;
}
