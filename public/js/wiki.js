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

/* ── Suchausschnitte aufbereiten (P2-6, Befund I) ────────────────────────────
 *
 * Der Core erzeugt die Ausschnitte mit `ts_headline(…)` auf dem ROHEN
 * Markdown (`src/modules/wiki/store.ts`). Zwei Folgen davon landeten
 * unverändert in der Anzeige:
 *   1. `ts_headline` markiert Fundstellen standardmäßig mit `<b>`/`</b>`;
 *   2. der Rohtext enthält Markdown — Linksyntax `[Text](URL)`, Tabellenstriche,
 *      Listenmarker, Überschriftenzeichen.
 * Weil das Frontend den Ausschnitt (richtigerweise) vollständig escapte,
 * erschien `<b>Pflanzliste</b>` wörtlich auf dem Bildschirm.
 *
 * Die Reihenfolge der drei Schritte ist der Sicherheitskern:
 *   1. Markdown entfernen — dabei bleiben die `<b>`-Marker des Core erhalten,
 *   2. den ganzen Text escapen — danach ist KEIN beliebiges HTML mehr möglich,
 *   3. GENAU die beiden bekannten Marker `&lt;b&gt;` / `&lt;/b&gt;` nach
 *      `<mark>` / `</mark>` zurückverwandeln.
 * Schritt 3 ist deshalb kein Freibrief für Seiteninhalte: ein `<script>` im
 * Seitentext ist nach Schritt 2 Text und bleibt es (Spec §4 I).
 *
 * Ein Linkziel, dessen Beschriftung selbst die URL ist (so steht es in der
 * Pflanzliste), wird auf den Hostnamen gekürzt — eine 90 Zeichen lange URL
 * im Ausschnitt ist keine Information, sondern Rauschen.
 */

const WIKI_B_AUF = /&lt;b&gt;/g;
const WIKI_B_ZU = /&lt;\/b&gt;/g;

