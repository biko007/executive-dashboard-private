/* ═══════════════════════════════════════════════════════════════════════════
   Datenstand — Seitenabruf, Datenalter und Zustandsvokabular
   Paket P1-1 (prompts/dashboard-ueberarbeitung/01-verlaesslichkeit-und-fehler.md)

   Hintergrund: Der frühere Seitenkopf zeigte "Stand: <jetzt>". Das war der
   Renderzeitpunkt der Seite und sagte nichts über das Alter der angezeigten
   Daten — direkt daneben standen bis zu 146 Tage alte Quelldaten.

   Dieser Baustein trennt die drei Angaben, die der Nutzer braucht:
     1. Seitenabruf  — wann wurde die Seite geladen (Kopfzeile)
     2. Datenstand   — auf welchen Zeitpunkt beziehen sich die gezeigten Daten
     3. Abgleich     — wann war der letzte erfolgreiche Abgleich mit der Quelle

   Zusätzlich das Zustandsvokabular aus Spec §4 B, damit "unbekannt" nie als
   Erfolg erscheint.

   Abhängigkeiten: `esc` und `fmtDT` aus dem Inline-Skript in index.html.
   Beide stehen zur Aufrufzeit bereit (alle Aufrufe erfolgen aus den
   load*()-Funktionen, also nach dem Seitenaufbau).
   ═══════════════════════════════════════════════════════════════════════════ */

/* Standardschwelle, ab der Daten als veraltet gelten. Bereiche können über
   `schwelleTage` eine eigene Schwelle setzen. */
const DATENSTAND_SCHWELLE_TAGE = 7;

/* Zustandsvokabular (Spec §4 B). Jeder Zustand hat Symbol UND Text — eine
   Warnung darf nie nur über Farbe erkennbar sein (Spec §2). */
const ZUSTAND_VOKABULAR = {
  erreichbar: { symbol: '🟢', label: 'erreichbar',      badge: 'badge-green'  },
  aktuell:    { symbol: '🟢', label: 'Daten aktuell',   badge: 'badge-green'  },
  degradiert: { symbol: '🟠', label: 'degradiert',      badge: 'badge-yellow' },
  veraltet:   { symbol: '⚠️', label: 'Daten veraltet',  badge: 'badge-yellow' },
  getrennt:   { symbol: '🔴', label: 'getrennt',        badge: 'badge-red'    },
  unbekannt:  { symbol: '❔', label: 'unbekannt',       badge: 'badge-muted'  },
};

function zustandsEintrag(code) {
  return ZUSTAND_VOKABULAR[code] || ZUSTAND_VOKABULAR.unbekannt;
}

/* Textform für Fließtext und Tabellenzellen: "🟢 erreichbar" */
function zustandsLabel(code) {
  const z = zustandsEintrag(code);
  return z.symbol + ' ' + z.label;
}

/* Abzeichenform. `zusatz` ergänzt eine Erläuterung, z. B. den Prüfzeitpunkt
   oder den Hinweis, dass der Zustand aus der Datenbank stammt. */
function zustandsBadge(code, zusatz) {
  const z = zustandsEintrag(code);
  const text = zusatz ? z.label + ' — ' + zusatz : z.label;
  return '<span class="badge badge-zustand ' + z.badge + '">'
    + '<span aria-hidden="true">' + z.symbol + '</span> ' + esc(text)
    + '</span>';
}

/* ── Zeitpunkte ───────────────────────────────────────────────────────────── */

/* Nimmt ISO-String, Millisekunden-Epoche oder Sekunden-Epoche und liefert
   Millisekunden oder null. Die Instagram-Caches liefern Millisekunden
   (13 Stellen), die Core-Antworten ISO-Strings. */
function datenstandZeit(wert) {
  if (wert === null || wert === undefined || wert === '') return null;
  if (typeof wert === 'number') {
    if (!Number.isFinite(wert) || wert <= 0) return null;
    return wert > 1e11 ? wert : wert * 1000;
  }
  const t = new Date(wert).getTime();
  return Number.isFinite(t) ? t : null;
}

