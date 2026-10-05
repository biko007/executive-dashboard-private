/* ═══════════════════════════════════════════════════════════════════════════
   Responsives Verhalten für Tabellen und Diagramme — Paket P2-3
   (prompts/dashboard-ueberarbeitung/02-helles-design-und-mobile-basis.md)

   Zwei Bausteine, die an allen Stellen gleich wirken:

   1. TABELLEN
      Schmal gibt es nur zwei zulässige Darstellungen (Spec §6):
        - Kartenform: jede Zeile wird eine Karte aus Beschriftung/Wert-Paaren.
          Die Spaltenköpfe werden dafür zu Beschriftungen. Keine Spalte entfällt.
        - Eigener Scrollbereich mit sichtbarem Hinweis für breite Datentabellen.
      Die Entscheidung fällt nach der Spaltenzahl (≤ 5 → Karte, sonst Scroll);
      einzelne Tabellen können sie über `data-tabelle="karten|scroll"`
      überstimmen. So steht die Regel an EINER Stelle statt an 40 Aufrufstellen,
      und sie greift auch bei Tabellen, deren Spaltenzahl erst zur Laufzeit
      feststeht (NK-Matrix: eine Spalte je Jahr).

   2. DIAGRAMME
      Die Zeichenbreite kommt aus dem Container statt aus einem festen Wert.
      Vorher stand `min-width: 600px` am SVG und `W = clientWidth || 600` im
      Code: schmal lag das Diagramm damit in einem Scrollbereich, der links
      begann — die JÜNGSTEN Werte am rechten Rand waren ohne Scrollen nicht
      zu sehen (Spec §6). Ein ResizeObserver zeichnet bei Breitenänderung neu.

   Beide Bausteine laufen über einen MutationObserver auf #content, weil das
   Dashboard zwei Rendering-Wege hat (klassische innerHTML-Blöcke und Alpine).
   ═══════════════════════════════════════════════════════════════════════════ */

/* Ab dieser Spaltenzahl ist die Kartenform unübersichtlich und ein
   Scrollbereich die ehrlichere Darstellung. */
const TABELLE_KARTEN_MAX_SPALTEN = 5;

/* ── Tabellen ─────────────────────────────────────────────────────────────── */

/* Spaltenköpfe einer Tabelle als Texte. Leere Köpfe (Aktionsspalten) ergeben
   einen leeren String — die zugehörige Zelle bekommt dann keine Beschriftung
   und nimmt in der Karte die volle Breite ein. */
function tabellenKoepfe(tabelle) {
  const kopfzeile = tabelle.querySelector('thead tr');
  if (!kopfzeile) return null;
  return Array.from(kopfzeile.children).map(th => {
    const t = (th.textContent || '').replace(/\s+/g, ' ').trim();
    /* Sortierpfeile und ähnliche Zusätze gehören nicht in die Beschriftung. */
    return t.replace(/[↑↓▲▼]\s*$/, '').trim();
  });
}

/* Entscheidet die Darstellungsform und bereitet sie vor. Idempotent: eine
   bereits aufbereitete Zelle wird nicht erneut angefasst. */
function tabelleAufbereiten(tabelle) {
  const koepfe = tabellenKoepfe(tabelle);
  if (!koepfe || !koepfe.length) return;

  const wunsch = tabelle.dataset.tabelle;
  const alsKarte = wunsch === 'karten'
    || (wunsch !== 'scroll' && koepfe.length <= TABELLE_KARTEN_MAX_SPALTEN);

  if (!alsKarte) {
    /* Scrollbereich: Klasse am ELTERNELEMENT statt eines neuen Wrappers.
       Ein zusätzliches DOM-Element würde in Alpine-verwalteten Bereichen
       zwischen Alpine und seinen Knoten geraten. */
    const eltern = tabelle.parentElement;
    if (eltern && !eltern.classList.contains('tabelle-scroll')) {
      eltern.classList.add('tabelle-scroll');
    }
    tabelle.classList.remove('tabelle-karten');
    return;
  }

  tabelle.classList.add('tabelle-karten');
  for (const zeile of tabelle.querySelectorAll('tbody tr')) {
    const zellen = zeile.children;
    for (let i = 0; i < zellen.length; i++) {
      const zelle = zellen[i];
      if (zelle.tagName !== 'TD' || zelle.hasAttribute('data-label')) continue;
      const kopf = koepfe[i];
      /* Verbundene Zellen ("Keine Einträge") bekommen keine Beschriftung. */
      const verbunden = Number(zelle.getAttribute('colspan') || 1) > 1;
      if (kopf && !verbunden) zelle.setAttribute('data-label', kopf);
      else zelle.setAttribute('data-ohne-label', '');
    }
  }
}

function tabellenAufbereiten(wurzel) {
  const bereich = wurzel || document;
  for (const t of bereich.querySelectorAll('table')) {
    try { tabelleAufbereiten(t); } catch { /* eine kaputte Tabelle darf den Rest nicht aufhalten */ }
  }
  scrollhinweisPruefen();
}

/* Den Hinweis „seitlich scrollbar" nur zeigen, wenn der Bereich tatsaechlich
   ueberlaeuft. Eine Tabelle, die passt, soll keinen Hinweis tragen. */
