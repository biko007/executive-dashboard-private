# 02 — Phase 2: Helles Design und mobile Grundlage

Beginnt erst nach **CHECKPOINT 1** (Spec §9). Desktop und Mobil werden in jedem Paket
gemeinsam entworfen und umgesetzt — bloßes Verkleinern genügt nicht (Spec §2).

Alle Datei- und Zeilenangaben sind am Stand `735d5b8` geprüft.

---

## Ausgangslage (am Code geprüft, 04.10.2026)

### Farbwelt
Eine einzige dunkle Palette, definiert in `public/index.html:16-28`:

```css
:root {
  --bg: #0f1117;  --surface: #161b26;  --border: #272d3d;
  --text: #e2e8f0; --muted: #7a8499;
  --accent: #4f9cf9; --green: #4ade80; --yellow: #fbbf24; --red: #f87171;
  --r: 8px;  --font: -apple-system, …;
}
```

**Günstige Lage:** Farben werden fast durchgängig über `var(--…)` bezogen. Der Umstieg auf
eine helle Palette ist deshalb überwiegend ein Token-Austausch, kein Umbau.

**Stellen, die den Tokens entgehen** (müssen einzeln angefasst werden):

| Ort | Anzahl | Art |
|---|---|---|
| `public/index.html` | 21 Hex-Werte | u. a. `.btn-primary { color: #fff }` `:59`, Instagram-Verlauf `:2197`, `.ig-likes { color:#fff }` `:116`, `_instaMiniSvg` Farbliteral `:2159`/`:2398` |
| `public/index.html` | 34 `rgba()`-Werte | Abzeichen `:65-69`, `.btn-danger` `:61-62`, Zeilen-Hover `tbody tr:hover td { background: rgba(255,255,255,.018) }` `:78`, Trennlinien `rgba(255,255,255,.04)` `:100`, Modal-Hintergrund `rgba(0,0,0,.55)` `:143` |
| `public/css/entity-tile.css` | 11 Hex-Werte | als Rückfallwerte in `var(--surface, #161b26)` usw. — **diese Rückfallwerte sind dunkel und müssen mit** |
| `public/css/assets.css` | 23 `rgba()`-Werte | Abzeichen, Trennlinien, Hover |
| `public/js/assets-nebenkosten.js` | 12 Hex, 3 `rgba()` | u. a. `var(--green-bg, rgba(34,197,94,.08))` `:235` — Token `--green-bg` existiert gar nicht, der Rückfallwert greift immer |
| `public/js/banking-connect.js` | 4 `rgba()` | |
| `public/js/fleet-detail.js` | 1 `rgba()` | |

Alle `rgba(255,255,255,…)`-Werte sind auf hellem Grund unsichtbar; alle
`rgba(0,0,0,…)`-Werte werden zu hart. Sie müssen durch Tokens ersetzt werden.

Dazu kommen **769 Inline-`style="…"`-Attribute** (index.html 484, JS-Dateien 285). Sie beziehen
ihre Farben überwiegend über `var(--…)` und brauchen daher keine Einzelanpassung — wohl aber
die darin fest verdrahteten Größen und Abstände (Paket P2-2/P2-4).

### Responsive Lage