function datenstandAlterTage(wert) {
  const t = datenstandZeit(wert);
  if (t === null) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function altersText(wert) {
  const tage = datenstandAlterTage(wert);
  if (tage === null) return 'Alter unbekannt';
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'vor 1 Tag';
  return 'vor ' + tage + ' Tagen';
}

function datenstandZeitpunktText(wert) {
  const t = datenstandZeit(wert);
  return t === null ? 'unbekannt' : fmtDT(new Date(t).toISOString());
}

/* Zustand aus dem Alter ableiten. Ohne Zeitpunkt: "unbekannt" — nicht "aktuell". */
function datenstandZustand(wert, schwelleTage) {
  const tage = datenstandAlterTage(wert);
  if (tage === null) return 'unbekannt';
  const schwelle = typeof schwelleTage === 'number' ? schwelleTage : DATENSTAND_SCHWELLE_TAGE;
  return tage > schwelle ? 'veraltet' : 'aktuell';
}

/* ── Anzeige ──────────────────────────────────────────────────────────────── */

/* Ein Datenstand-Eintrag.
   { quelle, stand, abgleich, schwelleTage, live, zustand, hinweis }
   - quelle:       Anzeigename der Datenquelle (Pflicht)
   - stand:        Zeitpunkt, auf den sich die gezeigten Daten beziehen
   - abgleich:     letzter erfolgreicher Quellenabgleich; `null` = unbekannt;
                   weglassen = Feld wird nicht angezeigt
   - schwelleTage: eigene Veraltungsschwelle
   - live:         true = bei jedem Seitenaufruf direkt aus der Quelle gelesen
   - zustand:      Zustand erzwingen (z. B. 'getrennt' bei Abrufausfall)
   - hinweis:      zusätzliche Klartextzeile */
function datenstandBadge(eintrag) {
  const e = eintrag || {};
  const code = e.zustand || (e.live ? 'aktuell' : datenstandZustand(e.stand, e.schwelleTage));
  const z = zustandsEintrag(code);

  let zustandText;
  if (code === 'veraltet') {
    zustandText = 'Daten veraltet (' + datenstandAlterTage(e.stand) + ' Tage)';
  } else if (code === 'unbekannt') {
    zustandText = 'Datenstand unbekannt';
  } else if (code === 'getrennt') {
    zustandText = 'Quelle nicht erreichbar';
  } else if (code === 'degradiert') {
    zustandText = 'degradiert';
  } else if (e.live) {
    zustandText = 'Live-Abruf';
  } else {
    zustandText = 'Daten aktuell (' + altersText(e.stand) + ')';
  }

  const felder = ['Datenstand ' + datenstandZeitpunktText(e.stand)];
  if ('abgleich' in e) felder.push('letzter Abgleich ' + datenstandZeitpunktText(e.abgleich));

  return '<div class="ds-eintrag ds-' + code + '">'
    + '<span class="ds-symbol" aria-hidden="true">' + z.symbol + '</span>'
    + '<div class="ds-text">'
    + '<div class="ds-kopf"><span class="ds-quelle">' + esc(e.quelle || 'Quelle') + '</span>'
    + '<span class="ds-zustand">' + esc(zustandText) + '</span></div>'
    + '<div class="ds-felder">' + esc(felder.join(' · ')) + '</div>'
    + (e.hinweis ? '<div class="ds-hinweis">' + esc(e.hinweis) + '</div>' : '')
    + '</div></div>';
}

function seitenabrufText() {
  return 'Seite geladen: ' + fmtDT(new Date().toISOString());
}

/* Füllt die Datenstand-Leiste zwischen Navigation und Inhalt.
   Ohne Einträge bleibt die Leiste ausgeblendet. */
function setDatenstand(eintraege) {
  const el = document.getElementById('datenstandLeiste');
  if (!el) return;
  const liste = (eintraege || []).filter(Boolean);
  if (!liste.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  /* Der Abrufzeitpunkt steht in der Kopfzeile (#lastUpdate) und stand hier
     ein zweites Mal — schmal kostete das eine ganze Zeile fuer dieselbe
     Angabe (P2-2). Die Leiste zeigt jetzt nur noch die Datenstaende. */
  el.innerHTML =
    '<div class="ds-liste">' + liste.map(datenstandBadge).join('') + '</div>'
    + '<div class="ds-tz">Alle Zeitangaben in Europe/Berlin.</div>';
}

function leereDatenstand() {
  setDatenstand([]);
}

/* Leerzustand für Blöcke, deren Datengrundlage fehlt oder veraltet ist.
   Ersetzt die früheren Demodaten (Owner-Entscheidung Nr. 2: ausblenden,
   nicht löschen und nicht als echte Zahlen anzeigen). */
function keineAktuellenDaten(stand, zusatz) {
  return '<div class="ds-leerzustand">'
    + '<span class="ds-leer-symbol" aria-hidden="true">⚠️</span>'
    + '<div>'
    + '<div class="ds-leer-titel">Keine aktuellen Daten – letzter Abgleich '
    + esc(datenstandZeitpunktText(stand)) + '</div>'
    + '<div class="ds-leer-sub">' + esc(altersText(stand) + (zusatz ? ' · ' + zusatz : '')) + '</div>'
    + '</div></div>';
}
