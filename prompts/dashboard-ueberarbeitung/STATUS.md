# STATUS — Dashboard-Überarbeitung

Fortschreiben nach **jedem** Arbeitspaket. Keine Erfolgsmeldung ohne tatsächliches Prüfergebnis.

**Letzte Aktualisierung:** 05.10.2026, 10:05 UTC
**Aktuelle Phase:** Phase 1 umgesetzt, **CHECKPOINT 1 durch Owner-Selbstprüfung bestanden**
(05.10.2026, 09:30–09:50). Vier Nachbesserungen aus der Prüfung sind erledigt.
**Nächster Schritt: Freigabe für Phase 2** (helles Design, Mobil, Tagesübersicht).
**Sicherungsstand:** Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `735d5b8`
**Änderungsstand Code:** Phase 1 ist produktiv und in allen drei Repositories gepusht.
Dashboard-Dienst und Gateway neu gestartet. Der Red-Zone-Push des Core-Anteils (`5f65c4b`)
erfolgte am 05.10.2026 07:30 UTC mit gesetztem Armed-Flag; das Flag ist verbraucht.
**Owner-Entscheidungen:** alle acht Punkte entschieden, siehe `00-masterplan.md` §5.

---

## Paketübersicht

| Paket | Thema | Aufwand | Status | Commit | Prüfung |
|---|---|---|---|---|---|
| **Phase 0** | Bestandsaufnahme, Sicherung, Arbeitsdateien | — | **erledigt** | `1fe1499` | Report `~/bikosoc-spec/report-dashboard-phase0-1700.md` |
| P1-1 | Aktualität und Statuskonsistenz (A, B) | L | **erledigt** | siehe unten | Report `~/bikosoc-spec/report-dashboard-p1-1-1846.md` |
| P1-2 | Fuhrparkfilter (C) | S | **erledigt** | `30ac07b` | Report `~/bikosoc-spec/report-dashboard-p1-buendel-2020.md` |
| P1-3 | Mietvertragsfilter und Suche (D) | M | **erledigt** | `f66bfce` | Report `~/bikosoc-spec/report-dashboard-p1-buendel-2020.md` |
| P1-4 | SharePoint-Datenzuordnung (E) | M | **erledigt** | `94f49ea` | Report `~/bikosoc-spec/report-dashboard-p1-buendel-2020.md` |
| P1-5 | Kalenderlogik (F) | M | **erledigt** | `8586ed0` · Core `5f65c4b` | Report `~/bikosoc-spec/report-dashboard-p1-5-0735.md` |
| P1-6 | Nebenkosten-Meldungen (G) | M | **erledigt** | `4ff083e` | Report `~/bikosoc-spec/report-dashboard-p1-buendel-2020.md` |
| **CHECKPOINT 1** | Browserprüfung durch den Owner | — | **bestanden** 05.10.2026 09:30–09:50 | — | Befunde A–G grün; vier Nachbesserungen siehe eigener Eintrag |
| CP1-N | Nachbesserung aus CHECKPOINT 1 | S | **erledigt** | `aa40c12` | Report `~/bikosoc-spec/report-dashboard-cp1-nachbesserung-1005.md` |
| P2-1 | Helles Design | M | offen | — | — |
| P2-2 | Navigation und mobile Grundstruktur | L | offen | — | — |
| P2-3 | Tabellen, Karten, Diagramme responsiv | M | offen | — | — |
| P2-4 | Formulare und Dialoge mobil | M | offen | — | — |
| P2-5 | Tagesübersicht (§5) | L | offen | — | — |
| P2-6 | Wiki-Suchausschnitte (I) | S | offen | — | — |
| P2-7 | Instagram-Planung und Rohmaterial (J) | M | offen | — | — |
| P2-8 | Begriffe, Formate, Barrierefreiheit (M) | M | offen | — | — |
| P2-9 | Banking-Übersicht (K) | S | offen | — | — |
| P2-10 | Agentenübersicht (L) | M | offen | — | — |
| P2-11 | Immobilien-/Mieterdaten-Darstellung (H) | M | offen | — | — |
| **CHECKPOINT 2** | vollständige Benutzer- und Mobilprüfung | — | offen | — | `04-…` §3 |
| Phase 3 | Abschlusskorrekturen, Restpunkte | — | offen | — | — |

---

## Verlauf

### Phase 0 — 04.10.2026

**Durchgeführt**
- Bestandsaufnahme: Stack, Routing, Datenquellen je Bereich, Deployment, Gates, Konventionen.
- Bedeutung des globalen „Stand"-Zeitpunkts am Code festgestellt
  (`public/index.html:440-442` — Renderzeitpunkt, kein Datenalter).
- Befunde A–M am aktuellen Stand reproduziert, soweit ohne Browser möglich:
  Code-Lesen, lesende Abrufe gegen `127.0.0.1:18800` und `127.0.0.1:18793`,
  lesende Abfragen auf `openclaw_core`, lesende n8n-API-Abfrage.