| Befund | Belegstelle |
|---|---|
| **Keine einzige Media-Query** in `public/index.html` (3.519 Zeilen) und `public/css/assets.css` (447 Zeilen) | `grep -c "@media"` → 0 / 0 |
| Nur zwei Media-Queries im ganzen Projekt | `public/css/entity-tile.css:12`, `:15` — betreffen ausschließlich das Kachelraster |
| Hauptnavigation ist eine **nicht umbrechende** Flex-Zeile mit 13 Schaltflächen | `index.html:50-51`: `nav { display: flex; gap: 2px }`, `nav button { padding: 11px 14px; white-space: nowrap }`, kein `overflow-x`, kein `flex-wrap`. Beschriftungen bis „💼 Private Equity". **Das ist die Ursache der gemessenen Dokumentbreite von ca. 1.251 px bei 390 px Viewport** und des „seitlichen Wischens, das die ganze Seite verschiebt" |
| Inhaltsbereich ohne mobile Anpassung | `index.html:55`: `main { padding: 24px; max-width: 1200px }` — 48 px Seitenrand bleiben auch bei 360 px |
| Tabellen ohne Scrollbereich, zusätzlich beschnitten | `index.html:74-76`: `table { width: 100% }`, `th { white-space: nowrap }`; Tabellen stehen in `.card` mit `overflow: hidden` (`:71`) → breite Tabellen werden **abgeschnitten**, nicht scrollbar. Nur sechs Stellen in `index.html` benutzen überhaupt `overflow-x` |
| Diagramme mit fester Mindestbreite | `index.html:863`, `:874`, `:885`: `<svg … style="min-width:600px">` in `<div style="…overflow-x:auto">`. Der Scrollbereich startet links → die **jüngsten Werte am rechten Rand sind zunächst nicht sichtbar**. `W = svg.clientWidth \|\| 600` (`:904`, `:959`, `:1004`) rechnet zudem mit 600 px, wenn die Breite noch 0 ist |
| Touchziele zu klein | 12 × `padding:4px 10px`, 8 × `padding:4px 8px`, 3 × `padding:3px 8px` bei Schriftgröße 11–12 px → ca. 22–26 px Höhe. Gefordert sind ≥ 44 × 44 px |
| Terminkarten als starre Flex-Zeile | `index.html:121-125`: `.ev-row { display: flex }`, `.ev-time { min-width: 110px }` — Titel wird zwischen Zeitspalte und drei Aktionsschaltflächen eingequetscht |
| Instagram-Raster feste 4 Spalten | `index.html:111`: `.insta-grid { grid-template-columns: repeat(4, 1fr) }` |
| Dialoge fast ganzflächig, aber ohne Tastaturführung | `index.html:143-150`: `.modal { width: 560px; max-width: 95vw; max-height: 90vh }` — Breite passt, aber kein Fokus-Trap, kein `role="dialog"`, Felder mit `padding: 9px 12px` |
| **Kein `aria-label` im gesamten Frontend** | `grep -c "aria-label"` über alle 12 Frontend-Dateien → **0**. Alle Icon-Schaltflächen (✏️ 🗑 📎 ⬇ ↻ ✕) haben keinen zugänglichen Namen |
| Kein sichtbarer Tastaturfokus definiert | kein `:focus-visible` in den Stilvorlagen; `outline: none` wird an acht Stellen gesetzt (`index.html:37`, `:133`, `:147`, `assets.css:102-114`, `:398`, `:420`) **ohne Ersatz** |
| Browser-Zurück nicht behandelt | kein `popstate`-Handler; `history.replaceState` nur in Fuhrpark und Wiki (siehe Masterplan §2) |

### Klassifikation
Durchgängig **gewünschte Produktverbesserung** gemäß Spec §2 und §6. Die konkret in Spec §6
genannten Messwerte (1.251 px Dokumentbreite, 600 px Diagramme, seitliches Wischen) sind als
**Beobachtung des Owners** übernommen; die **Ursachen** sind oben am Code belegt, die
**Messwerte selbst wurden in Phase 0 nicht nachgemessen** (kein Browser verfügbar) und sind
bei Checkpoint 2 zu bestätigen.

---

## P2-1 — Helles Design: gemeinsame Farb- und Typografiebasis — Aufwand M

### Erwartetes Verhalten
Heller Seitenhintergrund, überwiegend weiße Inhaltsflächen, dunkle gut lesbare Schrift,
dezente Trennlinien, zurückhaltende Schatten, klare Hierarchie, wenige gezielte Akzentfarben.
Warnungen immer mit **Text und Symbol**, nicht nur über Farbe. Konsistente Schaltflächen,
Formulare, Tabellen und Karten. Fließtext 14–16 px, Nebeninfos ≥ 13 px. WCAG-AA-Kontrast als Ziel.
Keine dekorativen Elemente. Dunkler Hintergrund entfällt; ein Dark Mode ist **keine**
Mindestanforderung und darf nicht verzögern.

### Dateien und Komponenten
- `public/index.html:16-28` — Token-Block; hier entsteht die helle Palette
- `public/index.html:29-204` — der gesamte Stilblock; alle `rgba(255,255,255,…)` und
  `rgba(0,0,0,…)` auf Tokens umstellen
- `public/css/assets.css`, `public/css/entity-tile.css` (inkl. der dunklen Rückfallwerte in
  `var(--x, #…)`), `public/css/wiki.css`
- `public/js/assets-nebenkosten.js` — 12 Hex + `--green-bg`-Rückfall; `public/js/banking-connect.js`;
  `public/js/fleet-detail.js`
- `public/index.html:2159`, `:2398` — SVG-Farbliteral in `_instaMiniSvg`
- **Neu:** zusätzliche Tokens, damit keine Rohfarben mehr nötig sind:
  `--bg`, `--surface`, `--surface-2`, `--border`, `--border-soft`, `--text`, `--text-soft`,
  `--muted`, `--accent`, `--accent-weak`, `--green`, `--green-weak`, `--yellow`, `--yellow-weak`,
  `--red`, `--red-weak`, `--row-hover`, `--overlay`, `--shadow`