function scrollhinweisPruefen() {
  for (const el of document.querySelectorAll('.tabelle-scroll')) {
    el.classList.toggle('scrollt', el.scrollWidth > el.clientWidth + 1);
  }
}

/* ── Diagramme ────────────────────────────────────────────────────────────── */

/* Zeichenfunktionen je SVG-Kennung. Beim Bereichswechsel wird die Liste
   geleert, damit kein Diagramm eines verlassenen Bereichs neu gezeichnet wird. */
const DIAGRAMME = new Map();
let _diagrammBeobachter = null;
let _diagrammLauf = null;

/* Tatsächliche Zeichenbreite. `clientWidth` ist bei einem frisch eingefügten
   SVG mit width="100%" gelegentlich 0 — dann liefert der Container den Wert.
   Die Untergrenze verhindert eine unsinnige Skala auf sehr schmalen Geräten. */
function diagrammBreite(svg) {
  const eigen = Math.round(svg.getBoundingClientRect().width);
  if (eigen > 20) return Math.max(240, eigen);
  const eltern = svg.parentElement ? Math.round(svg.parentElement.getBoundingClientRect().width) : 0;
  return Math.max(240, eltern || 320);
}

/* Abstand der X-Achsenbeschriftungen. Schmal braucht eine Beschriftung mehr
   Platz, sonst überlappen die Datumsangaben — deshalb ein größerer
   Mindestabstand unter 640 px (Owner-Vorgabe: jede zweite/dritte). */
function achsenSchritt(anzahl, zeichenbreite) {
  const mindestAbstand = window.innerWidth < 640 ? 58 : 44;
  const maxBeschriftungen = Math.max(2, Math.floor(zeichenbreite / mindestAbstand));
  return Math.max(1, Math.ceil(anzahl / maxBeschriftungen));
}

/* Indizes der zu beschriftenden Punkte — VOM ENDE her, damit der jüngste Wert
   immer beschriftet ist (Spec §6: die jüngsten Werte dürfen nie fehlen). */
function achsenIndizes(anzahl, zeichenbreite) {
  const schritt = achsenSchritt(anzahl, zeichenbreite);
  const idx = [];
  for (let i = anzahl - 1; i >= 0; i -= schritt) idx.push(i);
  return idx.reverse();
}

/* Innenabstände des Zeichenbereichs. Schmal ist links weniger Platz nötig,
   weil die Achsenwerte kurz sind (zwei bis vier Zeichen). */
function diagrammRand(breite) {
  return breite < 420
    ? { t: 8, r: 12, b: 26, l: 34 }
    : { t: 10, r: 15, b: 30, l: 50 };
}

/* Diagramm anmelden und sofort zeichnen. `zeichnen` bekommt das SVG-Element. */
function diagrammZeichnen(id, zeichnen) {
  const svg = document.getElementById(id);
  if (!svg) return;
  DIAGRAMME.set(id, zeichnen);
  zeichnen(svg);
  diagrammBeobachten(svg);
}

function diagrammeLeeren() {
  DIAGRAMME.clear();
}

/* Ein einziger ResizeObserver für alle Diagramme. Das Neuzeichnen wird
   gebündelt (requestAnimationFrame), damit ein Ziehen am Fenster nicht
   hunderte Zeichenläufe auslöst. */
function diagrammBeobachten(svg) {
  if (typeof ResizeObserver !== 'function') return;
  if (!_diagrammBeobachter) {
    _diagrammBeobachter = new ResizeObserver(() => {
      if (_diagrammLauf) return;
      _diagrammLauf = requestAnimationFrame(() => {
        _diagrammLauf = null;
        diagrammeNeuZeichnen();
      });
    });
  }
  const ziel = svg.parentElement || svg;
  _diagrammBeobachter.observe(ziel);
}

function diagrammeNeuZeichnen() {
  for (const [id, zeichnen] of DIAGRAMME) {
    const svg = document.getElementById(id);
    if (!svg) { DIAGRAMME.delete(id); continue; }
    try { zeichnen(svg); } catch { /* ein Diagramm darf die übrigen nicht aufhalten */ }
  }
}

/* Breitenwechsel ohne Größenänderung des Containers (Geräte-Drehung,
   Zoomstufe) erreicht der ResizeObserver nicht immer — resize ergänzt das. */
let _resizeLauf = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeLauf);
  _resizeLauf = setTimeout(() => {
    diagrammeNeuZeichnen();
    scrollhinweisPruefen();
  }, 150);
});

/* ── Anbindung an beide Rendering-Wege ────────────────────────────────────── */

/* #content wird sowohl von den klassischen load*()-Funktionen als auch von
   Alpine neu befüllt. Ein Beobachter auf Kindknoten genügt; Attribute werden
   bewusst NICHT beobachtet, sonst löste das Setzen von data-label den
   Beobachter erneut aus. */
let _inhaltLauf = null;
function responsivBeobachten() {
  const inhalt = document.getElementById('content');
  if (!inhalt || typeof MutationObserver !== 'function') return;
  new MutationObserver(() => {
    if (_inhaltLauf) return;
    _inhaltLauf = requestAnimationFrame(() => {
      _inhaltLauf = null;
      tabellenAufbereiten(inhalt);
    });
  }).observe(inhalt, { childList: true, subtree: true });
  tabellenAufbereiten(inhalt);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', responsivBeobachten);
} else {
  responsivBeobachten();
}
