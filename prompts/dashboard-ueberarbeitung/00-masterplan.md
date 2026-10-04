# 00 — Masterplan Dashboard-Überarbeitung

**Grundlage:** `~/bikosoc-spec/spec-dashboard-ueberarbeitung-20261004.md` (Owner-Spec 04.10.2026, verbindlich)
**Phase 0 abgeschlossen:** 04.10.2026
**Sicherungsstand:** Tag `pre-dashboard-ueberarbeitung-20261004` (Commit `735d5b8`)

---

## 1. Ziel, Umfang, Rahmen

### Ziel
Das Dashboard soll verlässlich beantworten: Was ist heute wichtig? Was braucht Aufmerksamkeit?
Welche Informationen sind aktuell und vertrauenswürdig? Was kann ich als Nächstes tun?

### Umfang
- Phase 1: Verlässlichkeit — Funktionsfehler und Datenvertrauen (Befunde A–G).
- Phase 2: Helles Design, mobile Variante, Tagesübersicht, Bereichsverbesserungen (I–M, §5, §6).
- Phase 3: Abschlusskorrekturen und Restpunkte.

### Rahmen (aus Spec §1 — gilt für jedes Paket)
- Arbeit direkt am Livesystem; keine Test-/Stagingumgebung, wird nicht zur Voraussetzung gemacht.
- Vor jeder Änderung Codestand gesichert, Rückweg bereit (siehe §6 dieser Datei).
- Kleine, nachvollziehbare Änderungen vor Komplettumbau.
- Keine Zugangsdaten, Tokens oder vertraulichen Inhalte in Arbeitsdateien, Logs, Berichten.
- Keine echten Zahlungen, Trades, Veröffentlichungen, Nachrichten, Einladungen oder externen
  Aktionen zu Testzwecken.
- Keine Bestandsdaten löschen, archivieren oder fachlich verändern, nur damit eine Ansicht
  plausibler aussieht.
- Maßnahmen mit möglichem Datenverlust, neuen Kosten oder Außenwirkung gehen zur Entscheidung
  an den Owner (siehe §5 dieser Datei).

---

## 2. Technischer Steckbrief (am Code geprüft, 04.10.2026)