### Änderungsumfang
Token-Definition plus Ersetzen der token-fremden Farbwerte. **Keine** strukturellen
Layout-Änderungen in diesem Paket — die kommen in P2-2 bis P2-4. Damit bleibt der Commit
überschaubar und einzeln rücknehmbar.

### Abnahme
- [ ] Alle 13 Bereiche und alle Unterbereiche erscheinen hell; kein dunkler Flicken bleibt stehen
      (besonders prüfen: Anmeldemaske, Dialoge, Fuhrpark-Kacheln, Nebenkosten-Ampel, Wiki,
      Instagram-Raster, Banking).
- [ ] Zeilen-Hover in Tabellen ist sichtbar (die bisherige Regel `rgba(255,255,255,.018)` ist
      auf Weiß wirkungslos).
- [ ] Modal-Hintergrund verdunkelt dezent, nicht schwarz.
- [ ] Alle Warnungen und Fehlerzustände tragen Text **und** Symbol.
- [ ] Fließtext ≥ 14 px, Nebeninfos ≥ 13 px. Die 11-px-Beschriftungen
      (`.badge` `:64`, `.s-card .lbl` `:86`, `th` `:75`, diverse Inline-Stile) sind angehoben
      oder als reine Spaltenköpfe/Abzeichen begründet.
- [ ] Kontrastmessung an je einer Stichprobe pro Farbrolle: Text auf Fläche, gedämpfter Text
      auf Fläche, Akzent auf Fläche, Weiß auf Akzent → AA erreicht oder Abweichung dokumentiert.
- [ ] Keine Hex- oder `rgba()`-Rohfarbe mehr außerhalb des Token-Blocks:
      `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' public/index.html public/css/*.css public/js/*.js`
      liefert nur noch Treffer im Token-Block.

### Tests
- `npm run build` → Exit 0.
- Obiger `grep` als Nachweis.
- Browser bei 1440 px: alle 13 Bereiche und die bekannten Unterbereiche durchklicken.
- Regression: keine Funktionsänderung — Filter, Suchen, Dialoge, Speichern unverändert.

### Live-Auswirkung
Nur Darstellung. Browser-Reload genügt. Rückweg: `git checkout <tag> -- public/`.

---

## P2-2 — Navigation und mobile Grundstruktur — Aufwand L

### Erwartetes Verhalten
- Kein horizontaler Überlauf der Seite bei 360, 390, 768, 1440 px und großem Desktop.
- Die Navigation ist schmal vollständig erreichbar; der aktive Bereich ist erkennbar.
- Seitliches Wischen verschiebt nicht die ganze Seite.
- Touchziele ≥ 44 × 44 px.
- Nichts ist nur über Hover erreichbar.
- Sichtbarer Tastaturfokus.
- Browser-Zurück und Neuladen führen nicht zu überraschenden Bereichswechseln;
  Detail-URL-Parameter funktionieren.
- Keine Funktion fällt mobil ersatzlos weg.

### Dateien und Komponenten
- `public/index.html:50-55` — `nav`, `nav button`, `main`
- `public/index.html:230-251` — Kopfzeile und Navigationsleiste (13 Schaltflächen)
- `public/index.html:337-346` — `showTab()`; hier `history.pushState` und ein `popstate`-Handler
  ergänzen, damit Zurück innerhalb des Dashboards bleibt
- `public/index.html:276-282` — Startparameter-Auswertung (bleibt kompatibel)
- Stilvorlagen: neue Media-Queries für 360/390/768/1440; `:focus-visible`-Regeln als Ersatz für
  die acht `outline: none`-Stellen
- `public/css/entity-tile.css:12-17` — bestehende Haltepunkte (1100/680) auf das neue
  Haltepunktraster abstimmen

**Lösungsweg Navigation:** schmal eine eigene, vollständig erreichbare Form —
entweder eine horizontal scrollbare Leiste mit Scroll-Schatten und `scroll-snap` **innerhalb**
eines `overflow-x: auto`-Containers (die Seite selbst scrollt dann nicht), oder ein Auswahlmenü
mit allen 13 Bereichen. Entscheidung im Paket, nicht vorher — maßgeblich ist, dass der aktive
Bereich erkennbar bleibt und alle 13 Ziele mit dem Daumen erreichbar sind.

