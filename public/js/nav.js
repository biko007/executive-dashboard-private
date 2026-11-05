/* ═══════════════════════════════════════════════════════════════════════════
   Navigationszeile — CP1 (Spec-Dashboard-Design-v2 §2.2), ohne Alpine

   Baut die Pillen aus DASHBOARD_TABS (index.html) in deren Reihenfolge.
   Schmal und mittel (< 1024 px) scrollt die Leiste waagerecht mit allen
   Bereichen. Am Desktop stehen die ersten NAV_DIREKT Bereiche direkt da, der
   Rest in „Mehr ▾" (<details>). Die Bereiche 9–14 stehen dafür zweimal im
   Markup: als Pille (nur schmal sichtbar) und als Eintrag in „Mehr" (nur
   Desktop). Die Stilvorlage blendet je Breite eine Form aus.

   Routing bleibt bei showTab(); hier wird nur markiert und geklickt.
   Fremdtexte gibt es hier keine, trotzdem nur textContent.
   ═══════════════════════════════════════════════════════════════════════════ */

const NAV_DIREKT = 8;
const ICON_SPRITE = '/dashboard/vendor/icons.svg';

/* Ein Icon aus dem Sprite als DOM-Element. Auch von tagesuebersicht.js genutzt. */
function iconElement(name, klasse) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ic' + (klasse ? ' ' + klasse : ''));
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', ICON_SPRITE + '#' + name);
  svg.appendChild(use);
  return svg;
}

function navBeschriftung(knopf, tab) {
  knopf.appendChild(iconElement(tab.icon));
  const lang = document.createElement('span');
  lang.className = 'nav-lang';
  lang.textContent = tab.label;
  const kurz = document.createElement('span');
  kurz.className = 'nav-kurz';
  kurz.textContent = tab.kurz || tab.label;
  knopf.append(lang, kurz);
}

function navAufbauen() {
  const nav = document.getElementById('hauptnav');
  if (!nav || nav.dataset.gebaut) return;
  nav.dataset.gebaut = '1';

  DASHBOARD_TABS.forEach((tab, i) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'nav-pill' + (i >= NAV_DIREKT ? ' nav-schmal' : '');
    knopf.dataset.tab = tab.id;
    navBeschriftung(knopf, tab);
    knopf.addEventListener('click', () => showTab(tab.id));
    nav.appendChild(knopf);
  });

  /* „Mehr" für den Desktop */
  const mehr = document.createElement('details');
  mehr.className = 'nav-mehr';
  const summary = document.createElement('summary');
  summary.className = 'nav-pill';
  const summaryText = document.createElement('span');
  summaryText.className = 'nav-mehr-text';
  summaryText.textContent = 'Mehr';
  summary.append(summaryText, iconElement('chevron-down', 'ic-16'));
  const liste = document.createElement('div');
  liste.className = 'nav-mehr-liste card';
  DASHBOARD_TABS.slice(NAV_DIREKT).forEach(tab => {
    const eintrag = document.createElement('button');
    eintrag.type = 'button';
    eintrag.className = 'nav-mehr-eintrag';
    eintrag.dataset.tab = tab.id;
    eintrag.appendChild(iconElement(tab.icon));
    const text = document.createElement('span');
    text.textContent = tab.label;
    eintrag.appendChild(text);
    eintrag.addEventListener('click', () => { mehr.open = false; showTab(tab.id); });
    liste.appendChild(eintrag);
  });
  mehr.append(summary, liste);
  nav.appendChild(mehr);

  /* Schließen bei Klick außerhalb und mit Esc. */
  document.addEventListener('click', (e) => { if (mehr.open && !mehr.contains(e.target)) mehr.open = false; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mehr.open) { mehr.open = false; summary.focus(); }
  });

  scrollHinweisAnbringen(nav);
  window.addEventListener('resize', () => zeigeAktivenTab(currentTab));
}

/* Aktiven Bereich markieren. Liegt er in „Mehr", trägt die Summary seinen
   Namen und die aktive Farbe. */
function navAktivSetzen(tab) {
  const nav = document.getElementById('hauptnav');
  if (!nav) return;
  nav.querySelectorAll('[data-tab]').forEach(b => {
    const aktiv = b.dataset.tab === tab;
    b.classList.toggle('active', aktiv);
    if (aktiv) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const index = DASHBOARD_TABS.findIndex(t => t.id === tab);
  const summary = nav.querySelector('.nav-mehr > summary');
  const text = nav.querySelector('.nav-mehr-text');
  if (summary && text) {
    const inMehr = index >= NAV_DIREKT;
    summary.classList.toggle('active', inMehr);
    text.textContent = inMehr ? DASHBOARD_TABS[index].label : 'Mehr';
  }
}

/* Verlauf + Chevron am rechten Rand einer waagerecht scrollenden Leiste,
   solange ihr Ende nicht sichtbar ist (1-px-Sentinel + IntersectionObserver).
   Für Hauptnavigation und die Unterbereichs-Leisten. */
function scrollHinweisAnbringen(leiste) {
  if (!leiste || leiste.querySelector(':scope > .scroll-ende')) return;
  const ende = document.createElement('span');
  ende.className = 'scroll-ende';
  ende.setAttribute('aria-hidden', 'true');
  const hinweis = document.createElement('span');
  hinweis.className = 'scroll-hinweis aus';
  hinweis.setAttribute('aria-hidden', 'true');
  hinweis.appendChild(iconElement('chevron-right', 'ic-18'));
  leiste.append(ende, hinweis);
  if (typeof IntersectionObserver !== 'function') return;
  new IntersectionObserver((eintraege) => {
    for (const e of eintraege) hinweis.classList.toggle('aus', e.isIntersecting);
  }, { root: leiste, threshold: 1 }).observe(ende);
}

/* Unterbereichs-Leisten entstehen erst beim Rendern eines Bereichs (teils
   durch Alpine). Ein Beobachter auf #content bringt den Hinweis an, sobald
   eine solche Leiste auftaucht — die Bereichsdateien bleiben unverändert. */
function unterleistenBeobachten() {
  const content = document.getElementById('content');
  if (!content || typeof MutationObserver !== 'function') return;
  const pruefen = () => content.querySelectorAll('.assets-subtabs, .insta-subtabs').forEach(scrollHinweisAnbringen);
  new MutationObserver(pruefen).observe(content, { childList: true, subtree: true });
}

navAufbauen();
unterleistenBeobachten();