- Gemeinsame Ursachen bestimmt (siehe `00-masterplan.md` §4).
- Sicherung erstellt.
- Sechs Arbeitsdateien nach Spec §8 angelegt.

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` (Dashboard) | Exit 0 („Build OK") |
| `pg_dump --format=custom` | 2.600.971 Byte, `pg_restore --list` → 617 TOC-Einträge |
| Git-Arbeitsbaum Dashboard vor Tag | sauber |
| `GET /api/fleet/vehicles?status=active\|archived\|all` | 7 / 0 / 7 — Backend korrekt |
| `GET /api/trading/status` vs. `GET /api/dashboard/status` | `connected: true` vs. `IB Gateway: down` — Widerspruch reproduziert |
| `GET 127.0.0.1:18793/health` | `{"ok":true,"connected":true,…}` — kein `ibkr`-Objekt, Feldname-Fehler im Core bestätigt |
| `insta_tokens WHERE active` | genau 1 Zeile, 59 Tage Restlaufzeit → „55 Tage" im Instagram-Kopf ist hartcodiert |
| `GET /api/sharepoint/sites\|drives\|files\|search` | durchgängig `snake_case`; Frontend liest `camelCase` — Befund E bestätigt |
| `GET /api/calendar` | „Meetup INHALE": `2026-10-05T22:00Z` → `2026-10-06T21:30Z`, `isAllDay: false` — Befund F bestätigt |
| `GET /api/assets/properties/{d4,l19,n24,mg24,s28,i83}/nk-readiness?year=2025` | `severity: "blocker"`, Feld `message` — Befund G bestätigt (Frontend vergleicht gegen `'blocking'`, liest `f.detail`) |
| `SELECT … FROM leases` | 17 Zeilen, alle `active`; `n24-w6-2024` mit `actual_move_out = 2024-11-15` |
| `SELECT … FROM tenants` | 26 Zeilen; vier Datensätze „Jürgen Bickel" (IDs 31, 32, 37, 38), je ein Vertrag |
| `GET /api/wiki/search?q=Pflanzliste` | `snippet` enthält `<b>…</b>` und rohes Markdown — Befund I bestätigt |
| `GET /api/instagram/raw` | 887 Sessions, technische Kennungen, kein Titelfeld |
| `GET /api/banking/accounts` | 12 Konten, 2 aktiv, alle EUR, `lastSyncAt` 29.06.2026, `accountType`/`ownerName` durchgängig `null` |
| n8n `GET /api/v1/workflows` / `/executions` | 4 Workflows, **alle inaktiv**; **0** Ausführungen |
| `grep -c "@media"` über `index.html` und `assets.css` | 0 / 0 |
| `grep -c "aria-label"` über alle Frontend-Dateien | 0 |

**Verbleibende Fehler**
Keine behoben — Phase 0 war ausdrücklich ohne Fehlerbehebung und ohne UI-Umbau.
Alle Befunde A–M stehen offen; Klassifikation in `00-masterplan.md` §3.

**Noch nicht verifiziert**
- Auslösemechanismus von Befund C (Alpine-`x-if`/`x-ref`-Lebenszyklus) — nur im Browser zu klären.
- Alle Messwerte aus Spec §6; die Ursachen sind am Code belegt, die Zahlen nicht nachgemessen.
- Tastaturfokus, Dialogfokus, Bildschirmtastatur-Verhalten.
- Fachliche Richtigkeit der 21 Nebenkosten-Pre-Check-Regeln.
- Ob ein lesender Endpunkt für Bankumsätze existiert.
- Funktion von Speichern, Löschen, Archivieren, Uploads, Synchronisationen,
  Veröffentlichungen, Handelsaktionen — bewusst nicht ausgeführt.

**Offene Entscheidungen**
Acht Punkte, siehe `00-masterplan.md` §5. Kurzform:
1. n8n-Zeitpläne reaktivieren? (alle 4 inaktiv, 0 Ausführungen)
2. Umgang mit den Instagram-Demodaten (kennzeichnen / ausblenden / ersetzen)
3. Mietvertrag `n24-w6-2024`: Status und mögliches Tippfehler-Datum
4. Vier Mieterdatensätze „Jürgen Bickel": zusammenführen oder getrennt lassen
5. Agentenübersicht über den bestehenden n8n-API-Schlüssel aufbauen?
6. Kopfzeile „Hans Dampf": beabsichtigt oder Platzhalter
7. Nebenkosten-Meldungen: deutsche Erklärungen im Dashboard statt im Core — Vorgehen bestätigen
8. SharePoint: Altzeile mit leerem Site-Namen bereinigen?

**Owner-Aufgabe**
Hetzner-Snapshot vor Phase 2 (nur über die Hetzner-Cloud-Konsole auslösbar, kostenpflichtig).
Für Phase 1 nicht erforderlich.

**Commits und Tags**

| Gegenstand | Wert |
|---|---|
| Tag Dashboard-Repo | `pre-dashboard-ueberarbeitung-20261004` → `735d5b8` |
| Tag Workspace-Repo | `pre-dashboard-ueberarbeitung-20261004` → `a86bd2a` |
| Commit Arbeitsdateien (Dashboard) | `1fe1499` — docs(dashboard): Phase 0 … Arbeitsdateien |
| Commit Pointer (Workspace) | `53959c4` — chore(pointer): executive-dashboard 735d5b8 → 1fe1499 |
| Push | beide Repos nach `origin` gepusht, kein Red-Zone-Treffer |

### P1-1 — Aktualität und Statuskonsistenz (Befunde A, B) — 04.10.2026

**Durchgeführt**
- Neuer gemeinsamer Baustein `public/js/datenstand.js` + `public/css/datenstand.css`:
  trennt **Seitenabruf**, **Datenstand** und **letzten erfolgreichen Quellenabgleich**;
  Zustandsvokabular *erreichbar / Daten aktuell / degradiert / Daten veraltet / getrennt /
  unbekannt* mit Symbol **und** Text. Schwelle für „veraltet": 7 Tage (je Bereich überschreibbar).
- Kopfzeile: `stamp()` setzt jetzt „Seite geladen: …" statt „Stand: …". Neue Datenstand-Leiste
  zwischen Navigation und Inhalt (`#datenstandLeiste`), wird von `showTab()` mitgeleert.
- Datenstand-Leiste eingebunden in: **Instagram** (drei Quellen getrennt), **Banking**,
  **SharePoint**, **Status**, **Trading**.
- `loadBanking()` ruft `stamp()` jetzt auf (fehlte bisher komplett, Kopf blieb leer).
  Banking-Datenstand = jüngster `lastSyncAt` über alle Konten, berechnet in
  `bankingRoot.meldeDatenstand()`.
- **B1 behoben** (Core): `index.ts` las `data.ibkr?.connected`, der Trading-Service liefert
  `connected` auf oberster Ebene. Zusätzlich hat die **Live-Prüfung jetzt Vorrang** vor der
  `service_health`-Zeile (vorher `if (!entry) push`, also gewann dauerhaft ein einmal
  geschriebener Zustand). Drei unterscheidbare Ergebnisse: verbunden → `up`,
  erreichbar aber nicht verbunden → `down`, Trading-Service nicht erreichbar → `unknown`.
  Jeder Diensteintrag trägt jetzt `source` (`live`/`db`) und `checked_at`.
- **B2 behoben**: hartcodierter `tokenExpiry: 55` wird nicht mehr gerendert. Die
  Instagram-Token-Anzeige kommt aus derselben Quelle wie der Status-Bereich
  (Core `/api/system-status` → Tabelle `insta_tokens`).
- **Demodaten ausgeblendet** (Owner-Entscheidung Nr. 2): Top-Beiträge, Quick Insights,
  Content-Plan und der komplette Analyse-Unterbereich inklusive des Absatzes unter
  „🤖 KI-Empfehlung" zeigen jetzt den Leerzustand
  „Keine aktuellen Daten – letzter Abgleich 11.05.2026, 18:05".
  `_INSTA_MOCK` bleibt mit Warnkommentar im Code stehen (nichts gelöscht), wird aber nicht
  mehr referenziert.
- KPI-Untertitel im Instagram-Bereich nennen den echten Insights-Stand statt „Ø letzte 30 Tage".
- Tote „↻ Sync"-Schaltfläche im Instagram-Kopf ist jetzt deaktiviert und beschriftet
  „↻ Sync nur per /instasync" — ein klickbarer Sync-Knopf neben „Daten veraltet (146 Tage)"
  war eine falsche Zusage. Owner-Entscheidung Nr. 1: kein Abgleich aus dem Dashboard.
- Status-Bereich: Dienstetabelle mit Zustandsvokabular, Spalte „Herkunft und Prüfzeitpunkt";
  der frühere „uptime"-Wert erscheint nur noch bei Live-Prüfung (bei DB-Zeilen war es das
  Alter der Zeile, keine Laufzeit). „Workflows pending: 0" ist jetzt als „Offene Vorgänge"
  beschriftet mit dem ausdrücklichen Hinweis, dass die leere Vorgangstabelle **kein** Hinweis
  auf den Zustand von n8n ist. Bei ausgefallener Statusquelle erscheint ein Warnblock
  „Statusquelle nicht erreichbar" statt stiller Weiterverwendung des Zwischenspeichers.
- Trading-Bereich: dasselbe Zustandsvokabular wie im Status-Bereich; Paper- bzw.
  Echtgeldkonto wird ausdrücklich benannt (`Paper Trading (kein echtes Geld)` /
  `ECHTGELD-KONTO` / `Kontoart unbekannt`) samt Kontonummer.
- Server: `/api/instagram/media|insights|forensics` liefern jetzt `datenstand` (ISO) und
  `datenstand_quelle` (`inhalt`/`dateizeit`); `/api/dashboard/status` reicht `_cache_alter_s`
  und bei Ausfall `_fehler` durch. Neue lesende Route `/api/sharepoint/sync-status`
  (Dashboard-Proxy + Core-Route in `src/modules/sharepoint/routes.ts`).

**Geänderte Dateien**

