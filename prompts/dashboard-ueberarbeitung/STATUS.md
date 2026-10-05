# STATUS — Dashboard-Überarbeitung

Fortschreiben nach **jedem** Arbeitspaket. Keine Erfolgsmeldung ohne tatsächliches Prüfergebnis.

**Letzte Aktualisierung:** 05.10.2026, 12:55 UTC
**Aktuelle Phase:** **Phase 2 begonnen** — CHECKPOINT 1 am 05.10.2026 extern freigegeben,
Hetzner-Snapshot liegt vor. **P2-1 (helles Design) ist erledigt.**
**Nächster Schritt: P2-2** (Navigation und mobile Grundstruktur).
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
| P2-1 | Helles Design | M | **erledigt** | `b892e21` | Report `~/bikosoc-spec/report-dashboard-p2-1-1255.md` |
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

### CHECKPOINT 1 — extern freigegeben — 05.10.2026

Die unabhängige Prüfung ist abgeschlossen, die Freigabe für Phase 2 liegt vor.
Der **Hetzner-Snapshot** als Owner-Aufgabe vor Phase 2 ist erstellt (Masterplan §6).

**Owner-Entscheidung Nr. 9 (Nachtrag, Masterplan §5):** Das Nebenkosten-Modul einschließlich
der Schweregradlogik in `src/modules/nk/precheck.ts` wird **separat weiterentwickelt** und
**blockiert Phase 2 nicht**. Der bisher für Checkpoint 1 vorgemerkte Owner-Prüfpunkt zur
fachlichen Richtigkeit der 21 Regeln entfällt damit aus dem Checkpoint-Ablauf.

---

### P2-1 — Helles Design: Farb- und Typografiebasis — 05.10.2026

Umfang ausschließlich Farbe, Typografie und Oberflächen. **Kein Layout** — Raster,
Navigation, Tabellenumbruch und Dialogaufbau bleiben P2-2 bis P2-4 vorbehalten.

**Durchgeführt**

1. **Helle Palette.** Der `:root`-Block in `public/index.html` trägt jetzt ein helles Schema:
   Seitenhintergrund `#f5f6f8`, Inhaltsflächen weiß, Text `#1a1d23`, Trennlinien `#e2e5ea`,
   zurückhaltende Schatten, **ein** Akzent — derselbe Blauton wie vorher, auf
   Hell-Kontrast gebracht (`#4f9cf9` → `#1668c7`). Zusätzlich `color-scheme: light`, damit
   auch vom Browser gezeichnete Teile (Datums- und Zeitwähler, Bildlaufleisten) hell bleiben.
2. **Alle Rohfarben auf Rollen umgestellt.** 115 token-fremde Werte (34 Hex, 81 `rgba()`)
   in sechs Dateien ersetzt; neue Rollen ergänzt statt Einzelwerte zu verstreuen:
   `--surface-2`, `--border-soft`, `--border-strong`, `--text-soft`, `--accent-weak`,
   `--accent-dark`, `--on-accent`, `--green/-weak`, `--yellow/-weak`, `--red/-weak`,
   `--orange/-weak`, `--violet`, `--row-hover`, `--overlay`, `--shadow`, `--shadow-lift`.
   Vollständige Ersetzungsliste im Report §3.
3. **Diagramme.** Gitterlinien von `--surface-2` (auf Weiß unsichtbar) auf `--border`;
   HRV-Linie `--violet`, Readiness-Sparkline `--orange`; Schlafbalken grün/amber/rot aus den
   Statusrollen, Deckkraft von 0,75 auf 0,9 angehoben, weil Transparenz auf Weiß auswäscht;
   Achsenbeschriftung 10 px → 11 px. `_instaMiniSvg()` hängte eine Hex-Alpha an den Farbwert
   (`${color}15`) — mit `var(--…)` ungültig, jetzt `fill-opacity`.
4. **Alle Bereiche mit umgestellt**, auch die Alpine-Bereiche (Fuhrpark, Assets, Banking),
   Dialoge, Schubfächer, Formulare, Tabellen, Abzeichen und Schaltflächen. Formularfelder
   stehen jetzt weiß mit sichtbarem Rahmen (`--border-strong`, ≥ 3:1) statt auf der
   Seitenfläche. Die neutrale Schaltfläche hat eine eigene Fläche statt der
   Browser-Standardfarbe.