| Punkt | Befund |
|---|---|
| Repo | `~/.openclaw/workspace/.openclaw/extensions/executive-dashboard`, Remote `biko007/executive-dashboard-private` |
| Backend | `server.mjs` (2.467 Zeilen), Express 4, plain ESM-Node, kein TypeScript, kein Bundler |
| Frontend | `public/index.html` (3.519 Zeilen, Single-Page, inline `<script>` + inline `<style>`), 11 `public/js/*.js`, 3 `public/css/*.css` |
| UI-Technik | Zwei Stile parallel: (a) klassisch — Template-Strings + `innerHTML` + globale `load*()`-Funktionen (Health, Trips, Kalender, SharePoint, Instagram, Trading, PE, Wiki, Agents, Status); (b) Alpine.js 3.15.12 **CSP-Build** (`public/vendor/alpine.csp.min.js`) für Fuhrpark, Assets, Banking |
| Build | `npm run build` = `node --check server.mjs`. Kein Transpile, kein Bundling, keine Minifizierung. **`public/*` wird unverändert ausgeliefert** |
| Styling | Ein `:root`-Block in `public/index.html:16-28` (dunkle Palette), zusätzlich `public/css/assets.css`, `entity-tile.css`, `wiki.css`. Farben fast durchgängig über `var(--…)`; 44 hartcodierte Hex-Werte insgesamt (index.html 21, entity-tile.css 11, assets-nebenkosten.js 12) |
| Routing | Keine Router-Bibliothek. `showTab(tab)` (`index.html:337-346`) tauscht `#content`-Inhalt. URL-Parameter nur beim Seitenstart gelesen (`index.html:276-282`: `?token=`, `?tab=`); danach `history.replaceState` in Fuhrpark (`fleet-stores.js:138-149`, `fleet-detail.js:58`) und Wiki (`wiki.js:142-148`). **Kein `popstate`-Handler** → Browser-Zurück verlässt die Anwendung oder springt unerwartet |
| Auth | Bearer/Query-Token (`DASHBOARD_TOKEN`) im `localStorage`; Session-Cookie + CSRF für Proxy-Routen (`server.mjs:74-203`) |
| Datenquellen | drei Klassen: (1) **Proxy an Core** `127.0.0.1:18789` via `proxyToCore` (`server.mjs:204-259`) — Assets, Fuhrpark, Banking, SharePoint, Wiki, Links; (2) **Direkt** — M365 Graph (Kalender), Trading-Service `127.0.0.1:18793`; (3) **Dateibasiert** unter `~/.openclaw/workspace/artifacts/personal/…` — Trips, Private Equity, Dokumente, Instagram-Caches und Raw-Sessions |
| Datenbank | Postgres `openclaw_core` in Container `n8n-docker-postgres-1`, App-User `openclaw`, 60 Tabellen. Zugriff ausschließlich über den Core, nicht aus dem Dashboard |
| Deployment | `systemctl --user restart openclaw-dashboard.service` (Unit: `~/.config/systemd/user/openclaw-dashboard.service`, `ExecStart=/usr/bin/node server.mjs`). **Frontend-Änderungen wirken nach Browser-Reload ohne Restart**; nur `server.mjs` braucht Restart |
| nginx | `/etc/nginx/sites-enabled/openclaw.conf`: `/dashboard` → `127.0.0.1:18800` (Prefix wird gestrippt), `/api/` → 18800, `/api/internal/` → 18789 (nur 127.0.0.1) |
| Tests/Gates im Dashboard-Repo | **keine.** Nur `node --check`. Kein ESLint, kein Unit-Test, kein Snapshot |
| Gates außerhalb | Agent-Repo: `npm run build` (tsc), `npm run lint` (ESLint, Modulgrenzen), `npm test`, `npm run verify-schema`, `npm run verify:commands`, `scripts/smoke-test.ts` (prüft u. a. `https://app.bikobickel.de/dashboard/`) |
| Red-Zone | `~/.config/openclaw/red-zone.conf`. Relevant: `CLAUDE.md`, `index.ts`, `dist/**`, `hooks/**`, `*/migrations/*.sql`. `prompts/**` und `public/**` sind **nicht** rot |
| Konvention Arbeitsaufträge | Im Dashboard-Repo existiert keine. Agent-Repo nutzt `docs/workpackages/<datum>-<thema>.md` als **Nachweisbündel nach Abschluss**, nicht als Auftrag. Deshalb nach Spec §8: neuer Ordner `prompts/dashboard-ueberarbeitung/` |

### Was der globale „Stand"-Zeitpunkt im Seitenkopf bedeutet

**Code-Beleg:** `public/index.html:440-442`

```js
function stamp() {
  document.getElementById('lastUpdate').textContent = 'Stand: ' + fmtDT(new Date().toISOString());
}
```

`stamp()` wird am Ende von 13 `load*()`-Funktionen aufgerufen und setzt die **aktuelle
Browser-Uhrzeit des Seitenaufbaus**. Der Wert hat **keinen Bezug zum Alter der angezeigten
Daten** — er sagt nur „dieser Bereich wurde gerade gerendert". `showTab()` leert das Feld
vorher (`index.html:343`); `loadBanking()` ruft `stamp()` gar nicht auf, dort bleibt der Kopf leer.

Das war die Kernursache von Befund A: ein frischer „Stand"-Zeitpunkt neben 146 Tage alten
Quelldaten.

**Erledigt in P1-1 (04.10.2026; Commit siehe `STATUS.md`).** `stamp()` setzt jetzt
„Seite geladen: …" (Zeitpunkt des Seitenabrufs). Datenstand und letzter erfolgreicher
Quellenabgleich stehen getrennt davon in der neuen Datenstand-Leiste zwischen Navigation und
Inhalt (`public/js/datenstand.js`, `public/css/datenstand.css`). `loadBanking()` ruft `stamp()`
jetzt ebenfalls auf.