| Repo | Datei | Art |
|---|---|---|
| executive-dashboard | `public/js/datenstand.js` | neu |
| executive-dashboard | `public/css/datenstand.css` | neu |
| executive-dashboard | `public/index.html` | geändert |
| executive-dashboard | `public/js/banking-connect.js` | geändert |
| executive-dashboard | `server.mjs` | geändert |
| executive-dashboard | `prompts/dashboard-ueberarbeitung/00-masterplan.md`, `STATUS.md` | geändert |
| executive-agent | `index.ts` | geändert (**Red Zone**) |
| executive-agent | `src/modules/sharepoint/routes.ts` | geändert |

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `node --check server.mjs` | Exit 0 („Build OK") |
| `node --check` auf `datenstand.js`, `banking-connect.js` | Exit 0 |
| Inline-Skript aus `index.html` extrahiert, `node --check` | Exit 0 (3.327 Zeilen) |
| executive-agent `npm run build` (tsc) | Exit 0 |
| executive-agent `npm test` | **645 pass, 0 fail, 0 skip** (57 Testdateien) |
| executive-agent `npm run verify:commands` | 118/118 bidirektional konsistent |
| executive-agent `npm run verify-schema` | ALL OK — no drift |
| executive-agent `npm run lint` | 2 Fehler — **vorbestehend** in `src/pdf-worker.ts:20-21` (`no-deep-module-import`), gegen HEAD gegengeprüft; meine Dateien sind sauber |
| `scripts/smoke-test.ts` | **ALL PASS (31/31)** |
| Gateway- und Dashboard-Restart | beide `active` |
| `GET /health` (18800) | 200 |
| **B1-Gegenprobe:** `18793/health` vs. `/api/dashboard/status` | `connected: true` ↔ `IB Gateway: up`, `source: live`, `checked_at` gesetzt — **konsistent** |
| B1-Zweigtest isoliert (ohne Eingriff in den Trading-Dienst) | echter Dienst → `up`; Port nicht erreichbar → `unknown`; erreichbar mit `connected:false` → `down`; alte Lesart `data.ibkr?.connected` → `undefined` (Ursachenbeleg) |
| **B2-Gegenprobe:** Token-Wert | `/api/dashboard/status` → Meta 59 Tage; Instagram-Kopf liest denselben Wert; kein `${d.tokenExpiry}` mehr im ausgelieferten HTML |
| Statusquelle-Ausfall (Gateway 3 s gestoppt) | `_stale: true`, `_cache_alter_s: 38`, `_fehler: "Core-Statusquelle nicht erreichbar"` → Oberfläche zeigt Warnblock, **nicht** „in Ordnung" |
| Datenstand-Endpunkte | Medien `2026-05-11T16:05:17Z`, Insights `2026-06-27T05:00:18Z`, Forensic `2026-05-08T15:52:49Z`, SharePoint `last_success_at 2026-05-16T17:47:10Z` (12.089 Dateien) |
| `datenstand.js` isoliert getestet | Epoche-ms erkannt; „vor 146 Tagen"; `null` → `unbekannt` (nie „aktuell"); unbekannter Zustandscode fällt auf `unbekannt` zurück; HTML-Einfügeprobe mit `<script>` wird escaped |
| Mock-Renderpfade im ausgelieferten HTML | `d.topPosts`, `d.insights.bestTime`, `d.calendar.map`, `d.followerHistory`, „Deine Reels performen", `${d.tokenExpiry}`, „KW 10–11" → je **0 Treffer** |
| Ausgelieferte neue Dateien | `/js/datenstand.js` 200 (8.184 B), `/css/datenstand.css` 200 (3.349 B) |
| Journal Dashboard und Gateway | keine neuen Fehler |

**Verbleibende Fehler**
Keine aus P1-1. Befunde C–G stehen unverändert offen (Pakete P1-2 bis P1-6).

**Noch nicht verifiziert — CP1 prüfen**
Alles Folgende ist nur im Browser prüfbar und für **Checkpoint 1** vorgemerkt
(Abnahmetabelle `04-abnahme-und-regressionspruefung.md` §2.1):
- **CP1 prüfen:** Kopfzeile zeigt „Seite geladen: …"; Datenstand-Leiste erscheint in
  Instagram, Banking, SharePoint, Status und Trading und verschwindet in den übrigen Bereichen.
- **CP1 prüfen:** Instagram zeigt drei getrennte Datenstände (Medien 146 Tage,
  Insights 99 Tage, Forensic 149 Tage), jeweils mit Symbol und Text.
- **CP1 prüfen:** die fünf ausgeblendeten Instagram-Blöcke zeigen den Leerzustand
  „Keine aktuellen Daten – letzter Abgleich 11.05.2026, 18:05"; kein Absatz erhebt noch
  einen KI-Anspruch.
- **CP1 prüfen:** Banking zeigt den Datenstand 29.06.2026 als veraltet; Seitenkopf nicht mehr leer.
- **CP1 prüfen:** Status-Bereich — Dienstetabelle mit Herkunft und Prüfzeitpunkt lesbar;
  Trading-Bereich und Status-Bereich melden denselben IB-Gateway-Zustand.
- **CP1 prüfen:** Darstellung bei 1440 px und 390 px (die Leiste bekommt ihr mobiles Verhalten
  erst in P2-2; bei 390 px ist mit Umbrüchen zu rechnen).
- **CP1 prüfen:** alle 13 Bereiche öffnen, keine JavaScript-Fehler in der Browser-Konsole.
- **Owner-Prüfung (Entscheidung Nr. 7):** fachliche Richtigkeit der Schweregrad-Zuordnung der
  21 Nebenkosten-Regeln — gehört zu P1-6, wird bei CP1 mitgeprüft.

**Vorbestehende Befunde, nicht Teil von P1-1**
- `npm run lint` im Agent-Repo meldet zwei `no-deep-module-import`-Fehler in
  `src/pdf-worker.ts:20-21`. Gegen HEAD gegengeprüft: vorbestehend, anderes Modul.
- Gateway-Neustart protokolliert gelegentlich
  `Public Location-Server Fehler: listen EADDRINUSE … 127.0.0.1:18790`. Seit 01.09.2026
  **29-mal**, auch bei Neustarts ohne Zusammenhang mit dieser Arbeit (u. a. 28./29.09.,
  03./04.10. zur Backup-Zeit). Der Dienst fängt sich: Port 18790 wird vom laufenden Prozess
  gehalten, `POST /location` antwortet. Vorbestehende Startreihenfolge-Kollision,
  nicht durch P1-1 verursacht, nicht behoben.

**Offene Entscheidungen**
Keine. Alle acht Punkte sind entschieden (`00-masterplan.md` §5).
Offen bleibt die **Owner-Aufgabe** Hetzner-Snapshot vor Phase 2.

**Live-Auswirkung und Rückweg**
- Restart nötig: **ja** — `openclaw-gateway.service` (wegen `index.ts`) und
  `openclaw-dashboard.service` (wegen `server.mjs`). Beide durchgeführt, beide `active`.
- Keine Datenänderung, keine Synchronisation, kein externer Abruf, keine Veröffentlichung.
- Rückweg Dashboard: `git revert <commit>` bzw. nur Frontend
  `git checkout pre-dashboard-ueberarbeitung-20261004 -- public/` + Browser-Reload.
- Rückweg Core: `git revert <commit>` im Agent-Repo, dann `npm run build` und
  `systemctl --user restart openclaw-gateway.service`.

**Commits**