### Änderungsumfang
Navigation, Seitenraster, Haltepunkte, Fokusdarstellung, Verlaufsbehandlung.
**Nicht** hier: Tabellen und Diagramme (P2-3), Formulare und Dialoge (P2-4).

### Abnahme
- [ ] Bei 360, 390, 768, 1440 px und großem Desktop: `document.documentElement.scrollWidth`
      ist nicht größer als die Viewport-Breite (Messwert je Breite protokollieren — das ist der
      Gegenbeweis zu den gemeldeten 1.251 px).
- [ ] Alle 13 Bereiche sind bei 390 px erreichbar; der aktive Bereich ist erkennbar.
- [ ] Seitliches Wischen auf einer Inhaltsfläche verschiebt nicht die Seite.
- [ ] Stichprobe von zehn Schaltflächen: Trefferfläche ≥ 44 × 44 px.
- [ ] Tabulator-Durchlauf durch einen Bereich: Fokus ist jederzeit sichtbar.
- [ ] Browser-Zurück nach drei Bereichswechseln führt Schritt für Schritt zurück und nicht aus
      der Anwendung.
- [ ] `?tab=banking`, `?tab=wiki&page=<slug>`, `?fleet_code=<code>` funktionieren weiterhin.
- [ ] Keine Funktion ist mobil verschwunden (Gegenprobe gegen die Desktop-Ansicht je Bereich).

### Tests
- `npm run build` → Exit 0.
- Messprotokoll der Dokumentbreiten je Haltepunkt.
- Regression: alle 13 Bereiche bei 1440 px unverändert.

### Live-Auswirkung
Nur Darstellung und Verlaufsbehandlung. Browser-Reload genügt.
Rückweg: `git revert <commit>`.

---

## P2-3 — Tabellen, Karten und Diagramme responsiv — Aufwand M

### Erwartetes Verhalten
- Tabellen werden mobil zu Karten **oder** stehen in einem klar erkennbaren eigenen
  Scrollbereich. Nichts wird mehr abgeschnitten.
- Diagramme passen sich der Breite an; die jüngsten Werte sind ohne Scrollen sichtbar.
- Wide Content (Tabellen, Diagramme, Codeblöcke, lange Pfade) scrollt innerhalb seines
  Containers, nie die Seite.
- Keine endlos breiten Textzeilen.

### Dateien und Komponenten
- `public/index.html:71` — `.card { overflow: hidden }`: der Grund, warum breite Tabellen
  abgeschnitten statt scrollbar sind
- `public/index.html:74-78` — Tabellengrundstil; neuer Wrapper `.tabelle-scroll` mit
  `overflow-x: auto` und sichtbarem Scrollhinweis
- `public/index.html:84-88` — `.summary-grid` (bereits `auto-fit, minmax(150px, 1fr)` — prüfen,
  ob bei 360 px eine Spalte bleibt)
- `public/index.html:111` — `.insta-grid` feste 4 Spalten → responsiv
- `public/index.html:121-125` — `.ev-row` Terminkarte (Grundlage in P1-5 gelegt)
- `public/index.html:858-890` — drei Diagrammcontainer mit `min-width: 600px`
- `public/index.html:900-1055` — `renderWeightChart`, `renderSleepChart`, `renderHrvChart`;
  `W = svg.clientWidth || 600` → echte Containerbreite nutzen, Beschriftungsdichte an die Breite
  anpassen, bei schmaler Breite weniger Datenpunkte beschriften statt zu scrollen
- `public/css/wiki.css` — hat bereits einen `overflow-x`-Bereich; als Muster nutzen
- Tabellen in `public/js/*.js`: `assets-vertraege.js`, `assets-stammdaten.js`,
  `assets-nebenkosten.js`, `fleet-detail.js`

### Änderungsumfang
Ein gemeinsamer Tabellen-Wrapper, ein gemeinsames Diagrammverhalten, Anwendung auf alle
Tabellen- und Diagrammstellen. Keine Änderung an den Daten oder Spalteninhalten.

### Abnahme
- [ ] Bei 390 px ist jede Tabelle entweder als Karte dargestellt oder in einem erkennbaren
      Scrollbereich; keine Spalte ist abgeschnitten.
- [ ] Die drei Health-Diagramme sind bei 390 px vollständig sichtbar; der **jüngste** Wert ist
      ohne Scrollen zu sehen.