---

## 3. Befundlage: bestätigt / offen

Vollständige Tabelle mit Ursache, Klassifikation und Paket: siehe
`~/bikosoc-spec/report-dashboard-phase0-1700.md` §2 sowie die Pakete in `01-`…`03-`.

### Reproduzierte Funktionsfehler (Ursache am Code belegt)
- **A/B1/B2 — behoben in P1-1 (04.10.2026).** Einzelnachweis:
  `~/bikosoc-spec/report-dashboard-p1-1-1846.md`.
- **B1** IB-Gateway-Status: Feldname-Fehler im Core (`index.ts:3456` las `data.ibkr?.connected`, der Trading-Service liefert `connected` auf oberster Ebene) → Status immer „down". **Behoben**, zusätzlich hat die Live-Prüfung jetzt Vorrang vor der `service_health`-Zeile.
- **B2** Instagram-Token „55 Tage": hartcodiert (`index.html:2133`). Echter Wert 59 Tage. **Behoben** — der Wert kommt jetzt aus derselben Quelle wie der Status-Bereich.
- **C** Fuhrparkfilter: Liste bleibt nach Filterwechsel leer. Backend korrekt verifiziert; Fehler liegt im Render-/Alpine-Lebenszyklus. Genauer Mechanismus noch nicht ohne Browser verifiziert.
- **D** Mietvertragsfilter/Suche: `vertraegeFilter()` ist eine leere Funktion (`assets-vertraege.js:191-193`), `_filteredLeases()` gibt ungefiltert zurück (`:116-118`).
- **E** SharePoint: Frontend liest Graph-Feldnamen (`webUrl`, `displayName`, `id`, `lastModifiedDateTime`), der Core liefert seit Sprint 10 `web_url`, `site_name`, `site_id`, `last_modified_at`.
- **F** Kalender: Graph liefert `dateTime` in UTC ohne Zeitzonen-Suffix; das Frontend parst den String als Lokalzeit und ignoriert das Enddatum.
- **G** Nebenkosten: Schweregrad-Vergleich gegen `'blocking'`, Core liefert `'blocker'` → Blocker werden als „Info" dargestellt. Meldungstext wird aus `f.detail` gelesen, Core liefert `message` → Beschreibung immer leer.
- **I** Wiki-Suche: Core liefert `ts_headline`-Markup `<b>…</b>` plus rohes Markdown, Frontend escaped es vollständig.
- **J** Content-Plan-Verweis `→ insta-001` ist reiner Text, kein Link; die verwiesenen Entwürfe existieren nicht.

### Beobachtete Daten- oder Darstellungsunklarheit
- **A** Instagram-Bereich zeigt zu großen Teilen Demodaten aus `_INSTA_MOCK` (`index.html:2104-2133`), darunter die Tabelle „Top-Beiträge (30 Tage)" mit Jan/Feb-2026-Einträgen, der Content-Plan „KW 10–11" und der gesamte Analyse-Unterbereich inklusive eines **hartcodierten Absatzes unter der Überschrift „🤖 KI-Empfehlung"** (`index.html:2415`).
- **A** Datenalter je Bereich stark unterschiedlich (Messwerte siehe Report §3), ohne jede Kennzeichnung in der Oberfläche.
- **H** Mietvertrag `n24-w6-2024` steht auf `active`, obwohl `actual_move_out = 2024-11-15`; die Nachfolgeeinheit hat einen zweiten aktiven Vertrag. Vier Mieterdatensätze „Jürgen Bickel" mit identischer E-Mail, je ein Vertrag. **Fachlicher Entscheidungsbedarf — nichts geändert.**
- **K** Banking zeigt nur IBAN und Saldo; `currency`, `lastSyncAt`, `status`, `displayName` liegen vor und werden nicht angezeigt.

### Gewünschte Produktverbesserung
- **L** Agentenübersicht, **M** Bedienverbesserungen, **§5** Tagesübersicht, **§6** helles Design und mobile Variante.