| Repo | Commit | Push |
|---|---|---|
| executive-dashboard | `701763d` feat(dashboard): P1-1 — Datenstand, Zustandsvokabular, Demodaten ausgeblendet | ✅ nach `origin` gepusht |
| openclaw-workspace (Pointer) | `aa3b88b` chore(pointer): 06eb7c5 → 701763d | ✅ nach `origin` gepusht |
| executive-agent | `9481e72` fix(status): IB-Gateway-Zustand live prüfen · `c255833` docs(changelog) | ✅ nach `origin` gepusht (04.10.2026 19:39 UTC, Armed-Flag verbraucht) |
| openclaw-workspace (Pointer executive-agent) | `d2bb8c1` chore(pointer): e76ff43 → c255833 | ✅ nach `origin` gepusht |

**Keine Owner-Aktion offen.** Der Red-Zone-Push für `index.ts` wurde am 04.10.2026 19:39 UTC
mit gesetztem Armed-Flag durchgeführt; das Flag ist verbraucht (Einmalnutzung). Beide
Workspace-Pointer stehen auf dem gepushten Stand.

### P1-2 — Fuhrparkfilter (Befund C) — 04.10.2026

**Durchgeführt**
- Lade- und Fehlerzustand im Fuhrpark von `x-if` auf `x-show` umgestellt. Damit liegt
  das Element mit `x-ref="fleetListContent"` dauerhaft im DOM und kann aus `$refs` nicht
  mehr verschwinden. Die Detailansicht behält `x-if`, weil `fleetDetailView` bei jeder
  Auswahl neu aufgebaut werden muss.
- Zusammengesetzte Bedingungen in Alpine-Methoden ausgelagert (`zeigtLadehinweis()`,
  `zeigtFehler()`, `zeigtListe()`, `zeigtDetail()`, `fehlerText()`) — CLAUDE.md
  Alpine-CSP-Regel 2, keine `&&`-Ausdrücke mehr in `x-show`/`x-if`.
- `_renderList()` bricht nicht mehr still ab: fehlt das Renderziel, erscheint ein
  sichtbarer Fehlerzustand.
- Leerzustand nennt den aktiven Filter, mit Rücksetzen-Schaltfläche. Eigene Texte für
  „Archiviert", „Aktiv" und einen tatsächlich leeren Bestand.
- Neue Trefferzeile „7 Fahrzeuge · Filter: Aktiv"; neue Brücke `fleetSetzeFilter()`.

**Geänderte Dateien:** `public/js/fleet-stores.js`, `public/index.html` (Fuhrpark-Template),
`public/css/datenstand.css` (Trefferzeile)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `node --check` fleet-stores.js und Inline-Skript | Exit 0 |
| Template-Struktur maschinell | Tags balanciert; alle 5 `x-if` mit genau einem direkten Kind |
| Core erneut gegengeprüft | `status=active` 7, `archived` 0, `all` 7 |
| Komponentenlogik isoliert (Node, ohne Browser) | Abfolge Aktiv→Archiviert→Alle→Aktiv→Archiviert→Alle→Aktiv jedes Mal korrekt; während des Ladens Liste ausgeblendet, danach sichtbar; Trefferzeile stimmt |
| Fehlendes Renderziel | setzt Fehlerzustand statt stillem Abbruch |
| Detailansicht/Rückweg | `zeigtListe()`/`zeigtDetail()` schalten korrekt |
| Smoke-Test | ALL PASS (31/31) |

**Noch nicht verifiziert — CP1 prüfen**
- **CP1 prüfen:** die vier Filterwechsel im echten Browser (der Isolationstest deckt die
  Komponentenlogik ab, nicht das Zusammenspiel mit dem Alpine-CSP-Build im DOM).
- **CP1 prüfen:** `?fleet_code=`-Deeplink und Detail-Unterbereiche weiterhin funktionsfähig.
- **CP1 prüfen:** Assets- und Banking-Bereich (gleiches Alpine-Muster) ohne Regression.

**Commit:** `30ac07b` · kein Dienst-Restart nötig (nur `public/`)

---

### P1-3 — Mietvertragsfilter und Suche (Befund D) — 04.10.2026

**Durchgeführt**
- `_filteredLeases()` filtert kombinierbar nach Objekt (`property_code`), Status und
  Freitext. Vorher gab die Methode die Liste ungefiltert zurück.