/** URL → lesbarer Kurztext ("mein-schoener-garten.de", "/dashboard/wiki/wlan" → "wlan"). */
function wikiUrlKurz(url) {
  const u = String(url || '').trim();
  const extern = /^https?:\/\/([^/?#]+)/i.exec(u);
  if (extern) return extern[1].replace(/^www\./i, '');
  const intern = /\/([^/?#]+)\/?$/.exec(u);
  return intern ? decodeURIComponent(intern[1]) : u;
}

/** Beschriftung eines Markdown-Links; ist sie selbst eine URL, wird gekürzt. */
function wikiLinkText(label, url) {
  const l = String(label || '').trim();
  if (!l) return wikiUrlKurz(url);
  if (/^!?\s*(https?:\/\/|\/)\S*$/i.test(l)) return wikiUrlKurz(l);
  return l;
}

/* Liest ab der öffnenden Klammer das Linkziel und zählt dabei verschachtelte
 * Klammern mit. Nötig, weil Anhangnamen welche enthalten:
 * `[IPC-VEC754P(N)F-E.pdf](/dashboard/api/wiki/file/…/IPC-VEC754P(N)F-E.pdf)`.
 * Ein `[^)]*`-Ausdruck bricht dort an der falschen Klammer ab und lässt
 * `F-E.pdf)` im Text stehen. */
function wikiZielLesen(text, auf) {
  let tiefe = 0;
  for (let j = auf; j < text.length; j++) {
    if (text[j] === '(') tiefe++;
    else if (text[j] === ')') {
      tiefe--;
      if (tiefe === 0) return { url: text.slice(auf + 1, j), ende: j + 1 };
    }
  }
  /* Vom Ausschnitt angeschnitten — der Rest ist das Ziel. */
  return { url: text.slice(auf + 1), ende: text.length };
}

/** Markdown-Links auf ihre Beschriftung reduzieren.
 *
 * Bewusst ein Durchlauf statt eines Ausdrucks: `ts_headline` schneidet
 * Fragmente mitten im Markdown ab, deshalb kommen drei unvollständige Formen
 * vor, die alle behandelt werden müssen:
 *   `Adressen](/dashboard/wiki/ipadressen)`   Beschriftung fehlt vorne
 *   `[Elstner IP Gateway](/dashboard/wiki/el` Ziel fehlt hinten
 *   `[Elstner IP Gate`                        Beschriftung fehlt hinten
 */
function wikiLinksAufloesen(text) {
  const s = String(text || '');
  let aus = '';
  let i = 0;
  while (i < s.length) {
    const z = s[i];
    if (z === '[') {
      const zu = s.indexOf(']', i + 1);
      if (zu === -1) { aus += s.slice(i + 1); break; }
      const beschriftung = s.slice(i + 1, zu);
      const istBild = aus.endsWith('!');
      if (istBild) aus = aus.slice(0, -1);
      if (s[zu + 1] === '(') {
        const ziel = wikiZielLesen(s, zu + 1);
        aus += istBild ? (beschriftung.trim() || '[Bild]') : wikiLinkText(beschriftung, ziel.url);
        i = ziel.ende;
      } else {
        /* Referenzlink oder einfache Klammer: Beschriftung behalten. */
        aus += beschriftung;
        i = zu + 1;
      }
      continue;
    }
    if (z === ']' && s[i + 1] === '(') {
      /* Angeschnittener Link am Fragmentanfang: das Ziel allein ist wertlos. */
      i = wikiZielLesen(s, i + 1).ende;
      continue;
    }
    aus += z;
    i++;
  }
  return aus;
}

/** Schritt 1: Markdown aus dem Rohausschnitt entfernen.
 *
 * Nicht entfernt werden Nummerierungen ("1. Mespilus Germanica"). Sie sind von
 * echtem Text ("Punkt 3. Absatz") nicht zuverlässig zu unterscheiden, und ein
 * stehengelassener Listenpunkt ist weniger schlimm als ein verschluckter Satz.
 */
function wikiMarkdownEntfernen(text) {
  let t = wikiLinksAufloesen(text);
  /* Bare URLs, die ohne Linksyntax im Text stehen. */
  t = t.replace(/(^|\s)(https?:\/\/\S+)/gi, (_m, vor, url) => vor + wikiUrlKurz(url));
  /* Trennzeilen von Markdown-Tabellen ("| --- | --- |"). */
  t = t.replace(/\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?/g, ' ');
  /* Tabellenstriche zu einem Mittelpunkt; leere Zellen fallen dabei weg. */
  t = t.replace(/\s*\|\s*/g, ' · ').replace(/(?:·\s*){2,}/g, '· ');
  /* Überschriftenzeichen, Listenmarker und Hervorhebungen. Der Listenmarker
     darf auch direkt an einer Core-Hervorhebung kleben ("-<b>PDF</b>"). */
  t = t.replace(/(^|\s)#{1,6}\s+/g, '$1');
  t = t.replace(/(^|\s)[-*+•]\s+/g, '$1');
  t = t.replace(/(^|\s)[-*+•](?=[A-Za-zÄÖÜäöüß<])/g, '$1');
  t = t.replace(/(^|\s)>\s+/g, '$1');
  /* Hervorhebungszeichen nur dort entfernen, wo sie als Auszeichnung stehen.
     Es muss ein PAAR vorliegen. Ein pauschales Löschen zerstört Inhalte:
     aus "ETS_ GroupAddressesOverview.pdf" wurde "ETS GroupAddresses…" und aus
     "window.__XSS" "window.XSS". */
  t = t.replace(/\*{1,3}([^*\s](?:[^*]*[^*\s])?)\*{1,3}/g, '$1');
  t = t.replace(/(^|[\s(])_{1,3}([^_\s](?:[^_]*[^_\s])?)_{1,3}(?=[\s).,;:!?]|$)/g, '$1$2');
  t = t.replace(/`/g, '');
  /* Mehrfache Leerzeichen und Satzzeichen an den Rändern aufräumen. */
  t = t.replace(/\s+/g, ' ').replace(/^[\s·:,-]+/, '').replace(/[\s·]+$/, '').trim();
  return t;
}

/** Fertiges HTML eines Suchausschnitts. Enthält höchstens `<mark>`. */
function wikiAusschnittHtml(snippet) {
  const ohneMarkdown = wikiMarkdownEntfernen(snippet);
  if (!ohneMarkdown) return '';
  return esc(ohneMarkdown).replace(WIKI_B_AUF, '<mark>').replace(WIKI_B_ZU, '</mark>');
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
    /* P2-8: die fuenf Zustaende statt eines .empty-Kastens. */
    return wikiSearchBarHtml()
      + zustandBlock('nicht_eingerichtet',
          'Es ist keine Wiki-Seite vorhanden. Der Import aus dem alten JSPWiki ist noch nicht gelaufen.');
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
        <div class="wiki-snippet">${wikiAusschnittHtml(h.snippet)}</div>
      </div>`).join('');
    return wikiSearchBarHtml()
      + `<div class="wiki-hint">${hits.length} Treffer für „${esc(wikiState.searchTerm)}"</div>`
      + (hits.length ? rows : zustandBlock('keine_treffer',
          'Kein Treffer für „' + wikiState.searchTerm + '". Gesucht wird in Seitentexten '
          + 'und in den Inhalten der Anhänge.'));
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