### Noch nicht verifiziert (Browserprüfung erforderlich)
- Der genaue Auslösemechanismus von **C** (Alpine-`x-if`/`x-ref`-Lebenszyklus).
- Alle Messwerte aus Spec §6 (Dokumentbreite 1.251 px bei 390 px, Diagrammbreite 600 px,
  seitliches Wischen). Statisch bestätigt sind die **Ursachen**: keine einzige Media-Query in
  `index.html` und `assets.css`, `nav` als nicht umbrechende Flex-Zeile mit 13 Schaltflächen,
  Tabellen ohne Scrollbereich in Karten mit `overflow: hidden`.
- Tastaturfokus, Dialogfokus, Bildschirmtastatur-Verhalten.
- **G**: ob die 21 Pre-Check-Regeln fachlich korrekt zugeordnet sind (geprüft wurde nur die
  Anzeige, nicht die Regel).

---

## 4. Abhängigkeiten und Reihenfolge

### Gemeinsame Ursachen — bündeln, nicht einzeln reparieren

| Gemeinsame Ursache | Dahinterliegende Befunde | Paket |
|---|---|---|
| Kein Datenalter-Konzept; „Stand" = Renderzeit | A, B, K, Teile von §5 | P1-1 |
| Demodaten aus dem Instagram-Mockup nie ersetzt | A, B2, J | P1-1 (Kennzeichnung) + P2-7 (Ersatz) |
| Zustand aus einer veralteten DB-Zeile schlägt Live-Prüfung; Feldname-Fehler | B1 | P1-1 |
| Render nach Zustandswechsel innerhalb `x-if` schlägt fehl | C, potenziell weitere Alpine-Bereiche | P1-2 |
| Filter-/Suchlogik nie implementiert | D | P1-3 |
| Sprint-10-Migration: Feldnamen snake_case vs. camelCase | E | P1-4 |
| Naive Datums-Strings ohne Zeitzone | F, Teile von M (Datumsformate) | P1-5 |
| Core-Feldnamen `severity`/`message` falsch gelesen | G | P1-6 |
| Eine dunkle Farbpalette ohne Hell-Variante | §2, §6 | P2-1 |
| Keine Media-Queries, kein mobiles Layout | §6 | P2-2/P2-3/P2-4 |

### Reihenfolge Phase 1 (Spec §9, unverändert übernommen)

1. **P1-1** Aktualität und Statuskonsistenz (A, B) — Grundlage für alles Weitere, weil jede
   spätere Ansicht die Datenalter-Bausteine benutzt.
2. **P1-2** Fuhrparkfilter (C) — klein, unabhängig.
3. **P1-3** Mietvertragsfilter und Suche (D) — unabhängig; Abnahme braucht den Hinweis aus H
   (alle 17 Verträge stehen auf `active`, deshalb liefern „Beendet" und „Zukünftig" korrekt null Treffer).
4. **P1-4** SharePoint (E) — unabhängig.
5. **P1-5** Kalender (F) — unabhängig; liefert die Datums-/Zeitzonenbausteine, die P2-8 wiederverwendet.
6. **P1-6** Nebenkosten (G) — unabhängig.

**CHECKPOINT 1** nach P1-6: unabhängige Browserprüfung. Breiter UI-Umbau hält hier an.

### Reihenfolge Phase 2

1. **P2-1** Helles Design (Farb-Token) — muss vor allen anderen Phase-2-Paketen liegen.
2. **P2-2** Navigation und mobile Grundstruktur.
3. **P2-3** Diagramme und Tabellen responsiv.
4. **P2-4** Formulare und Dialoge mobil.
5. **P2-5** Tagesübersicht (§5) — braucht die Datenalter-Bausteine aus P1-1.
6. **P2-6** Wiki-Suche (I).
7. **P2-7** Instagram-Planung und Rohmaterial (J) — ersetzt die in P1-1 nur gekennzeichneten Demodaten.
8. **P2-8** Begriffe, Zahlen-/Datumsformate, Barrierefreiheit (M).
9. **P2-9** Banking (K).
10. **P2-10** Agentenübersicht (L) — Owner-Entscheidung Nr. 5 muss vorher beantwortet sein.
11. **P2-11** Immobilien-/Mieterdaten-Darstellung (H) — Owner-Entscheidungen Nr. 3 und 4 vorher.

