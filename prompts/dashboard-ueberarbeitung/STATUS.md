# STATUS — Dashboard-Überarbeitung

Fortschreiben nach **jedem** Arbeitspaket. Keine Erfolgsmeldung ohne tatsächliches Prüfergebnis.

**Letzte Aktualisierung:** 04.10.2026, 18:46 UTC
**Aktuelle Phase:** Phase 1 begonnen — P1-1 erledigt, P1-2 als Nächstes
**Sicherungsstand:** Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `735d5b8`
**Änderungsstand Code:** P1-1 ist produktiv und in allen drei Repositories gepusht.
Dashboard-Dienst und Gateway neu gestartet.
**Owner-Entscheidungen:** alle acht Punkte entschieden, siehe `00-masterplan.md` §5.

---

## Paketübersicht

| Paket | Thema | Aufwand | Status | Commit | Prüfung |
|---|---|---|---|---|---|
| **Phase 0** | Bestandsaufnahme, Sicherung, Arbeitsdateien | — | **erledigt** | `1fe1499` | Report `~/bikosoc-spec/report-dashboard-phase0-1700.md` |
| P1-1 | Aktualität und Statuskonsistenz (A, B) | L | **erledigt** | siehe unten | Report `~/bikosoc-spec/report-dashboard-p1-1-1846.md` |
| P1-2 | Fuhrparkfilter (C) | S | offen | — | — |
| P1-3 | Mietvertragsfilter und Suche (D) | M | offen | — | — |
| P1-4 | SharePoint-Datenzuordnung (E) | M | offen | — | — |
| P1-5 | Kalenderlogik (F) | M | offen | — | — |
| P1-6 | Nebenkosten-Meldungen (G) | M | offen | — | — |
| **CHECKPOINT 1** | unabhängige Browserprüfung | — | offen | — | `04-…` §2 |
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