- [ ] Die SharePoint-Dateiliste mit langen Pfaden sprengt die Seitenbreite nicht.
- [ ] Instagram-Raster ist bei 390 px zweispaltig oder einspaltig, nicht vierspaltig gestaucht.
- [ ] Terminkarten (Kalender) ohne Überlauf, lange Beschreibungen umbrechen oder werden gekürzt.
- [ ] Fließtextzeilen überschreiten auf großem Desktop keine angenehme Lesebreite.
- [ ] Bei 1440 px ist die Darstellung gegenüber vorher nicht verschlechtert.

### Tests
- `npm run build` → Exit 0.
- Browser bei 360, 390, 768, 1440 px, Seite für Seite.
- Regression: Sortierung in SharePoint, Zeilenklicks in Assets, Diagrammdaten unverändert
  (Werte stichprobenartig gegen `/api/health/chart-data` abgleichen).

### Live-Auswirkung
Nur Darstellung. Browser-Reload genügt.

---

## P2-4 — Formulare und Dialoge mobil und bedienbar — Aufwand M

### Erwartetes Verhalten
- Formulare und Dialoge sind mit Bildschirmtastatur bedienbar; Aktionsschaltflächen bleiben
  erreichbar.
- Jedes Formular hat Abbrechen/Schließen; Escape schließt (bleibt erhalten, Spec §7).
- Dialogfokus wird geführt: Fokus landet im Dialog, verlässt ihn nicht per Tabulator, kehrt beim
  Schließen zur auslösenden Schaltfläche zurück.
- Lade-, Leer- und Fehlerzustände sind sichtbar; bei lesenden Ladefehlern gibt es einen erneuten
  Versuch. Kein „alles in Ordnung" bei fehlenden Daten.
- Icon-Schaltflächen haben zugängliche Namen.

### Dateien und Komponenten
- `public/index.html:143-150` — `.modal-overlay`, `.modal`, Beschriftungen, Felder, Aktionszeile;
  `role="dialog"`, `aria-modal`, Fokusführung ergänzen
- `public/index.html:444-456` — `openModal()`/`closeModal()`; Escape-Behandlung `:457`
- `public/index.html:33-39` — Anmeldemaske (`.login-box` feste Breite 340 px)
- `public/css/assets.css:102-115` — `.form-input`, `.form-select`;
  `:398-410` `.search-input`; `:413-430` `.filters-row`, `.filter-select`
- `public/index.html:80-81` — `.spinner`, `.empty` (beide `padding: 60px`, mobil zu groß);
  neue Zustandsklassen für „keine Daten", „keine Treffer", „nicht eingerichtet",
  „Laden fehlgeschlagen", „Daten veraltet" — fachlich unterschieden, nicht ein Text für alles
- Alle Icon-Schaltflächen: `aria-label` ergänzen. Betroffene Dateien (0 Treffer heute):
  `public/index.html` und alle `public/js/*.js`

### Änderungsumfang
Dialog- und Formulargrundlage, Zustandsklassen, zugängliche Namen.
Keine Änderung an Absende-Logik, Genehmigungsabläufen oder CSRF-Behandlung.

### Abnahme
- [ ] Bei 390 px mit offener Bildschirmtastatur ist in jedem Dialog die Aktionszeile erreichbar
      (Stichprobe: Neuer Termin, Termin bearbeiten, Neue Reise, Mieter anlegen, SharePoint-Upload,
      Nebenkosten-Finalisieren).
- [ ] Escape schließt jeden Dialog; Abbrechen ist überall vorhanden.
- [ ] Tabulator im Dialog bleibt im Dialog; Fokus kehrt beim Schließen zurück.
- [ ] Die fünf Zustände sind in mindestens drei Bereichen unterschiedlich formuliert und
      nachweisbar auslösbar (mindestens „keine Treffer" und „Laden fehlgeschlagen" mit
      Wiederholungsschaltfläche).
- [ ] `grep -c "aria-label"` über die Frontend-Dateien ist deutlich > 0; eine Stichprobe von
      zehn Icon-Schaltflächen hat sinnvolle Namen.
- [ ] Genehmigungsdialoge (Fuhrpark, Assets, Banking) funktionieren unverändert, inklusive Timer.

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/*.js` → Single-Root-Prüfung für geänderte Templates.
- Browser bei 390 px und 1440 px; Tastaturdurchlauf.
- Regression: **keine** echte Mutation zu Testzwecken — Dialoge werden geöffnet und mit
  Abbrechen geschlossen. Speichertests nur dort, wo in `04-…` ausdrücklich ein Testdatensatz
  vorgesehen ist.

### Live-Auswirkung
Nur Darstellung und Bedienung. Browser-Reload genügt.

### Rückweg
`git revert <commit>` je Paket; Frontend allein `git checkout <tag> -- public/`.