**CHECKPOINT 2** nach Phase 2: vollständige Benutzer- und Mobilprüfung, echtes Smartphone mit dem Owner.

### Aufwandsskala

| Stufe | Bedeutung |
|---|---|
| S | eine Datei, ein Mechanismus, unter ca. 100 geänderten Zeilen |
| M | zwei bis vier Dateien oder ein neuer gemeinsamer Baustein |
| L | bereichsübergreifend oder neuer Bildschirm; eigener Commit je Teilschritt |

### Aufwandsübersicht

| Paket | Thema | Aufwand |
|---|---|---|
| P1-1 | Aktualität und Statuskonsistenz | L |
| P1-2 | Fuhrparkfilter | S |
| P1-3 | Mietvertragsfilter und Suche | M |
| P1-4 | SharePoint-Datenzuordnung | M |
| P1-5 | Kalenderlogik | M |
| P1-6 | Nebenkosten-Meldungen | M |
| P2-1 | Helles Design | M |
| P2-2 | Navigation und mobile Grundstruktur | L |
| P2-3 | Diagramme und Tabellen responsiv | M |
| P2-4 | Formulare und Dialoge mobil | M |
| P2-5 | Tagesübersicht | L |
| P2-6 | Wiki-Suchausschnitte | S |
| P2-7 | Instagram-Planung und Rohmaterial | M |
| P2-8 | Begriffe, Formate, Barrierefreiheit | M |
| P2-9 | Banking-Übersicht | S |
| P2-10 | Agentenübersicht | M |
| P2-11 | Immobilien-/Mieterdaten-Darstellung | M |

---

## 5. Owner-Entscheidungen

**Alle acht Punkte sind am 04.10.2026 vom Owner entschieden.** Die Entscheidungen sind
verbindlich; die Spalte „Entscheidung" ist für die Pakete maßgeblich. Die ursprüngliche
Befundlage bleibt als Begründung stehen.