- `vertraegeFilter()` war eine leere Funktion („Future: implement client-side filtering")
  und ist jetzt implementiert: liest die Bedienelemente in den Alpine-Zustand und ersetzt
  nur Trefferliste und Trefferzeile. Die Bedienelemente bleiben stehen und behalten ihre
  Werte — das Suchfeld verliert beim Tippen weder Inhalt noch Fokus.
- Suche über Mieternamen, Objektname, Objektcode, Einheit und Vertragsnummer.
- Trefferzeile „3 von 17 Verträgen · Objekt N24, Suche ‚Bickel'".
- `vertraegeFilterReset()` in Filterzeile und Leerzustand.
- Leerzustand unterscheidet „Keine Treffer" (nennt die Einschränkung) von
  „Keine Mietverträge erfasst".
- `aria-label` an den drei Bedienelementen.

**Geänderte Dateien:** `public/js/assets-vertraege.js`

**Prüfungen und Resultate** — gegen die echten Core-Antworten (17 Verträge, 6 Objekte)

| Prüfung | Resultat |
|---|---|
| Objekt I83 | 1 Vertrag (`i83-w1-2025`) |
| Objekt N24 / L19 | 7 / 4 |
| Status Aktiv / Beendet / Zukünftig | 17 / 0 / 0 |
| Suche `zzzzAuditKeinTreffer` | 0 Treffer mit Leerzustand |
| Suche „Bickel" (groß/klein) | je 5 |
| N24+„Bickel" / L19+„Bickel" / I83+„Bickel" | 3 / 2 / 0 |
| N24 + Status Aktiv + „Bickel" | 3 — Kombination greift |
| Zurücksetzen | stellt alle 17 wieder her |
| Bedienelemente behalten Werte | Objekt, Status und Suchwert im erzeugten HTML gesetzt |
| HTML-Einfügeprobe mit `<script>` im Suchbegriff | escaped |
| `node --check` | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |

**Hinweis zur Datenlage:** alle 17 Verträge stehen auf `active`. „Beendet" und „Zukünftig"
liefern deshalb korrekt null Treffer — das ist der Bestand, kein Fehler. Der Leerzustand
sagt das jetzt ausdrücklich. Zur Klärung von `n24-w6-2024` siehe Befund H / P2-11.

**Noch nicht verifiziert — CP1 prüfen**
- **CP1 prüfen:** Tippen im Suchfeld behält Fokus und Cursorposition.
- **CP1 prüfen:** schnelle Wechsel zwischen drei Objekten (strukturell ausgeschlossen,
  weil rein im Browser gefiltert wird — am echten System bestätigen).
- **CP1 prüfen:** Zeilenklick öffnet weiterhin das richtige Vertragsdetail.

**Commit:** `f66bfce` · kein Dienst-Restart nötig

---

### P1-4 — SharePoint-Datenzuordnung (Befund E) — 04.10.2026

**Durchgeführt**
- Neue Normalisierungsschicht `spSite()`, `spDrive()`, `spDatei()` — die einzige Stelle im
  Frontend, an der Feldnamen der Quelle vorkommen. Sprint 10 hatte auf `snake_case`
  umgestellt, das Frontend las weiter Graph-`camelCase`.
- `spOeffnenAktion()` verlinkt nur echte Web-Adressen (`http:`/`https:`). Fehlt die Adresse
  oder trägt sie ein anderes Schema, erscheint die deaktivierte Aktion
  „Kein Link verfügbar". Es wird nie mehr ein leerer `href` erzeugt — ein leerer `href`
  lädt die aktuelle Seite neu, genau so entstand der zweite Dashboard-Tab.
- Site- und Bibliotheksnamen werden angezeigt; ein leerer Name erscheint als
  „Name nicht erfasst". Die Altzeile mit derselben `site_id` ist als
  „Alteintrag mit derselben Site-Kennung" gekennzeichnet — nur angezeigt, nicht bereinigt
  (Owner-Entscheidung Nr. 8).
- Änderungsdatum aus `last_modified_at`; Ordnerpfad aus `path` unter dem Dateinamen.
- Sortierung arbeitet auf den normalisierten Feldern; vorher war die Datumssortierung
  wirkungslos.
- Ordner-Navigation entfernt (der Core liefert eine flache Liste; `isFolder` existiert
  nicht, die Zweige liefen nie an). Download-Schaltfläche entfernt (`downloadUrl`
  existiert nicht, sie erschien nie).
- Die Serverbegrenzung wird benannt: „100 Einträge angezeigt von 11.160 im Index".
- HTML-Einfügelücke bei `h.summary` (ohne `esc()`) geschlossen.

**Geänderte Dateien:** `public/index.html` (SharePoint-Bereich), `public/css/datenstand.css`

**Prüfungen und Resultate** — gegen die echten Core-Antworten

| Prüfung | Resultat |
|---|---|
| Bestand | 4 Sites, 2 Bibliotheken, 100 Dateien (von 11.160), 25 Suchtreffer |
| `href=""` in Sites/Bibliotheken/Dateien/Suche | **0** |
| Dateiliste | 100/100 mit „Öffnen ↗", 0 „Kein Link verfügbar", 0 Zeilen mit „–" als Datum, 100 Zeilen mit Pfad |
| `undefined` im erzeugten HTML | keines |
| Datei ohne `web_url` | „Kein Link verfügbar", kein leerer `href` |
| Datumssortierung | kehrt um (desc 2026-01-18, asc 2021-01-04) |
| Gleichnamige Dateien | `0001_Rechnung.pdf` 2× mit unterschiedlichem Ordner (…/2024, …/2025) |
| Suche „Mietvertrag" | 25 Treffer inkl. „I83 Mietvertrag Cambier-Jacobs.pdf" |
| Suche ohne Treffer | „Keine Ergebnisse" |
| Einfügeprobe `<script>`, `<img onerror>`, `javascript:` | escaped bzw. nicht verlinkt |
| `node --check` Inline-Skript | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |

**Noch nicht verifiziert — CP1 prüfen**
- **CP1 prüfen:** drei Stichproben verschiedener Dateiarten (PDF, Office, Bild) öffnen im
  Browser tatsächlich das Dokument in SharePoint — der Isolationstest prüft nur, dass die
  Adresse korrekt in den `href` gelangt.
- **CP1 prüfen:** kein Klick auf „Öffnen" lädt das Dashboard neu.
- **CP1 prüfen:** Upload-Dialog weiterhin funktionsfähig (nur öffnen und abbrechen, kein
  Upload zu Testzwecken).
- **CP1 prüfen:** Dokumenten-Verknüpfungen „📎" in Kalender, Fuhrpark und Assets — die
  nutzen `l.spWebUrl` aus `/api/links` und sind nicht betroffen, trotzdem Stichprobe.

**Commit:** `94f49ea` · kein Dienst-Restart nötig

---

### P1-6 — Nebenkosten: Schweregrade und Meldungen (Befund G) — 04.10.2026

**Durchgeführt**
- Drei Lesefehler behoben: Vergleich gegen `'blocking'` statt `'blocker'` (jeder Blocker
  erschien als „Info"), `f.detail` statt `message` (Beschreibung immer leer) und die
  nie erscheinende „Beheben"-Schaltfläche (verlangte `suggested_action`, `display_id`,
  `entity_id` — Felder, die der Core nicht liefert).
- Neue Datei `public/js/nk-befunde.js`: Zuordnung für **alle 21** Prüfcodes aus
  `precheck.ts` mit Titel, Ursache, Auswirkung und nächstem Schritt auf Deutsch.
- Unbekannter Schweregrad wird „unbekannter Schweregrad", nicht „Info".
- Die `details` des Core erscheinen als Klartextzeile („Einheit (ID): 27"); die englische
  Originalmeldung bleibt als Quellenangabe sichtbar.
- Unbekannte Prüfcodes werden nicht verschluckt.
- Zielansichten über `nkBeheben()` in vorhandene Ansichten; 20 von 21 Codes haben ein
  Ziel. Neue Brücke `assetsSwitchSubTab()`, weil die Deeplinks vorher nur
  `vertraegeSwitch()` riefen und damit aus dem Nebenkosten-Unterbereich unsichtbar blieben.
- Readiness-Matrix zeigt den benannten Zustand („2 Blocker") plus sichtbare
  Aufschlüsselung; vorher nackte Zahl mit Erklärung nur im `title` (Hover).
  `.nk-badge` war ein 24×24-Kreis und ist jetzt eine mitwachsende Pille.
- „Keine Pflichten" von „nicht eingerichtet" und „Ladefehler" getrennt — in Pre-Check,
  §556-Pflichten und Matrix-Detailansicht, jeweils mit Wiederholungsschaltfläche.

**Geänderte Dateien:** `public/js/nk-befunde.js` (neu), `public/js/assets-nebenkosten.js`,
`public/js/assets-status.js`, `public/css/assets.css`, `public/css/datenstand.css`,
`public/index.html` (Skript-Einbindung). **`precheck.ts` unangetastet.**

**Prüfungen und Resultate** — gegen die echten Core-Antworten, alle sechs Objekte, Jahr 2025

| Prüfung | Resultat |
|---|---|
| Abdeckung | 21 von 21 Prüfcodes mit Ursache, Auswirkung und Schritt |
| Schweregrad | `blocker`→Blocker, `warning`→Warnung, `info`→Hinweis; `blocking`/``/`null`→„unbekannter Schweregrad" |
| Blocker im Bestand | 13, **alle** korrekt als Blocker; **0** fälschlich als Info/Hinweis |
| D4/2025 | Ampel „3 Blocker"; alle drei Einzelbefunde mit Abzeichen Blocker, deutschem Titel, Ursache, Schritt und Zielansicht |
| Ampeltexte | L19 2/5/2, N24 2/7/2, MG24 2/4/0, S28 2/3/0, I83 2/1/0 — Einzahl/Mehrzahl korrekt |
| Details | 6× Einheit-ID bei N24, 2× Mietvertrag plus Einheit |
| unbekannter Code | Code, Schweregrad und Originalmeldung bleiben sichtbar |
| Aktion ohne Objektcode | erzeugt keine Schaltfläche |
| HTML-Einfügeprobe in `code`, `message`, `details` | alles escaped |
| `node --check` alle JS + Inline | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |

**Noch nicht verifiziert — CP1 prüfen**
- **CP1 prüfen:** mindestens zwei „Beheben"-Schaltflächen führen im Browser in die
  richtige Zielansicht (Unterbereichswechsel plus Schubfach).
- **CP1 prüfen:** Readiness-Matrix bei 1440 px und 390 px lesbar; Erklärung ohne Hover.
- **CP1 prüfen:** Vorschau bleibt bei allen sechs Objekten gesperrt.
- **CP1 prüfen:** Unterbereiche „Vorschau", „Runs & Statements" und „§556-Pflichten"
  weiterhin bedienbar; Audit-Viewer unverändert.
- **Owner-Prüfung (Entscheidung Nr. 7):** fachliche Richtigkeit der Schweregrad-Zuordnung
  der 21 Regeln.

**Commit:** `4ff083e` · kein Dienst-Restart nötig

---

### P1-5 — Kalender: Zeitzone, Ganztagstermine, Enddatum (Befund F) — 05.10.2026

**Richtigstellung zur Auftragsannahme.** Der Termin „Meetup INHALE in Südtriol" ist
**kein Ganztagstermin**. Graph meldet `isAllDay: false`; es ist ein zeitgebundener Termin
von 23,5 Stunden. Richtig ist **06.10.2026, 00:00–23:30 Europe/Berlin**. Damit war das
**Dashboard falsch** („05.10. 22:00–21:30") und das **Briefing inhaltlich richtig**
(„Di 06.10. 00:00 (23.5h)") — aber nur, weil dieser Server auf `Etc/UTC` läuft. Beide Pfade
hingen an der Zone der Laufzeitumgebung; beide sind jetzt davon unabhängig.

**Ursache, am Code belegt**
Graph liefert `start.dateTime = "2026-10-05T22:00:00.0000000"` mit `timeZone: "UTC"` — ein
naiver String **ohne** Zonensuffix. `new Date(string)` interpretiert ihn in der Zone der
Laufzeitumgebung: im Browser (Europe/Berlin) um zwei Stunden verschoben und auf dem falschen
Kalendertag, auf dem Server (Etc/UTC) zufällig richtig.

**Durchgeführt**
- Neue Datei `public/js/zeit.js` (Dashboard) und neuer Abschnitt „Kalender-Zeitlogik" in
  `executive-agent/index.ts` (Briefing). Beide werten die mitgelieferte Zone aus, DST-fest
  über `Intl`. **Kein** `Prefer: outlook.timezone`-Kopf — eine Stelle, nicht zwei.
- `isAllDay` wird respektiert: Anzeige „ganztägig" ohne Uhrzeit, mit Graph-Semantik des
  **exklusiven** Endes. Im Briefing war `isAllDay` bisher nicht einmal abgefragt.
- `end` wird ausgewertet: Mehrtagestermine als Spanne, Dauer genannt, ein Ende vor dem
  Beginn wird benannt statt stillschweigend repariert.
- Tagesgruppierung nach dem Berliner Kalendertag; Ganztagstermine im Tag zuerst.
- Zeitzone sichtbar benannt („Alle Zeiten in Europe/Berlin").
- Formular: Start- **und** Enddatum plus Ganztags-Option; bei ganztägigen Terminen gilt das
  Enddatum einschließlich und wird auf den exklusiven Folgetag umgerechnet. Vorher gab es
  nur **ein** Datumsfeld und das Ende wurde mit dem **Startdatum** zurückgeschrieben.
- `server.mjs` prüft POST und PATCH: `end <= start` → 400; ganztägig ohne Mitternacht → 400.
- Abfragefenster beginnt um Mitternacht Europe/Berlin — in **beiden** Pfaden, damit
  Dashboard und Briefing vergleichbar sind.
- Online-Meeting als Aktion „Teilnehmen", nur bei `https`. Wird auch erkannt, wenn der Link
  im Ortsfeld steht (im Bestand eine Google-Meet-Adresse).
- Terminkarte als Raster, mobil untereinander (680 px), lange Beschreibungen begrenzt.
  Nur die Terminkarte — das allgemeine mobile Raster macht P2-2.

**Geänderte Dateien**

| Repo | Datei | Art |
|---|---|---|
| executive-dashboard | `public/js/zeit.js` | neu |
| executive-dashboard | `public/index.html` | Kalenderbereich und CSS |
| executive-dashboard | `server.mjs` | Fenster, Validierung, `isAllDay` |
| executive-agent | `index.ts` | **Red Zone** — Kalender-Zeitlogik und Briefing-Block |
| executive-agent | `dist/index.js`, `docs/CHANGELOG.md` | Build-Artefakt, Doku |

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| Graph-Rohantwort gesichert | vier Termine; INHALE `isAllDay: false`, 22:00Z → 21:30Z |
| INHALE nach dem Fix | **06.10.2026, 00:00–23:30, 23,5 Std.** |
| Training Bernd 04:45Z / TobaGrown 12:00Z | 06:45–07:45 / 14:00–15:00 |
| Negative Dauer in der Wochenliste | keine |
| Ganztags 1 Tag / 3 Tage | „ganztägig, 1 Tag" / Spanne 20.10.–22.10., 3 Tage |
| Zeitumstellung 25.10.2026 | beide Richtungen korrekt |
| Formularwerte → Nutzlast → Anzeige | verlustfrei für alle vier Muster |
| Nutzlast weist ab | Ende vor Beginn, Ende gleich Beginn, Enddatum vor Startdatum, fehlende Pflichtfelder |
| Serverseitige Abwehr | `end <= start` → 400; ganztägig ohne Mitternacht → 400 |
| Meeting-Link | `https` verlinkt; `http`, `javascript:`, `data:`, leer abgewiesen |
| **Gleichheitstest Core ↔ Dashboard** | **12 Termine, 0 Abweichungen** (4 echte + 8 Grenzfälle) |
| Vergleichstabelle Dashboard ↔ Briefing | 5 Termine, durchgängig identisch (Tabelle im Report) |
| `node --check` server.mjs, alle JS, Inline-Skript | Exit 0 |
| Core `npm run build` / `npm test` / `verify:commands` / `verify-schema` | Exit 0 / 645 pass, 0 fail / 118/118 / ohne Drift |
| Smoke-Test | ALL PASS (31/31) |
| Dienste | `openclaw-dashboard` und `openclaw-gateway` neu gestartet, beide `active`, `/health` 200 |

**Schreibtest — der einzige der Phase 1**

| Schritt | Ergebnis |
|---|---|
| Testtermin „[TEST P1-5 – wird gelöscht]" am 20.10.2026 ganztägig über die Formular-Nutzlast angelegt | HTTP 201; Graph: `isAllDay: true`, 20.10.T00:00 → 21.10.T00:00 Europe/Berlin |
| Anzeige daraus | „ganztägig", 1 Tag, Spanne 20.10. |
| über die Formular-Nutzlast auf 20.–21.10. verlängert | HTTP 200; Graph: end 22.10.T00:00 |
| Anzeige daraus | „ganztägig", **2 Tage**, Spanne 20.10.–21.10. |
| gelöscht | HTTP 200 |
| **per Graph bestätigt** | `GET /events/<id>` → **HTTP 404**; Suche im Fenster 18.–25.10. → **0 Treffer** mit „TEST P1-5" |
| Bestandstermine | nachweislich unverändert (fünf Termine, Rohwerte vorher/nachher gleich) |

Kein bestehender Termin wurde bearbeitet. Keine Einladung, keine Absage, keine Nachricht.

**Noch nicht verifiziert — CP1 prüfen**
- **CP1 prüfen:** Kalenderliste im Browser — INHALE unter Dienstag, 6. Oktober 2026 mit
  „00:00–23:30 · 23,5 Std."; Zeitzonenhinweis sichtbar.
- **CP1 prüfen:** Bearbeitungsformular an einem Bestandstermin **öffnen und mit Abbrechen
  schließen** — Start- und Enddatum sowie die Ganztags-Option richtig vorbelegt, Istzustand
  oben korrekt. Nicht speichern.
- **CP1 prüfen:** Ganztags-Schalter blendet die Zeitfelder aus und wieder ein.
- **CP1 prüfen:** Schaltfläche „Teilnehmen" öffnet die Teams-Besprechung bzw. den
  Google-Meet-Raum in einem neuen Tab.
- **CP1 prüfen:** Terminkarte bei 390 px ohne Überlauf, Titel vollständig lesbar.
- **Owner-Beobachtung:** der tatsächlich versandte Briefing-Text. Das Briefing schickt eine
  Telegram-Nachricht; nach Spec §1 wurde dafür **kein** Testversand ausgelöst. Der
  Kalenderblock wurde stattdessen aus dem Core-Code heraus gegen die echte Graph-Antwort
  erzeugt und mit der Dashboard-Darstellung verglichen (Report §6). Beim nächsten regulären
  Briefing ist zu prüfen, dass der Block so aussieht.

**Vorbestehender Nebenbefund — Trip-Segment-Kalendersynchronisation**
Nur lesend geprüft, wie vom Paket vorgesehen (`server.mjs`, `POST /api/trips/:tripId/segments/:segId/calendar`).
Sie hat **nicht** denselben Fehler: `new Date(startDt)` wird zwar naiv geparst, aber die
berechnete Endzeit wird mit derselben Zonenangabe zurückgeschrieben, in der der Start
angegeben ist — die Verschiebung hebt sich auf, die Dauer stimmt. **Eine Restunsicherheit
bleibt:** bei Hotelsegmenten (+24 Stunden) über die Zeitumstellung hinweg entspricht die
Wandzeit-Arithmetik nicht der echten Dauer. Nicht angefasst, hier vermerkt.

**Commits und Push**

| Repo | Commit | Push |
|---|---|---|
| executive-dashboard | `8586ed0` fix(calendar) · `e5fdcea` docs(STATUS) | ✅ `origin/master` |
| executive-agent | `5f65c4b` fix(briefing) | ✅ `origin/master` (05.10.2026 07:30 UTC, Armed-Flag verbraucht) |
| openclaw-workspace | `a16abb1`, `816015b` chore(pointer) | ✅ `origin/main` |

Restart: Dashboard **und** Gateway, beide durchgeführt.
**Keine Owner-Aktion zum Push offen** — beide Workspace-Pointer stehen auf dem gepushten Stand.

---

### Offen nach diesem Bündel

- **P1-5 ist seit 05.10.2026 erledigt** (eigener Eintrag oben). Damit ist Phase 1
  vollständig und CHECKPOINT 1 abnahmefähig.
- Der Schreibtest aus P1-5 war die einzige echte Mutation der Phase 1; er ist protokolliert
  und der Testtermin per Graph als gelöscht bestätigt.

### Vorbestehende Befunde, nicht Teil dieses Bündels

- Neue Oberflächentexte in `fleet-stores.js` und `assets-vertraege.js` verwenden weiterhin
  die ASCII-Umschrift des Umfelds („zuruecksetzen", „Vertraege"). Die Umstellung auf echte
  Umlaute macht **P2-8** für alle Bereiche in einem Zug; eine Teilmigration jetzt hätte
  die Dateien inkonsistent gemacht.
- Die Spalte „Typ" in der Mietvertragstabelle zeigt weiterhin den Rohwert
  (`residential`/`temporary`) — Übersetzung ebenfalls P2-8.
- `fleet-detail.js` hat dasselbe `x-ref`-in-`x-if`-Muster wie vormals `fleetRoot`, aber
  **nicht** den Fehler: `switchTab()` rendert synchron und setzt `loading` nicht.
  Der Teilbaum wird dabei nicht abgebaut. Nicht angefasst, hier vermerkt.
- `/api/sharepoint/download` in `server.mjs` wird vom Frontend nicht mehr aufgerufen
  (die Route erwartet eine Graph-Preauth-Adresse, die der Core nicht liefert). Die Route
  bleibt bestehen; Entfernen wäre außerhalb des Pakets.

### CHECKPOINT 1 — Browserprüfung durch den Owner — 05.10.2026, 09:30–09:50 UTC

**Ergebnis: bestanden.** Die Befunde **A bis G** sind in der Oberfläche als behoben bestätigt.
Die Darstellung bei 390 px entspricht dem erwarteten Zwischenstand — das mobile Raster ist
ausdrücklich Gegenstand von **Phase 2** (P2-2 bis P2-4) und war in Phase 1 kein Ziel.

Vier Nachbesserungen aus der Prüfung, alle am 05.10.2026 erledigt:

| Nr. | Befund | Behandlung |
|---|---|---|
| 1 | SharePoint „Öffnen ↗" löste bei einer PDF einen **Download** aus statt die Anzeige im Browser | behoben — Link-Builder erzeugt jetzt die Ansichts-Adresse |
| 2 | Objekt-Schubfach (Assets, z. B. D4) blieb beim Wechsel des Hauptbereichs **offen** | behoben — `showTab()` schließt Schubfach und Dialog |
| 3 | Kalender zeigte die Outlook-Trennlinie `________________` aus dem Mail-Body | behoben — Trennlinien werden in der Vorschau gefiltert |
| 4 | Umlaut-Umschrift („Vertraegen", „NK-Readiness Uebersicht") | **nur dokumentiert** — gehört zu P2-8, dort für alle Bereiche in einem Zug |

---

### CP1-N — Nachbesserung aus CHECKPOINT 1 — 05.10.2026

#### (1) SharePoint: Ansichts-Adresse statt Datei-Adresse

**Diagnose.** Gemessen an 125 Dateien des Bestands trägt `web_url` zwei Formen:

| Form | Anzahl | Beispiel |
|---|---|---|
| reine **Datei-Adresse** ohne Query | 123 | `…/Freigegebene%20Dokumente/12-I83/….pdf` |
| bereits eine **Ansichts-Adresse** (Office-Dokumente) | 2 | `…/_layouts/15/Doc.aspx?sourcedoc={GUID}&action=default` |

Kein `?download=1`, kein `_layouts/download.aspx`. Die reine Datei-Adresse ist ein
**Datei-Endpunkt** — deshalb lädt der Browser herunter. Pfadpräfixe: 124× `/sites/…`,
1× `/personal/…`; keine Datei mit `&`, `#` oder `?` im Pfad.

**Welche Form öffnet die Ansicht?** Nachgemessen mit `curl` (unangemeldet, daher 403 bzw.
302 — die **Art des Endpunkts** ist aber eindeutig):

| Adresse | HTTP | Content-Type | Redirect |
|---|---|---|---|
| Datei-Adresse | 403 | `text/plain` | — |
| Datei-Adresse + `?web=1` | 403 | `text/plain` | — (**keine Wirkung**) |
| `…/_layouts/15/onedrive.aspx?id=…` | 403 | `text/plain` | — |
| **`…/_layouts/15/Doc.aspx?sourcedoc=<Pfad>&action=default`** | **302** | **`text/html`** | **`…/_layouts/15/doc2.aspx?…`** |

Zusätzlich über Graph geprüft: `POST /drives/{id}/items/{id}/preview` liefert eine
Einbettungsadresse unter `…/_layouts/15/embed.aspx` mit Einmal-Token — als dauerhafter Link
in der Oberfläche nicht brauchbar, bestätigt aber die Viewer-Fläche des Mandanten.

**Fix** in `spDatei()` / neue Funktion `spAnsichtUrl()` / `spOeffnenAktion()` — **nur im
Dashboard**, kein Core-Schema angefasst. Aus der Datei-Adresse wird
`<Site-Basis>/_layouts/15/Doc.aspx?sourcedoc=<serverrelativer Pfad>&action=default`.
Site-Basis ist das erste Pfadsegmentpaar (`/sites/…`, `/teams/…`, `/personal/…`).
Trägt die Adresse schon eine Query oder passt das Muster nicht, bleibt sie unverändert.

**Verifikation der erzeugten Links** (fünf Dateitypen):

| Typ | vorher (Datei-Adresse) | jetzt (Ansichts-Adresse) |
|---|---|---|
| pdf | 403 `text/plain` | **302 → `doc2.aspx`, `text/html`** |
| jpg | 403 `text/plain` | **302 → `doc2.aspx`, `text/html`** |
| mp4 | 403 `text/plain` | **302 → `doc2.aspx`, `text/html`** |
| doc | 302 → `doc2.aspx` | 302 → `doc2.aspx` (**unverändert**, war schon Viewer) |
| docx | 302 → `doc2.aspx` | 302 → `doc2.aspx` (**unverändert**) |

`Content-Disposition: attachment` kommt in keiner Antwort vor. Die Schaltfläche heißt
weiterhin **„Öffnen ↗"** — das ist jetzt zutreffend, weil der Link nachweisbar auf eine
Viewer-Seite führt. Eine Umbenennung in „Herunterladen ↓" war damit nicht nötig.

**CP1 prüfen (Restunsicherheit):** die endgültige Browserdarstellung ist nur **angemeldet**
prüfbar. Unangemeldet antwortet SharePoint mit 403 bzw. 302, ohne
`Content-Disposition` zu zeigen. Belegt ist der Wechsel der Endpunktart von Datei auf
Viewer-Seite — dass die PDF dann in der Vorschau erscheint, bitte beim nächsten Klick
bestätigen.

#### (2) Objekt-Schubfach beim Bereichswechsel schließen

`showTab()` leerte Kopfzeile, Datenstand-Leiste und Inhalt, nicht aber die über
`document.body` eingehängten Überlagerungen. Das Objekt-Schubfach der Assets
(`#drawer-overlay`, erzeugt in `assets-stores.js:534`) blieb deshalb offen und lag über dem
neuen Bereich. `showTab()` ruft jetzt `closeDrawer()` und `closeModal()`; der Aufruf von
`closeDrawer` ist mit `typeof`-Prüfung abgesichert, weil die Funktion aus einer
`defer`-Datei stammt.

#### (3) Kalender: Outlook-Trennlinie in der Vorschau filtern

Graph liefert in `bodyPreview` den Mail-Body der Einladung mit. Im Bestand beginnt der
Teams-Termin mit 80 Unterstrichen; weil Graph die Vorschau kürzt, bleibt vom zweiten
Trennstrich ein einzelnes `_` am Ende übrig — beides war in der Terminkarte zu sehen.

Neue Funktion `kalenderBeschreibung(ev, maxLaenge)` in `public/js/zeit.js`. Entfernt werden
Zeilen, die ausschließlich aus Trennzeichen bestehen (`_ - = ~ *`), ab zehn Zeichen,
zusätzlich die **letzte** Zeile, wenn sie nur aus solchen Zeichen besteht. **Nur die
Anzeige** — die Daten bleiben unberührt.

| Eingabe | Ausgabe |
|---|---|
| 80 Unterstriche, dann Inhalt (echter Termin) | `Microsoft Teams-Besprechung · Teilnehmen: … · Besprechungs-ID: …` |
| nur eine Trennlinie | `""` |
| 9 Unterstriche mitten im Text | **bleibt** (`Zeile A · _________ · Zeile B`) |
| 10 Unterstriche mitten im Text | entfernt (`Zeile A · Zeile B`) |
| einzelnes `_` am Ende | entfernt (`Zeile A`) |
| Bindestrich-Linie (10×) | entfernt |
| leer / nur Leerzeilen | `""` |

**Beobachtung, keine Änderung:** die Vorschau enthält bei Teams-Einladungen weiterhin
Besprechungs-ID und Passcode, weil Graph sie in `bodyPreview` liefert. Das war vorher
genauso; es sind die eigenen Termindaten des Owners auf dem eigenen, tokengeschützten
Dashboard. Falls das nicht in der Kartenvorschau stehen soll, wäre das eine eigene
Entscheidung — nicht Teil dieser Nachbesserung.

#### (4) Umlaut-Umschrift — nur dokumentiert

„Vertraegen" (Trefferzeile Mietverträge), „NK-Readiness Uebersicht", „Zukuenftig",
„Zaehler", „zuruecksetzen" und weitere Stellen in `assets-*.js` und `fleet-*.js` verwenden
die ASCII-Umschrift des jeweiligen Dateiumfelds. **Bekannt und bewusst nicht geändert** —
die Umstellung auf echte Umlaute macht **P2-8** für alle Bereiche in einem Zug; eine
Teilmigration jetzt hätte die Dateien inkonsistent gemacht. In den neuen Dateien
(`zeit.js`, `datenstand.js`, `nk-befunde.js`) stehen durchgängig echte Umlaute.

**Geänderte Dateien:** `public/index.html` (SharePoint-Linkbauer, `showTab`,
Kalender-Beschreibung), `public/js/zeit.js` (`kalenderBeschreibung`)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `node --check` server.mjs, alle `public/js/*.js`, Inline-Skript | Exit 0 |
| Linkbauer über sieben Adressformen | Datei-Adresse → Ansichts-Adresse; schon-Viewer, fremdes Muster → unverändert; `javascript:` und leer → kein Link |
| `curl` auf die erzeugten Links, fünf Dateitypen | pdf/jpg/mp4 von 403 `text/plain` auf **302 → Viewer, `text/html`**; doc/docx unverändert |
| `Content-Disposition: attachment` | in keiner Antwort |
| `showTab()` schließt Schubfach und Dialog | im Code belegt |
| Beschreibungsfilter, sieben Grenzfälle | alle wie erwartet |
| Smoke-Test | ALL PASS (31/31) |
| Auslieferung `/js/zeit.js`, `/index.html` | HTTP 200 |
| Dienste | unverändert `active` — **kein Restart**, nur `public/` betroffen |

**Noch nicht verifiziert — beim nächsten Klick bestätigen**
- **CP1 prüfen:** eine PDF öffnet sich in SharePoint in der Vorschau statt als Download
  (angemeldet; serverseitig ist nur der Wechsel der Endpunktart belegt).
- **CP1 prüfen:** Objekt-Schubfach ist nach einem Bereichswechsel geschlossen.
- **CP1 prüfen:** Terminkarte des Teams-Termins ohne Unterstrich-Linie.

**Live-Auswirkung:** nur Anzeige, nur `public/`. Kein Dienst-Restart, Browser-Reload genügt.
**Rückweg:** `git revert <commit>` bzw. `git checkout <tag> -- public/`.

**Commit:** `aa40c12` · kein Dienst-Restart nötig

---

## Vorlage für die nächsten Einträge

```
### P1-x — <Thema> — <Datum>

**Durchgeführt**
-

**Geänderte Dateien**
-

**Prüfungen und Resultate**
| Prüfung | Resultat |
|---|---|
| npm run build | |
| grep -n "x-if" … | |
| Abnahme <Nr.> | |

**Verbleibende Fehler**
-

**Noch nicht verifiziert**
-

**Offene Entscheidungen**
-

**Live-Auswirkung und Rückweg**
- Restart nötig: ja/nein
- Rückweg: git revert <commit>

**Commit:** <hash>
```