5. **Schriftgrößen.** 183 Stellen von 9–12 px auf 13 px angehoben, 9 bewusst belassen
   (Abzeichen und Spaltenköpfe — Beschriftung, kein Fließtext). Fließtext bleibt 14 px.
6. **Fokus-Ringe.** Die acht `outline: none` ohne Ersatz sind entfernt; ein globaler
   `:focus-visible`-Ring in der Akzentfarbe ersetzt sie. `:focus-visible` statt `:focus`,
   damit ein Mausklick keinen Ring hinterlässt.

Kein Dark Mode, kein Umschalter.

**Geänderte Dateien:** `public/index.html`, `public/css/assets.css`,
`public/css/entity-tile.css`, `public/css/wiki.css`, `public/css/datenstand.css`,
`public/js/assets-nebenkosten.js`, `public/js/assets-stammdaten.js`,
`public/js/assets-status.js`, `public/js/assets-vertraege.js`, `public/js/assets-wizard.js`,
`public/js/banking-connect.js`, `public/js/fleet-detail.js`, `public/js/nk-befunde.js`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| Kontrast der Token-Paare (WCAG 2.1, eigenes Skript) | **35 Paare, 0 Unterschreitungen** |
| **Kontrast im gerenderten DOM**, 13 Bereiche, berechnete Farben | **0 Unterschreitungen** — jeder Textknoten gegen seine tatsächliche Fläche, Ziel 4.5:1 bzw. 3:1 bei großer Schrift |
| Dunkle Restflächen, 13 Bereiche + 4 Assets-Unterbereiche + Anmeldung | **0** |
| Dunkle Restflächen in Dialogen, Schubfächern, Instagram-Unterbereichen, Wiki-Seite, SharePoint-Dateiliste, NK-Pre-Check (13 weitere Ansichten) | **0** |
| Bildschirmfotos (Chromium 1440 px), mittlere Helligkeit | 0,83–0,97 „hell"; die drei Dialogaufnahmen 0,66–0,71, weil die Überlagerung die Seite dahinter abdunkelt — der Dialog selbst ist weiß |
| Rohfarben außerhalb des Token-Blocks | **2 Treffer, beides keine Farben**: `rgba()` im erklärenden Kommentar und `&#228;` (HTML-Entität für „ä") in „Verträge & Kosten" |
| `npm run build` | Exit 0 |
| `node --check` alle `public/js/*.js` und Inline-Skript | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |
| Dienste | unverändert `active` — **kein Restart**, nur `public/` betroffen |

**Unterwegs behobene Folgefehler der Umstellung**
- `.wiki-badge-file` und `.wiki-badge-warn` waren nach der ersten Zuordnung Volltonflächen
  mit geerbter dunkler Schrift — jetzt Tönung als Fläche, Volltonfarbe als Schrift.
- `--shadow-lift` ist ein vollständiger `box-shadow`-Wert; zwei Stellen hatten ihn als
  Farbe hinter `0 4px 12px` gesetzt und wären ungültig gewesen.
- Fortschrittsbalken mit `opacity: .7` auf Weiß ausgewaschen → Vollton.

**Bewusste Abweichung, begründet**
- Ein echtes Gelb erreicht auf Weiß physikalisch keine 4.5:1. Die Statusrolle `--yellow` ist
  deshalb ein dunkles Amber (`#8a6100`, 5.5:1) für Schrift und Symbole; `--yellow-weak` ist
  die helle Tönung für Flächen. Warnungen tragen ohnehin Symbol **und** Text.
- Der Instagram-Markenverlauf (drei Hex-Werte) ist durch eine neutrale Fläche ersetzt —
  Spec §2 verlangt „keine dekorativen Elemente"; die Identität trägt das Symbol.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Darstellung auf dem echten Gerät und bei 360/390/768 px. Die Prüfung lief
  bei 1440 px; das mobile Raster ist Gegenstand von P2-2 bis P2-4.
- **CP2 prüfen:** Tastaturdurchlauf — der Fokus-Ring ist gesetzt, seine Sichtbarkeit auf
  jeder Fläche ist am Gerät zu bestätigen.
- **CP2 prüfen:** Farbwahrnehmung im Alltag (Bildschirm, Umgebungslicht) — die Messung sagt
  nur, dass die Schwellen eingehalten sind.

**Vorbestehende Befunde, nicht Teil von P2-1** (beim Prüflauf aufgefallen)
- `404 /api/images/fleet-FZG-MB/8.jpg` — der Fahrzeugcode `FZG-MB/8` enthält einen
  Schrägstrich und zerlegt den Bildpfad. Datenseitiger Befund, nicht Farbe.
- `403 /api/instagram/media-proxy` — der Host `scontent-hel3-1.cdninstagram.com` ist vom
  Proxy erlaubt; die 403 kommt vom Instagram-CDN selbst, weil die signierten Adressen im
  146 Tage alten Medien-Zwischenspeicher abgelaufen sind. Passt zum bekannten Datenalter.
- Die Ganztags-Schaltfläche im Terminformular sitzt über statt neben ihrer Beschriftung —
  Formularraster, gehört zu P2-4.

**Commit:** `b892e21` · kein Dienst-Restart nötig

### P2-2 — Navigation und mobile Grundstruktur — 05.10.2026

Umfang: Haltepunkte, Navigation, Seitenraster, Touchziele, Verlaufsbehandlung.
**Nicht** hier: mobile Kartenform für Tabellen und mitwachsende Diagramme (P2-3),
Formulare und Dialoge im Detail (P2-4).

**Ausgangsmessung (Chromium, Präfix wie nginx umgeschrieben)**

| Breite | Überläufe vorher | größte Dokumentbreite |
|---|---|---|
| 360 px | 13 von 13 Bereichen | **1.260 px** |
| 390 px | 13 von 13 Bereichen | 1.259 px |
| 768 px | 13 von 13 Bereichen | 1.259 px |
| 1440 px | 0 von 13 | 1.440 px |

Das bestätigt die Owner-Beobachtung aus Spec §6 (ca. 1.251 px). Das überstehende Element war
in **jedem** Fall eine Navigationsschaltfläche — die nicht umbrechende Zeile mit 13 Einträgen.

**Durchgeführt**

1. **Drei Haltepunkte, mobile-first.** Die Grundregeln gelten unter 640 px; ab 640 px
   (breite Geräte, Tablet hochkant) und ab 1024 px (Desktop) bauen zwei Media-Queries darauf
   auf. `main` hat mobil 12 px Innenabstand, ab 640 px 16 px, ab 1024 px die gewohnten 24 px.
   Die vorher einzeln gewachsenen Haltepunkte (680 px für die Terminkarte und die
   NK-Befundzeile, 1100/680 px für das Kachelraster) sind auf dieses Raster umgestellt —
   im ganzen Projekt gibt es jetzt nur noch `min-width: 640px` und `min-width: 1024px`.
2. **Navigation: waagerecht scrollbare Leiste** (Owner-Entscheidung, **kein Hamburger**).
   `overflow-x: auto` **innerhalb** der Leiste, `scroll-snap-type: x proximity`, Bildlaufleiste
   ausgeblendet. Damit bleibt das Dokument schmal, und seitliches Wischen über dem Inhalt
   verschiebt die Seite nicht mehr. Jede Schaltfläche trägt Symbol **und** Text; unter 640 px
   zeigt sie die Kurzform (nur „Private Equity" → „PE", „Instagram" → „Insta",
   „SharePoint" → „SP"), der Text entfällt nie. Der aktive Bereich ist am Akzent, am Unterstrich
   und jetzt zusätzlich an der Schriftstärke erkennbar und wird bei jedem Wechsel per
   `scrollTo` in die Mitte des sichtbaren Teils geholt. Desktop bleibt einzeilig wie bisher.
3. **Kopfzeile und Datenstand-Leiste stapeln schmal.** Kopfzeile zweizeilig: Titel oben,
   darunter Abrufzeitpunkt und „Abmelden". Der Abrufzeitpunkt stand doppelt auf der Seite
   (Kopfzeile und Datenstand-Leiste) — die Leiste zeigt ihn nicht mehr, die sticky Kopfzeile
   hat ihn ohnehin immer im Blick.
4. **Kennzahl-Kacheln mitwachsend.** `.summary-grid` (Health, Trading, Banking, PE),
   `.entity-grid` (Fuhrpark- und Objektkacheln) und `.insta-grid` auf
   `repeat(auto-fill, minmax(150px, 1fr))` — bei 390 px ergibt das zwei Spalten statt eines
   Überlaufs; ab 640 px wachsen die Entitätskacheln wieder auf 260 px Mindestbreite.
   Die PE-Kennzahlzeile (drei feste Spalten) ist ebenfalls mitwachsend. Auf dem Desktop
   bleiben die Entitätskacheln wie gewohnt dreispaltig (eigener Haltepunkt ab 1024 px).

   Dabei sind drei Stellen aufgefallen, an denen **Text abgeschnitten** wurde, ohne dass der
   Überlauftest das meldet — alle behoben:
   - Die Entitätskachel hat `overflow: hidden`; ihr Datenraster stand auf `auto 1fr` mit nicht
     umbrechender Beschriftung. In einer 177 px breiten Kachel wurde der Wert aus der Kachel
     geschoben und abgeschnitten („1.400.00…", „Waermepump…"). Jetzt `minmax(0, auto)
     minmax(0, 1fr)`, die Beschriftung darf schmal umbrechen.
   - Die vier Instagram-Kennzahlkacheln hatten `flex: 1; min-width: 0` und schrumpften schmal
     auf 45 px, statt umzubrechen. Jetzt `flex: 1 1 150px` — zwei Reihen bei 390 px, auf dem
     Desktop unverändert nebeneinander.
   - Der Bildbereich der Entitätskachel war fest 240 px hoch, auch bei einer 177 px breiten
     Kachel; schmal richtet er sich jetzt nach der Breite (4:3), ab 640 px wieder 240 px.
5. **Browser-Zurück ohne Router.** `showTab()` schreibt `?tab=<bereich>` per
   `history.pushState`, ein `popstate`-Handler stellt den Bereich wieder her, der erste Aufbau
   und die Anmeldung **ersetzen** den Eintrag (sonst bräuchte Zurück zwei Schritte, um die
   Seite zu verlassen). Ein Neuladen bleibt im Bereich. Die vorhandenen `replaceState`-Stellen
   in Fuhrpark (2) und Wiki (1) erhalten jetzt `history.state`, damit der Bereichszustand beim
   Zurückblättern nicht verlorengeht. Die Bereichsmarkierung läuft über `data-tab` statt über
   die Reihenfolge der Schaltflächen.
6. **Tabellen und Diagramme nur vorbereitet** (Übergang bis P2-3): `.card` hatte
   `overflow: hidden` und **schnitt** breite Tabellen ab; enthält die Karte unmittelbar eine
   Tabelle, wird sie jetzt zum waagerechten Scrollbereich. Dazu `img, svg, video, canvas
   { max-width: 100% }` und Umbruchregeln für lange Wörter und Adressen.
7. **Unterbereichs-Leisten wie die Hauptnavigation**: Assets-Unterbereiche, Fuhrpark- und
   Vertragsfilter, Instagram-Unterbereiche scrollen waagerecht statt das Dokument zu
   verbreitern.
8. **Touchziele ≥ 44 × 44 px** als mobile Grundeinstellung für **alle** Schaltflächen — auch
   für die ohne eigene Klasse (Wiki, Instagram, SharePoint) — und ab 640 px zurückgenommen,
   damit das in P2-1 abgenommene Bild auf breiten Geräten unverändert bleibt. Bewusst **ohne**
   unsichtbare `::after`-Trefferflächen: bei nebeneinander stehenden Schaltflächen würden sich
   die Flächen überlappen und der Fingerdruck auf dem Nachbarn landen.

**Unterwegs gefundener Fehler (vorbestehend, mitbehoben)**

Beim Aufruf mit Token in der Adresse schrieb der Startcode die Adresse auf `?tab=<bereich>`
neu und **verwarf dabei alle übrigen Parameter**. Ein Aufruf
`?token=…&tab=wiki&page=amazon` landete deshalb in der Wiki-Übersicht statt auf der Seite,
`assets_subtab` und `fleet_code` ebenso. Jetzt wird nur der Token entfernt. Im Alltag fiel das
nicht auf, weil die Deeplinks aus der angemeldeten Sitzung ohne Token-Parameter aufgerufen
werden.

**Geänderte Dateien:** `public/index.html`, `public/css/assets.css`,
`public/css/datenstand.css`, `public/css/entity-tile.css`, `public/js/datenstand.js`,
`public/js/fleet-detail.js`, `public/js/fleet-stores.js`, `public/js/wiki.js`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| Dokumentbreite 13 Bereiche × 360/390/768/1440 px | **0 Überläufe von 52** (vorher 39), größte Breite je Stufe exakt die Viewport-Breite |
| dieselbe Messung mit **abgeschalteter** `overflow-x`-Sicherung | ebenfalls **0 von 52** — die Ursache ist behoben, nicht verdeckt |
| Plausibilität der Messung (13 Bereiche, 390 px) | Inhalt 72–8.936 Zeichen je Bereich, **keine** fehlende Stil- oder Skriptdatei — die Messung lief am gerenderten Zustand |
| Touchziele, alle Schaltflächen in 13 Bereichen bei 390 px | **0 Verletzer** unter 44 × 44 px (vorher 18, keiner davon in der Hauptnavigation) |
| Tastaturfokus, 170 Tabulatorschritte in 7 Bereichen | **0 ohne sichtbaren Ring** |
| Verlauf Health → Kalender → Fuhrpark → zurück | Kalender; zweimal zurück → Health; zweimal vor → Fuhrpark; Neuladen bleibt Fuhrpark |
| Deeplinks `?tab=banking`, `?tab=banking-connect`, `?tab=wiki&page=<slug>`, `?tab=assets&assets_subtab=…`, `?fleet_code=<code>` | alle wie erwartet, Verbinden-Ansicht und Wiki-Seite öffnen sich |
| Unterbereiche einzeln durchgeklickt (4 Assets, 6 Instagram) bei 390 px | je Schritt kein Überlauf; beide Leisten scrollen (528/366 bzw. 593/366 px) |
| Gegenprobe 1440 px gegen 390 px, 13 Bereiche | **0** Bedienelemente, die nur breit vorhanden sind (294 verglichen) |
| Abgeschnittener Text in Behältern ohne Scrollmöglichkeit, 13 Bereiche bei 390 px | **0** (vorher 7, alle im Instagram-Kennzahlblock) |
| Entitätskacheln bei 360/390/768/1440 px | schmal zwei Spalten (162 bzw. 177 px), 768 px zweispaltig, 1440 px dreispaltig wie bisher; 0 abgeschnittene Werte |
| `node --check` server.mjs, alle `public/js/*.js`, Inline-Skript | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |
| Dienste | unverändert — **kein Restart**, nur `public/` betroffen |

**Bildschirmfotos für die Owner-Durchsicht**
`~/upgrade-artifacts/20261005-p2-2/` — 13 Bereiche bei 390 px und dieselben 13 bei 1440 px
(Regressionsvergleich), Gerätefaktor 2, ganze Seitenlänge.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Bedienung am echten Gerät — Wischen in der Navigationsleiste, Daumenerreichbarkeit,
  Verhalten der Zurück-Geste (iOS wischt am Rand, Android nutzt die Systemtaste).
- **CP2 prüfen:** Diagramme sind schmal weiterhin breiter als der Bildschirm und scrollen
  innerhalb ihrer Karte. Das ist der vereinbarte Übergang; die mitwachsenden Diagramme
  und die mobile Kartenform für Tabellen sind **P2-3**.
- **CP2 prüfen:** Terminformular und übrige Dialoge sind nur grob angepasst (Innenabstand,
  einspaltige Feldpaare). Das Formularraster ist **P2-4**.

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git revert <commit>`.

**Commit:** `fed644f` · kein Dienst-Restart nötig

---

### P2-3 — Tabellen, Karten und Diagramme responsiv — 05.10.2026

**Durchgeführt**

1. **Diagramme kommen aus dem Container.** Die drei Health-Diagramme standen in einem
   Scrollbereich mit `min-width: 600px`, die Zeichenbreite kam aus `svg.clientWidth || 600`.
   Schmal begann der Scrollbereich links — der **jüngste** Wert am rechten Rand war ohne
   Scrollen nicht zu sehen. Jetzt liefert `diagrammBreite()` die tatsächliche Containerbreite,
   ein ResizeObserver zeichnet bei Breitenänderung neu (gebündelt über
   `requestAnimationFrame`), und beim Bereichswechsel werden die Diagramme abgemeldet.
   Innenabstände und Beschriftungsdichte richten sich nach der Breite: unter 640 px gilt ein
   Mindestabstand von 58 px je Datumsangabe statt 44 px. Die Beschriftungen werden **vom Ende
   her** gesetzt, damit das jüngste Datum immer dabei ist. Höhe schmal 200 px, breit 220 px.
2. **Zwei Darstellungen für Tabellen, eine Regel.** Neue Datei `public/js/responsiv.js`:
   ≤ 5 Spalten → Kartenform, sonst eigener Scrollbereich; `data-tabelle="karten|scroll"`
   überstimmt die Regel. Die Entscheidung fällt zur Laufzeit am gerenderten Zustand — damit
   greift sie auch dort, wo die Spaltenzahl erst aus den Daten entsteht (Readiness-Matrix:
   eine Spalte je Jahr). Ein MutationObserver auf `#content` fasst beide Rendering-Wege
   (klassische `innerHTML`-Blöcke und Alpine) zusammen, sodass keine der rund 40 Aufrufstellen
   angefasst werden musste.
   - **Kartenform:** die Zeile wird zur Karte, jeder Spaltenkopf zur Beschriftung über seinem
     Wert, die benennende erste Spalte zur Kartenüberschrift über die volle Breite, die
     übrigen Felder paarweise daneben. **Keine Spalte entfällt.**
   - **Scrollbereich:** Klasse am Elternelement statt eines neuen Wrappers (ein zusätzlicher
     Knoten würde in Alpine-Bereichen zwischen Alpine und seine Elemente geraten), Schatten an
     beiden Rändern über `background-attachment: local/scroll` und der Satz
     „⇢ seitlich scrollbar" — letzterer nur, wenn der Bereich tatsächlich überläuft.
3. **Owner-Ausnahmen gesetzt:** Mietverträge (7 Spalten) und Trading-Positionen (7 Spalten)
   bekommen trotz Spaltenzahl die Kartenform (`data-tabelle="karten"`). Beides sind
   Übersichten, keine Rechentabellen.
4. **Bankkonten** sind keine Tabelle, sondern Flex-Zeilen. Sie stapeln jetzt schmal:
   IBAN oben, Saldo und Archivieren darunter (`.bank-konto-zeile`).
5. **Kennzahl-Beschriftungen** mit Kurzform für schmale Geräte (`kpiLabel()`, dasselbe Muster
   wie die Hauptnavigation): „Gewicht-Trend 30 T" → „Trend Gewicht", „Schlaf (letzte Nacht)" →
   „Schlaf", „❤️ Ruheherzfrequenz" → „❤️ Ruhepuls". Keine harten Umbrüche mehr, kein
   abgeschnittener Kachelinhalt, auf dem Desktop unverändert.
6. **Kalender:** der Hinweis auf Europe/Berlin stand **dreimal** auf der Seite — Werkzeugzeile,
   Datenstand-Leiste und Datenstand-Hinweis. Die Werkzeugzeile behält ihn,
   `setDatenstand(…, { zeitzone: false })` und ein gekürzter Hinweis räumen die beiden anderen ab.
7. **Instagram:** die Reichweitenkurve zeichnete den Punkt des jüngsten Werts genau auf die
   Kante der viewBox — er war zur Hälfte abgeschnitten; jetzt drei Einheiten Rand. Im
   Forensic-Balkendiagramm wird schmal nur jede zweite Datumsangabe gesetzt (der jüngste
   Balken immer), sonst überlappen die gedrehten Texte.
8. **Fuhrpark-/Objektkacheln** (Punkt 5 des Auftrags): Nachmessung bei 360/390/768/1440 px
   ergab **0 abgeschnittene Werte**; das in P2-2 gesetzte Verhältnis 4:3 bleibt unangetastet.

**Geänderte Dateien:** `public/js/responsiv.js` (neu), `public/index.html`,
`public/js/assets-vertraege.js`, `public/js/banking-connect.js`, `public/js/datenstand.js`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| Dokumentbreite 13 Bereiche × 360/390/768/1440 px | **0 Überläufe von 52**, auch mit abgeschalteter `overflow-x`-Sicherung |
| Diagramme bei 360/390/768/1440 px (12 Messungen) | **0 Beanstandungen**: viewBox = SVG-Breite, kein Scrollbereich, letzter Datenpunkt innen, jüngstes Datum („10-05") immer beschriftet, kein Text außerhalb, Höhe ≤ 220 px |
| Achsenbeschriftungen je Breite | 4 bei 360/390 px, 13 bei 768 px, 13–22 bei 1440 px (vorher fest 8) |
| Tabellen bei 390 px, alle sichtbaren | Mietverträge **17 Karten × 7 Felder = 119**, SharePoint-Dateien 100 × 4 = 400, Trading-Positionen 1 × 7, Trading-Signale 10 × 4, Status 6 × 3, SharePoint-Sites 4 × 3, Readiness 6 × 4 — **0 Zellen ohne Beschriftung**, **0 Tabellen ohne Karte oder Scrollbereich** |
| Fuhrpark-Unterbereiche (Versicherung 7 Sp., TÜV 6 Sp.) | Scrollbereich mit sichtbarem Hinweis |
| Entscheidungsregel an 7 eingesetzten Tabellenformen | **0 Abweichungen** (6/7/8 Spalten → Scroll mit Hinweis; 3/4 Spalten → Karte mit vollständigen Beschriftungen) |
| Abgeschnittener Text ohne scrollbaren Behälter, 13 Bereiche bei 390 px | **0** |
| Touchziele, alle Schaltflächen in 13 Bereichen bei 390 px | **0 Verletzer** unter 44 × 44 px |
| Kachelhöhe SharePoint-Dateiliste bei 390 px | 238 px je Eintrag im ersten Entwurf → **195 px** nach Überschrift und Paarraster |
| `node --check` server.mjs, alle `public/js/*.js`, Inline-Skript | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |
| Dienste | unverändert — **kein Restart**, nur `public/` betroffen |

**Bewusste Abweichung, begründet**
- Die Kartenform steht in einer `max-width: 639.98px`-Abfrage statt mobile-first mit Rücknahme.
  Sie kehrt die Anzeigeart der Tabellenelemente um (`table` → `block`/`grid`); eine Rücknahme
  müsste jede Eigenschaft einzeln zurücksetzen und würde dabei die Spaltenstile aus
  `assets.css` überschreiben. So bleibt das abgenommene Bild auf breiten Geräten
  nachweislich unberührt.
- Der Scroll-Schatten wirkt auf **allen** Breiten, nicht nur schmal. Er erscheint nur, wenn
  wirklich gescrollt werden kann, und ist dort eine Information, keine Dekoration.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Die NK-Tabellen (Statements, Runs, Zählerstände) ließen sich mit dem
  aktuellen Datenbestand nicht auf den Schirm holen — ohne finalisierten Lauf rendert der
  Bereich keine Tabelle. Die Entscheidungsregel ist für genau diese Spaltenzahlen gesondert
  geprüft (6, 7 und 8 Spalten → Scrollbereich mit Hinweis), die Darstellung mit echten Daten
  bleibt offen.
- **CP2 prüfen:** Die SharePoint-Dateiliste ist in Kartenform bei 100 Einträgen rund 19.000 px
  hoch (als Tabelle 7.000 px). Nichts fehlt und nichts ist abgeschnitten, aber eine Begrenzung
  oder Seitenblätterung für lange Listen wäre eine eigene Verbesserung — **nicht** Teil von P2-3.
- **CP2 prüfen:** Lesbarkeit der Kartenform am Gerät, besonders die Paarspalten bei langen
  Werten.

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git revert <commit>`.

**Commit:** <hash> · kein Dienst-Restart nötig

---

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