| Nr. | Punkt | Belegte Lage | **Entscheidung des Owners (04.10.2026)** | Umsetzung in |
|---|---|---|---|---|
| 1 | **n8n-Zeitpläne** | Alle vier n8n-Workflows (`banking-sync-daily`, `instagram-token-health-daily`, `health-withings-sync-daily`, `260509-openclaw-health-check`) sind inaktiv, n8n hat null Ausführungen. Banking-Daten vom 29.06.2026, SharePoint vom 16.05.2026 | **n8n wird NICHT reaktiviert.** Das Datenalter wird stattdessen ehrlich gekennzeichnet. Keine automatische Synchronisation, kein Abgleich aus dem Dashboard heraus | **P1-1 erledigt** |
| 2 | **Instagram-Demodaten** | Top-Beiträge, Quick Insights, Content-Plan, Analyse und der Absatz unter „🤖 KI-Empfehlung" stammen aus `_INSTA_MOCK` bzw. festen Textliteralen | **Ausblenden.** Die betroffenen Blöcke zeigen einen Leerzustand „Keine aktuellen Daten – letzter Abgleich \<Datum aus `media-cache.fetched_at`\>". Nichts wird gelöscht, nur nicht gerendert. Aufbau auf echter Grundlage später | **P1-1 erledigt**, Ersatz in P2-7 |
| 3 | **Mietvertrag `n24-w6-2024`** | `status = active`, `actual_move_out = 2024-11-15`, `termination_date = 2025-11-30`; Einheit 32 hat mit `n24-w6-2025` einen zweiten aktiven Vertrag | **Nur Anzeige als Inkonsistenz. Keine Datenänderung** — kein Statuswechsel, keine Datumskorrektur | P2-11 |
| 4 | **Vier Mieterdatensätze „Jürgen Bickel"** | IDs 31, 32, 37, 38; identische E-Mail; je genau ein aktiver Vertrag | **Die Datensätze sind KORREKT.** Der Owner ist Hauptmieter temporär vermieteter Wohnungen mit Untermietern. **Nicht zusammenführen.** Später als Hauptmieter-/Untermieter-Verhältnis darstellen | P2-11 |
| 5 | **Agentenübersicht** | n8n-API-Schlüssel existiert und funktioniert; n8n-Datenbank für den `openclaw`-User bewusst gesperrt | **Ja** — lesende Übersicht über die n8n-API. Schlüssel bleibt serverseitig | P2-10 |
| 6 | **Kopfzeile „Hans Dampf"** | Hartcodiert in `public/index.html:233` und Meta-Tag `:10` | **Bleibt.** Keine Änderung | — (erledigt durch Nicht-Handeln) |
| 7 | **Nebenkosten-Meldungstexte** | 21 Regeln in `src/modules/nk/precheck.ts` liefern englische Meldungen ohne Ursache/Auswirkung/nächsten Schritt | **Deutsche Texte im Dashboard, `precheck.ts` bleibt unangetastet.** Die fachliche Prüfung der Schweregrad-Zuordnung übernimmt der Owner bei **Checkpoint 1** | P1-6 |
| 8 | **SharePoint-Altzeile** | Zwei Einträge mit derselben `site_id`, einer mit leerem Namen und einer Datei | **Nur anzeigen, kein Cleanup.** `POST /api/sharepoint/cleanup-missing` wird nicht ausgeführt | P1-4 |

---

## 6. Sicherungsstand und Rückweg

### Was gesichert ist (04.10.2026, ca. 16:56 UTC)

| Gegenstand | Ort |
|---|---|
| Codestand Dashboard | Git-Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `735d5b8` (Arbeitsbaum war sauber) |
| Workspace-Pointer | Git-Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `a86bd2a`; Pointer zeigt auf `735d5b8` |
| Datenbank `openclaw_core` | `~/upgrade-artifacts/20261004-dashboard/openclaw_core-20261004-1700.dump` (2.600.971 Byte, `pg_dump --format=custom`, 617 TOC-Einträge mit `pg_restore --list` geprüft) |
| Dateibasierte Datenstände | `~/upgrade-artifacts/20261004-dashboard/dateidaten-20261004-1700.tar.gz` (3.949 Einträge: `instagram/`, `travel/`, `fleet/`, `private-equity/`; Mediendateien ausgeschlossen) |
| Prüfsummen | `~/upgrade-artifacts/20261004-dashboard/SHA256SUMS.txt` |
| Laufendes Borg-Backup | letzte erfolgreiche Ausführung 04.10.2026 03:04 UTC, Exit 0 |

### Rückweg

**Code zurücknehmen (reversibel, ohne Datenverlust):**

```bash
cd ~/.openclaw/workspace/.openclaw/extensions/executive-dashboard
git log --oneline pre-dashboard-ueberarbeitung-20261004..HEAD   # was wurde gemacht
git revert --no-edit <commit>                                   # einzelnes Paket zurücknehmen
# oder vollständig auf den Sicherungsstand:
git checkout -B rueckweg-20261004 pre-dashboard-ueberarbeitung-20261004
systemctl --user restart openclaw-dashboard.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18800/health   # erwartet 200
```

**Nur Frontend zurücknehmen (kein Restart nötig):**

```bash
cd ~/.openclaw/workspace/.openclaw/extensions/executive-dashboard
git checkout pre-dashboard-ueberarbeitung-20261004 -- public/
# Browser-Reload genügt, public/ wird statisch ausgeliefert
```

**Datenbank zurücknehmen** — nur wenn ein Paket Daten verändert hat; das ist in Phase 1
nicht vorgesehen und wäre vorab mit dem Owner abzustimmen:

```bash
# Prüfsumme zuerst
cd ~/upgrade-artifacts/20261004-dashboard && sha256sum -c SHA256SUMS.txt
# Rücksicherung ist ein Eingriff in Produktionsdaten → nur nach Owner-Freigabe
```

**Owner-Aufgabe:** Ein **Hetzner-Snapshot** des VPS vor Phase 2 ist sinnvoll, weil Phase 2
breitflächig in die Oberfläche eingreift. Er kann nur über die Hetzner-Cloud-Konsole
ausgelöst werden und ist kostenpflichtig — deshalb Owner-Entscheidung, nicht Agentenschritt.
Für Phase 1 (kleine, einzeln reversible Code-Änderungen) genügen Tag, Dump und Borg.

---

## 7. Checkpoints

### CHECKPOINT 1 — nach P1-6
Unabhängige Browserprüfung durch den Owner oder eine getrennte Prüfinstanz:
Filter (Fuhrpark, Mietverträge), Dokumentzugriff (SharePoint), Kalender, Aktualitätsanzeige,
Statuskonsistenz zwischen Trading, Instagram und Status.
Übergabe enthält: geänderte Dateien, Fundort live, Reproduktions- und Abnahmeschritte,
erwartete Zustände, Offenes, Änderungsstand (Commit-Hashes).
**Breiter UI-Umbau beginnt erst nach Freigabe.**

### CHECKPOINT 2 — nach Phase 2
Vollständige Benutzer- und Mobilprüfung: 13 Fachbereiche, Tagesübersicht,
Design und Lesbarkeit, mobile Navigation, Tabellen und Diagramme, Formulare und Dialoge,
Lade-/Leer-/Fehlerzustände, Regressionen.
Prüfung am echten Smartphone gemeinsam mit dem Owner. Emulation allein gilt nicht als
vollständig; andernfalls bleibt der Punkt als offen markiert.

Prüfabläufe im Detail: `04-abnahme-und-regressionspruefung.md`.

---

## 8. Definition of Done

### Je Paket
- [ ] Problem am Livesystem reproduziert, Ursache am Code belegt.
- [ ] Änderung auf den beschriebenen Umfang begrenzt; keine unverwandten Umbauten.
- [ ] `npm run build` (= `node --check server.mjs`) Exit 0.
- [ ] Bei Änderungen an `public/js/*.js` mit Alpine-Templates: jede `x-if` auf genau ein
      direktes Kindelement geprüft (`grep -n "x-if" public/js/*.js`).
- [ ] Abnahmekriterien des Pakets nachweisbar erfüllt — mit tatsächlichem Prüfergebnis,
      nicht mit einer Erfolgsmeldung.
- [ ] Rückweg des Pakets benannt (Commit-Hash).
- [ ] `STATUS.md` fortgeschrieben.
- [ ] Ein Commit je Paket, nachvollziehbare deutsche Commit-Nachricht.
- [ ] Keine Zugangsdaten, Tokens, IBANs oder personenbezogene Inhalte in Code, Logs oder Dateien.

### Je Phase
- [ ] Alle Pakete der Phase erledigt oder mit Begründung zurückgestellt.
- [ ] Checkpoint-Prüfung durchlaufen, Ergebnis in `04-…` eingetragen.
- [ ] Offene Owner-Entscheidungen in §5 dieser Datei aktualisiert.
- [ ] Keine Regression in den unter Spec §7 geschützten Funktionen.

### Gesamt
- [ ] Befunde A–M entweder behoben, bewusst zurückgestellt oder als Owner-Entscheidung dokumentiert.
- [ ] Helles Design in allen Ansichten, Unteransichten, Formularen und Dialogen.
- [ ] Kein horizontaler Seitenüberlauf bei 360, 390, 768, 1440 px und großem Desktop.
- [ ] Tagesübersicht vorhanden und nur mit tatsächlich verfügbaren Daten gefüllt.
- [ ] Spec §7 („Erhalten bleibt") vollständig erfüllt.
