# STATUS — Dashboard-Überarbeitung

Fortschreiben nach **jedem** Arbeitspaket. Keine Erfolgsmeldung ohne tatsächliches Prüfergebnis.

**Letzte Aktualisierung:** 10.10.2026
**Aktuelle Phase:** **Phase 3b abgeschlossen (Sammel-Lauf E1–E7), Owner-Aktionen offen** —
CHECKPOINT 1 am 05.10.2026 extern freigegeben, Hetzner-Snapshot liegt vor. Phase 3 ist am
iPhone bestätigt (A1 bei Netzwechsel, A5 PDF, Banking-Umsätze funktionieren). Der Sammel-Lauf
vom 07.10.2026 hat die restlichen Punkte aus CHECKPOINT 2 erledigt: Bankabgleich (E1),
Foto-Upload (E2), Kopfzeile (E3), Vertrag n24-w6-2024 (E4), Dropbox-Inbox (E5), Ablaufdoku
(E6), Berichtsdisziplin (E7).
**Nächster Schritt: eine Owner-Aktion** — Nachprüfung des Montagsabgleichs am 12.10.2026
ab 13:00 Berliner Zeit; der Lauf wird automatisch ausgewertet (Timer, Paket 1 vom
10.10.2026). Siehe Report `~/bikosoc-spec/report-sammellauf-0855.md`.
**Korrektur 10.10.2026:** Die hier bis zuletzt als offen geführte Rote-Zone-Freigabe ist
erledigt. Alle fünf Core-Commits (`5f65c4b`, `5fdd300`, `1749b36`, `70c4f05`, `3fac89d`)
liegen in `origin/master`; nachgeprüft mit `git branch -r --contains`. Diese Datei war an
der Stelle veraltet.
**Sicherungsstand:** Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `735d5b8`
**Änderungsstand Code:** Phase 2 ist produktiv. `server.mjs` wurde in P2-5, P2-7, P2-8 und
P2-10 geändert (vier neue lesende Routen und die Reise-Kennung); der Dienst wurde nach jeder
Änderung neu gestartet, `GET /health` → 200.
**Phase 1** ist produktiv und in allen drei Repositories gepusht.
Dashboard-Dienst und Gateway neu gestartet. Der Red-Zone-Push des Core-Anteils (`5f65c4b`)
erfolgte am 05.10.2026 07:30 UTC mit gesetztem Armed-Flag; das Flag ist verbraucht.
**Stand 07.10.2026:** Der Dashboard-Anteil von Phase 3b ist gepusht. Der Core-Anteil
(fünf Commits, darunter `index.ts` und `dist/index.js` = Rote Zone) ist lokal committet und
wartet auf `/arm push`. Produktiv ist der Code trotzdem schon — Build, Tests und Neustart
sind gelaufen.
**Überholt am 10.10.2026:** Der Core-Anteil ist gepusht (siehe Korrektur oben). Seit dem
Zuschnitt der Roten Zone vom 10.10.2026 sind `index.ts`, `dist/**` und `CLAUDE.md`
ohnehin keine roten Pfade mehr.
**Owner-Entscheidungen:** alle acht Punkte aus `00-masterplan.md` §5 entschieden; am
07.10.2026 kamen zwei dazu: (9) montags 13:00 läuft ein echter Bankabgleich — das hebt die
E3-Entscheidung „kein automatischer Bankkontakt" vom 26.06.2026 auf; (10) Vertrag
n24-w6-2024 auf „Beendet", Auszugsdatum 15.11.2025.

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
| P2-2 | Navigation und mobile Grundstruktur | L | **erledigt** | `fed644f` | Eintrag unten · Bildschirmfotos `~/upgrade-artifacts/20261005-p2-2/` |
| P2-3 | Tabellen, Karten, Diagramme responsiv | M | **erledigt** | `3260c50` | Eintrag unten · Bildschirmfotos `~/upgrade-artifacts/20261005-p2-3/` |
| P2-4 | Formulare und Dialoge mobil | M | **erledigt** | `66756ed` | Eintrag unten |
| P2-5 | Tagesübersicht (§5) | L | **erledigt** | `4983506` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-6 | Wiki-Suchausschnitte (I) | S | **erledigt** | `b68057f` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-7 | Instagram-Planung und Rohmaterial (J) | M | **erledigt** | `e0c37f4` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-8 | Begriffe, Formate, Barrierefreiheit (M) | M | **erledigt** | `c9e50c3` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-9 | Banking-Übersicht (K) | S | **erledigt** | `fcd64c4` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-10 | Agentenübersicht (L) | M | **erledigt** | `8fbeb62` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| P2-11 | Immobilien-/Mieterdaten-Darstellung (H) | M | **erledigt** | `31fea08` | Report `…/report-dashboard-p2-5-bis-11-0920.md` |
| **CHECKPOINT 2** | vollständige Benutzer- und Mobilprüfung | — | **durchgeführt** 06.10.2026 | — | sieben Fehler (A1–A7), zehn Verbesserungen (B, C1–C5, D1–D4) |
| P3-A | Fehler A1 bis A7 | L | **erledigt** | `41fe1a2` `45306ec` `29c2846` `dc9136e` `a7486ab` `a4433ac` `3120ba6` | Report `~/bikosoc-spec/report-dashboard-p3-2100.md` |
| P3-B | Formularfelder mit DB-unzulässigen Werten | M | **erledigt** | `429725d` | Report §B |
| P3-C | Verbesserungen C1 bis C5 | M | **erledigt** | `f55c22d` `2e5c3e9` `934d503` `ef2acc0` `f33407f` | Report §C |
| P3-D | Formate und Kosmetik D1 bis D4 | S | **erledigt** | `aa220da` `4d8540a` `7a746fd` `b97531f` | Report §D |
| **Nachprüfung CP2** | Owner prüft die siebzehn Punkte am Gerät | — | **erledigt** 07.10.2026 | — | am iPhone bestätigt: A1 bei Netzwechsel, A5 PDF, Banking-Umsätze |
| E1 | Wöchentlicher Bankabgleich — Diagnose und Wiederherstellung | L | **erledigt** | Core `5fdd300` `1749b36` `70c4f05`, Dashboard `5870b74` | Report `~/bikosoc-spec/report-sammellauf-0855.md` §E1 |
| E2 | Foto-Upload Objektkarte | M | **erledigt** | `3cfcafc` | Report §E2 |
| E3 | Agentenname aus der Kopfzeile | S | **erledigt** | `059d17a` | Report §E3 |
| E4 | Vertrag n24-w6-2024 auf „Beendet" | S | **erledigt** | — (Datenänderung über Core-Route, `audit_log` #1391) | Report §E4 |
| E5 | Dropbox-Inbox → `~/inbox/` | M | **erledigt** | Core `3fac89d` | Report §E5 |
| E6 | Ablaufdokumentation | M | **erledigt** | — (Datei in `~/bikosoc-spec/`) | `~/bikosoc-spec/doku-ablaeufe-20261007.md` |
| E7 | Berichtsdisziplin ohne Personen- und Kontodaten | S | **erledigt** | — | Report §E7 |
| **Nachprüfung Montagslauf** | Bankabgleich am 12.10.2026 | S | offen, Auswertung vorbereitet | — | Telegram-Meldung ab 13:00; Auswertung automatisch um 15:00 durch `montagslauf-auswertung.timer` (Paket 1, 10.10.2026) |
| **Rote-Zone-Freigabe** | `/arm push` für den Core-Anteil | — | **erledigt** | `5f65c4b` `5fdd300` `1749b36` `70c4f05` `3fac89d` | alle fünf in `origin/master`, nachgeprüft 10.10.2026 |
| P4-1 | Aufräumen: Fahrzeugfoto, Audit-Lücke, Berührungsziele, PE-Leerzustand, Instagram-Vorschau | M | **erledigt** 10.10.2026 | siehe Eintrag unten | Report `~/bikosoc-spec/report-paket1-nk-datenbasis-mg24-20261010.md` |
| P4-2 | Nebenkosten-Blocker aus dem Handlungsbedarf der Tagesübersicht entfernen | S | **erledigt** 10.10.2026 | siehe Eintrag unten | Report `~/bikosoc-spec/report-paket2-nk-uebernahme-mg24-20261010.md` |

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

**Commit:** `3260c50` · kein Dienst-Restart nötig

---

### P2-4 — Formulare und Dialoge mobil und bedienbar — 05.10.2026

**Durchgeführt**

1. **Formularraster.** Feldpaare (`.formular-paar`, `.form-row`) stehen schmal untereinander und
   erst **ab 768 px** nebeneinander — zwischen 640 und 767 px blieben für ein Datumsfeld sonst
   rund 140 px, zu wenig für den vom Browser gezeichneten Wähler. Alle Eingabefelder füllen die
   Breite ihres Blocks und sind mindestens 44 px hoch (Dialoge, Assets-Schubfächer, Wiki).
   Beschriftungen stehen über dem Feld und zeigen per `for`/`id` darauf: 21 Stellen in den
   PE-Dialogen und 6 im Wiki waren als `<label>Text<input></label>` verschachtelt und sind jetzt
   Geschwister.
2. **Ganztägig-Kästchen.** `.modal label { display: block }` und `.modal input { width: 100% }`
   zogen das Kästchen auf volle Breite und schoben die Beschriftung darunter. Jetzt eine
   `.kontrollzeile`: Kästchen (20 px) und Beschriftung in einer Zeile, Zeilenhöhe 44 px, die
   Beschriftung über `for` klickbar — auf jeder Breite.
3. **Kalender-Beschreibung.** Die Terminliste zeigte Teams-Adresse und Besprechungs-ID als
   Fließtext. `kalenderBeschreibung()` filtert jetzt Einwahlzeilen (Besprechungs-ID, Kenncode,
   Einwahltexte) und Adresszeilen heraus; verbliebene Adressen im Fließtext werden zu „[Link]".
   Der Beitrittslink heißt nach seinem Dienst („Teams beitreten", „Google Meet beitreten"). Der
   Text wird nicht mehr hart bei 160 Zeichen abgeschnitten, sondern auf **zwei** Zeilen gekürzt
   (breit vier) und lässt sich mit „mehr…" aufklappen; die Schaltfläche erscheint nur, wenn
   wirklich gekürzt ist.
4. **Dialoge.** `openModal()` setzt zentral — und damit für alle 30 Dialoge ohne Eingriff an den
   Aufrufstellen: `role="dialog"`, `aria-modal`, `aria-labelledby` auf die Überschrift, eine
   sichtbare Schließen-Schaltfläche (44 × 44), Fokus beim Öffnen in das erste Eingabefeld, einen
   Tabulator-Ring innerhalb des Dialogs, Fokusrückgabe auf das auslösende Element beim Schließen
   und `body.dialog-offen { overflow: hidden }` gegen das Mitscrollen des Hintergrunds.
   Die Höhe richtet sich nach `dvh` statt `vh` (mit `vh` als Rückfallwert), nur der Inhalt
   scrollt, und die Aktionszeile klebt am unteren Rand — damit bleibt sie bei offener
   Bildschirmtastatur erreichbar. Drei PE-Dialoge bauten ihre Überlagerung selbst und hatten
   weder Rolle noch Fokusführung; sie laufen jetzt über `openModal()`.
5. **Meldungen statt `alert()`.** Alle **53** `alert()`-Aufrufe sind ersetzt:
   `feldFehler(id, text)` setzt den Hinweis unter das betroffene Feld (rote Umrandung,
   `aria-invalid`, `aria-describedby`, Fokus auf das Feld), `dialogMeldung(text)` eine Meldung
   oben im Dialog, `meldung(text, art)` eine kurze Einblendung außerhalb von Dialogen. Die
   Einblendung nutzt denselben Behälter und dieselben Klassen wie die Alpine-Bereiche.
6. **Zugängliche Namen.** 18 Symbol-Schaltflächen ohne Text haben `aria-label` und `title`
   bekommen (Verknüpfen, Bearbeiten, Löschen, Schubfach schließen, Konto archivieren, …).

**Geänderte Dateien:** `public/index.html`, `public/css/assets.css`, `public/css/wiki.css`,
`public/js/zeit.js`, `public/js/wiki.js`, `public/js/assets-stammdaten.js`,
`public/js/assets-vertraege.js`, `public/js/banking-connect.js`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| Dialoge (7 Stück) × 360/390/768/1440 px | **0 Beanstandungen von 28** — Rolle, Benennung, Höhe im Fenster, Hintergrund fest, Fokus im Dialog, Schließen-Schaltfläche, Abbrechen, Aktionszeile sichtbar, Escape schließt, Fokus kehrt zurück |
| Touchziele **im Dialog**, alle Bedienelemente | **0 Verletzer** unter 44 × 44 px (Kästchen zählt mit seiner 44 px hohen Zeile) |
| Dialog bei offener Bildschirmtastatur (Fenster 390 × 360 px) | **0 Beanstandungen** bei 6 Dialogen: Dialog 324 px hoch, passt ins Fenster, Inhalt scrollt, Aktionszeile im Dialog, „Speichern" anklickbar |
| Formulare × 4 Breiten | **0 Beanstandungen**: Felder füllen ihren Block, keines unter 44 px, Beschriftung in allen Fällen oberhalb, Paare einspaltig unter 768 px und zweispaltig ab 768 px |
| Prüfhinweis statt `alert()` | sichtbar, direkt unter dem Feld, Feld markiert, Dialog bleibt offen — in allen geprüften Formularen |
| Kalender-Beschreibung bei 390/1440 px | keine Adresse und keine Besprechungs-ID im Text; Beitrittslinks „Teams beitreten" / „Google Meet beitreten"; Kürzung 2 Zeilen schmal / 4 breit; Aufklappen 38 → 94 px, `aria-expanded` wechselt |
| Manueller Durchlauf Kalenderformular (390 px) | Ganztägig über die **Beschriftung** schaltbar, Zeitfelder blenden aus und wieder ein, Prüfhinweis „Das Enddatum liegt vor dem Startdatum.", Abbrechen schließt, Fokus zurück auf „+ Neuer Termin"; **Terminzahl vorher 5, nachher 5 — nichts gespeichert** |
| Dokumentbreite 13 Bereiche × 4 Breiten (Regression P2-2/P2-3) | **0 Überläufe von 52** |
| Touchziele 13 Bereiche bei 390 px (Regression P2-2) | **0 Verletzer** |
| `grep -c "alert("` über alle Frontend-Dateien | **0** (vorher 53) |
| `aria-label` über alle Frontend-Dateien | 29 (vorher 11) |
| `node --check` server.mjs, alle `public/js/*.js`, Inline-Skript | Exit 0 |
| Smoke-Test | ALL PASS (31/31) |
| Dienste | unverändert — **kein Restart**, nur `public/` betroffen |

**Bewusste Abweichung, begründet**
- Das Kontrollkästchen bleibt 20 × 20 px; Trefferfläche ist die 44 px hohe, vollständig
  klickbare Zeile mit Beschriftung. Ein 44 px großes Kästchen wäre auffällig unförmig, und die
  Vorgabe aus P2-2 (kleiner darstellen, 44er Trefferfläche) gilt hier sinngemäß.
- Schaltflächen **in Dialogen** sind auf jeder Breite 44 px hoch, während P2-2 die Mindesthöhe
  ab 640 px allgemein zurücknimmt. Im Dialog wird getippt und getroffen, auch auf dem Tablet.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Verhalten mit der **echten** Bildschirmtastatur auf dem Gerät. Geprüft ist das
  Ersatzbild (Fenster auf 360 px Höhe); `dvh` wird vom Browser erst am Gerät voll ausgespielt.
- **CP2 prüfen:** Die Dialoge der Assets- und Fuhrpark-Module ließen sich nur teilweise ohne
  Datensatz öffnen; geprüft wurden „Neues Fahrzeug" und die drei PE-Dialoge stellvertretend.
  Die Dialoggrundlage ist für alle dieselbe (`openModal`).
- **CP2 prüfen:** Genehmigungsdialoge (Fuhrpark, Assets, Banking) sind Alpine-Overlays und
  **nicht** Teil der zentralen Dialoggrundlage; sie wurden nicht angefasst und sind unverändert.

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git revert <commit>`.

**Commit:** `66756ed` · kein Dienst-Restart nötig

---


### P2-5 — Tagesübersicht „Heute" — 06.10.2026

**Durchgeführt**

1. **Neue Startansicht „Heute"** als erste Navigationsschaltfläche. Der Standardbereich ist von
   `health` auf `heute` umgestellt — an fünf Stellen (Erstaufbau, Anmeldung, `popstate`,
   `showTab()`-Rückfall, `currentTab`-Startwert). Die 13 Fachbereiche bleiben über die
   Navigation und über `?tab=…` unverändert erreichbar; es wurde keiner ersetzt.
2. **Sechs Abschnitte, alle aus echten Daten:**
   - *Handlungsbedarf* — eine Liste über alle Bereiche, sortiert nach (Dringlichkeitsstufe,
     Resttage), nicht nach Bereich. Vier Stufen: Kritisch, Dringend, Offen, Vorgemerkt.
     Quellen: `/api/health/alerts` (Schweregrad), `tuevNextDueDate` der aktiven Fahrzeuge,
     `nk-readiness` je Objekt für das letzte abgeschlossene Jahr. Jede Zeile ist eine
     56 px hohe Schaltfläche und führt in die zuständige Detailansicht.
   - *Tag und Wetter* — Sonnenauf-/untergang, Tageslänge, Mondphase mit Beleuchtungsgrad,
     Mondauf-/untergang, Standort mit Alter der Standortmeldung, Wetter jetzt und drei Tage.
   - *Nächste Termine* — die sechs nächsten aus dem 7-Tage-Fenster, Zeitlogik aus `zeit.js`
     (P1-5), Ganztags- und Mehrtagestermine als solche gekennzeichnet.
   - *Gesundheit* — Schlaf letzte Nacht, Readiness, HRV, Gewicht, jeweils **mit Quelle**
     (Oura bzw. Withings) und Messdatum.
   - *Datenquellen* — acht Quellen mit Datenstand und Alter, veraltete oben, mit einer Zeile
     Fazit („3 von 8 Quellen sind veraltet …"). Baustein `datenstandBadge()` aus P1-1.
   - *Offene Punkte* — §556-Pflichten, „Änderungen seit letztem Besuch", abgeschalteter
     Abgleich, Vorgangstabelle. Jeder Punkt sagt, was **nicht** gilt.
3. **Kein Gesamtscore, keine Kennzahlenwand.** Es gibt keine aggregierte Bewertung über
   Gesundheit, Finanzen und Technik und keine Kachelreihe mit Zahlen ohne Bezug.
4. **Ein neuer lesender Endpunkt** `GET /api/heute/umfeld` in `server.mjs` — und nur dieser.
   Er liefert ausschließlich die drei Angaben, für die es im Dashboard keine Quelle gab:
   Standort (Tabelle `location_events`, dieselbe Quelle wie das Briefing), Sonne/Mond
   (`suncalc`, dieselbe Bibliothek und dieselbe Phasenbenennung wie das Briefing) und Wetter
   (Open-Meteo, derselbe Aufruf wie im Briefing, serverseitig 10 Minuten zwischengespeichert).
   Alle übrigen Bausteine holt der Browser aus den bereits vorhandenen Endpunkten —
   **kein sammelnder `/api/heute`, kein neuer Datenspeicher, keine neue Tabelle.**
5. **Ausfall einzelner Quellen bricht die Ansicht nicht.** Alle Abrufe laufen über
   `Promise.allSettled`; fällt eine Quelle aus, erscheint genau ihr Block als „nicht
   abrufbar" bzw. die Quelle in der Liste als „getrennt".
6. **Fünf unterscheidbare Zustände angelegt** (`zustandBlock()` in `datenstand.js`,
   Stilvorlage in `datenstand.css`): Wird geladen, Keine Daten, Keine Treffer, Nicht
   eingerichtet, Laden fehlgeschlagen, Daten veraltet. Bisher gab es nur `.spinner` und
   `.empty`. P2-8 wendet sie in den Fachbereichen an; hier sind sie erstmals im Einsatz.
7. **Fristen jenseits von 90 Tagen stehen eingeklappt** („6 weitere Fristen später als
   90 Tage"). Sie bleiben in der Sortierung, verdecken aber nicht die heute wichtigen Zeilen.

**Geänderte Dateien:** `public/js/tagesuebersicht.js` (neu), `public/css/tagesuebersicht.css`
(neu), `public/index.html`, `public/js/datenstand.js`, `public/css/datenstand.css`,
`server.mjs`, `package.json`, `package-lock.json` (neue Abhängigkeit `suncalc@1.9.0`)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` (`node --check server.mjs`) | Exit 0 |
| `node --check` alle `public/js/*.js` + Inline-Skript | Exit 0 |
| `grep -n "x-if"` in den geänderten Dateien | keine Treffer — die neue Ansicht nutzt **kein** Alpine |
| Startansicht | `?tab=` leer → `heute`; `?tab=health` → Health; alle 13 Deeplinks unverändert erreichbar |
| TÜV-Sortierung | Tesla Model 3 **28.10.2026 (in 22 Tagen, Stufe „Dringend")** steht vor den Fristen 2027/2028 (Stufe „Vorgemerkt", eingeklappt) |
| Gesundheitswarnungen | 2 Warnungen, **kritische zuerst**: „Schlaf letzte Nacht nur 3.9h" (kritisch) vor „Schlaf unter 6h an 6 von 7 Tagen" (Warnung) |
| Veraltete Quellen | **3 von 8** mit Datum und Alter: Banking 29.06.2026 (98 Tage), SharePoint 16.05.2026 (142 Tage), Instagram-Medien 11.05.2026 (147 Tage) |
| §556-Pflichten | erscheinen als „Nicht eingerichtet" mit Begründung — **nicht** als „keine Pflichten" |
| Gesamtscore | keiner vorhanden (Gegenprobe am gerenderten Text) |
| Deeplink aus einer Handlungszeile | TÜV-Zeile → `?tab=fleet&fleet_code=FZG-TESLA-M3&fleet_subtab=tuev`, Fahrzeug-TÜV-Liste zeigt 28.10.2026; Browser-Zurück landet wieder auf `heute`; NK-Zeile → `?tab=assets&assets_subtab=nebenkosten`, Unterbereich „Nebenkosten" aktiv |
| Nebenkosten 2025 | 6 Objekte, alle mit blockierenden Befunden (3/2/2/2/2/2) — Zahlen gegen die Rohantworten von `nk-readiness` abgeglichen |
| Wetter und Astronomie | `GET /api/heute/umfeld` gegen Open-Meteo-Rohantwort und `suncalc` abgeglichen; Sonnenaufgang 07:31, Mondphase „Abnehmende Sichel" 20 % |
| Dokumentbreite 14 Bereiche × 360/390/768/1440 px | **0 Überläufe von 56** |
| Touchziele `heute` bei 360/390 px | **0 Verletzer** unter 44 × 44 px |
| Abgeschnittener Text ohne Scrollbehälter, `heute` × 4 Breiten | **0** |
| Regression 13 Fachbereiche bei 360/390 px | unverändert — dieselben **3** vorbestehenden Beanstandungen wie vor dem Paket (Eingabefelder in Trading, SharePoint und Wiki unter 44 px Höhe; Behebung in **P2-8**) |
| Smoke-Test | ALL PASS (31/31) |
| Bestandsdaten | nichts geschrieben — alle Abrufe sind `GET` |

**Getroffene Annahmen**
- **Nebenkostenjahr:** die Tagesübersicht prüft das **letzte abgeschlossene** Kalenderjahr
  (derzeit 2025). Das ist das Jahr, das abgerechnet werden muss.
- **Dringlichkeitsschwellen:** eine Frist gilt ab 30 Tagen Restlaufzeit als „Dringend", ab
  90 Tagen als „Offen", darüber als „Vorgemerkt". Überfällig = „Kritisch". Frei gewählt,
  weil die Spec keine Schwellen vorgibt; die Werte stehen als Konstanten am Dateianfang.
- **Standort:** die jüngste Zeile aus `location_events` (derzeit Tuttlingen, Meldung von
  heute 09:00). Ohne Zeile greift der Vorgabewert Tuttlingen und wird als solcher benannt.
- **Wetterquelle:** Open-Meteo ohne Schlüssel — dieselbe Quelle, die der executive-agent
  für das Briefing schon nutzt. Keine neuen laufenden Kosten, kein Konto.
- **Abhängigkeit `suncalc`:** bewusst dieselbe Bibliothek wie im Briefing, damit Dashboard
  und Telegram-Briefing denselben Tag gleich darstellen (dasselbe Prinzip wie die geteilte
  Kalender-Zeitlogik aus P1-5). Alternative wäre eigene Astronomie-Rechnung gewesen.

**Nicht umgesetzt — Owner-Entscheidung nötig**
- **„Änderungen seit letztem Besuch".** Es gibt weder eine Tabelle noch einen Mechanismus,
  der Besuche oder Deltas festhält; jede Umsetzung braucht eine **neue Speicherung**.
  Der Auftrag erlaubte die Umsetzung nur „ohne neue Speicherung" — auch die kleinste
  Variante (Zeitstempel im `localStorage` des Browsers) ist eine neue Speicherung.
  Der Punkt steht sichtbar im Abschnitt „Offene Punkte" der Tagesübersicht und wartet auf
  die Entscheidung des Owners.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Lesbarkeit und Daumenerreichbarkeit der Handlungsliste am echten Gerät.
- **CP2 prüfen:** Ob die vier Dringlichkeitsstufen fachlich richtig geschnitten sind
  (30/90 Tage) — das ist eine Owner-Einschätzung, keine technische Frage.
- **CP2 prüfen:** Der Text der Gesundheitswarnungen kommt wörtlich aus dem Core
  („Schlaf letzte Nacht nur 3.9h" — englische Dezimalschreibweise). Eine Übersetzung wie
  bei den Nebenkosten-Befunden (P1-6) wäre ein eigener Schritt und ist **nicht** Teil von P2-5.

**Live-Auswirkung und Rückweg**
- Restart nötig: **ja** — `server.mjs` wurde geändert (neuer Endpunkt, `suncalc`-Import).
  Dienst am 06.10.2026 neu gestartet, `GET /health` → 200.
- Rückweg: `git revert <commit>` und `systemctl --user restart openclaw-dashboard.service`.
  Keine Datenänderung, deshalb kein Datenrückweg.

**Commit:** `4983506` · Dienst-Restart nötig und durchgeführt

---


### P2-6 — Wiki-Suchausschnitte — 06.10.2026

**Durchgeführt**

Der Suchausschnitt wird in drei Schritten aufbereitet; die **Reihenfolge ist der
Sicherheitskern** (neue Funktionen in `public/js/wiki.js`):

1. **Markdown entfernen** (`wikiMarkdownEntfernen`) — dabei bleiben die `<b>`-Marker, die
   `ts_headline` im Core erzeugt, unangetastet.
2. **Den ganzen Text escapen** — danach ist kein beliebiges HTML mehr möglich.
3. **Genau zwei bekannte Marker zurückverwandeln:** `&lt;b&gt;` → `<mark>`,
   `&lt;/b&gt;` → `</mark>`. Weil Schritt 2 vorher lief, ist das kein Freibrief für
   Seiteninhalte — ein `<script>` im Seitentext ist dann Text und bleibt es (Spec §4 I).
   Das Escaping wurde **nicht** entfernt.

Beim Markdown-Abbau waren vier Dinge nötig, die ein einfacher Ausdruck nicht leistet:

- **Linkziele mit Klammern.** Anhangnamen wie `IPC-VEC754P(N)F-E.pdf` enthalten Klammern.
  Ein `[^)]*`-Ausdruck bricht an der falschen Klammer ab und lässt `F-E.pdf)` im Text stehen.
  `wikiZielLesen()` zählt die Klammerebenen mit; `wikiLinksAufloesen()` arbeitet deshalb als
  Durchlauf, nicht als Ersetzungsausdruck.
- **Angeschnittene Fragmente.** `ts_headline` schneidet mitten im Markdown ab. Drei Formen
  kommen vor und werden alle behandelt: `Adressen](/dashboard/wiki/ipadressen)` (Beschriftung
  fehlt vorne — das Ziel allein ist wertlos und entfällt), `[Elstner IP Gateway](/dashboard/…`
  (Ziel fehlt hinten — Beschriftung bleibt) und `[Elstner IP Gate` (ohne Klammer).
- **Linkbeschriftung ist selbst eine URL.** In der Pflanzliste steht
  `[https://www.mein-schoener-garten.de/pflanzen/obst/mispel-12491](…)`. Eine 90 Zeichen
  lange URL im Ausschnitt ist Rauschen; sie wird auf den Hostnamen gekürzt
  („mein-schoener-garten.de").
- **Hervorhebungszeichen nur paarweise.** Ein pauschales Löschen von `_` zerstört Inhalte:
  aus `ETS_ GroupAddressesOverview.pdf` wurde `ETS GroupAddressesOverview.pdf` und aus
  `window.__XSS` `window.XSS`. Jetzt wird nur ein vollständiges Paar entfernt.

**Bewusst nicht entfernt:** Nummerierungen („1. Mespilus Germanica"). Sie sind von echtem
Text („Punkt 3. Absatz") nicht zuverlässig zu unterscheiden; ein stehengelassener Listenpunkt
ist weniger schlimm als ein verschluckter Satz.

**Der Core blieb unangetastet** — `src/modules/wiki/store.ts` und die
`ts_headline`-Einstellungen sind unverändert. Die Alternative (Steuerzeichen als
`StartSel`/`StopSel`) hätte den Core-Vertrag geändert und war nach Spec zweite Wahl.

**Geänderte Dateien:** `public/js/wiki.js`, `public/css/wiki.css` (Klasse für `mark`)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `node --check public/js/wiki.js` | Exit 0 |
| `grep -n "x-if" public/js/wiki.js` | keine Treffer — der Wiki-Bereich nutzt kein Alpine |
| Suche „Pflanzliste" | `<mark>Pflanzliste</mark>` hervorgehoben; **kein** `<b>Pflanzliste</b>` als Text; die beiden URLs zu „mein-schoener-garten.de" bzw. „gartendatenbank.de" gekürzt |
| Ausschnitt der Seite „Home" | `[WLAN](/dashboard/wiki/wlan)` erscheint als „WLAN"; **keine** Markdown-Linksyntax mehr |
| Anhang-Treffer (`hitType: "attachment"`) | Suche „Anleitung": Segways/`Deutsche Bedienungsanleitung SL V1.27.pdf` und Bedienungsanleitungen L19/`Waermepumpe.pdf` korrekt, je 2 Hervorhebungen, Anhang-Abzeichen vorhanden |
| Tabellenausschnitt (Seite „PDFDokumente") | Tabellenstriche zu „·" verdichtet, Trennzeile `\| --- \|` entfernt, `IPC-VEC754P(N)F-E.pdf` vollständig und ohne Rest |
| Gegenprobe über alle angezeigten Ausschnitte | `<b>`-Tags **0**, `](`-Linksyntax **0**, Tabellenstriche **0** |
| Konstruierter Ausschnitt mit `<script>`, `<img onerror=…>`, `<a href="javascript:…">` und `[Label](javascript:…)` | im DOM nur zwei `MARK`-Elemente; `script` 0, `img` 0, `a` 0; die Schadcode-Zeichen stehen als Text da; die eingebauten Marker wurden **nicht** ausgeführt (`window.__XSS` undefiniert). **Keine Testseite angelegt und keine gelöscht** — die Prüfung lief rein im Browser über den Zustand der Trefferliste |
| Suche ohne Treffer | „0 Treffer für „zzzqqqxxx"" plus „Keine Treffer." — kein leerer Bereich |
| Regression Wiki | Kategorien (48 Seiten, 5 Kategorien), Quellenstand, Anhangzahl, Seitenansicht („Home", 148 Links), Revisionsliste (1 Revision), „Bearbeiten", Rücknavigation und Suchfeld unverändert vorhanden |
| Dokumentbreite Wiki × 360/390/768/1440 px | **0 Überläufe** |
| Zusatzprüfung der Aufbereitung ausserhalb des Browsers | 12 Fälle, darunter Pfade mit Unterstrichen, `**fett**`, Versionsnummern und angeschnittene Links — alle wie erwartet |
| Dienste | unverändert — **kein Restart**, nur `public/` betroffen |

**Getroffene Annahmen**
- Eine Linkbeschriftung, die selbst eine URL ist, wird auf den Hostnamen gekürzt (extern)
  bzw. auf das letzte Pfadstück (intern). Die Spec verlangt nur „keine Markdown-Linksyntax";
  die Kürzung ist eine Lesbarkeitsentscheidung und im Code begründet.
- Nummerierte Listenpunkte bleiben stehen (siehe oben).

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Lesbarkeit der Hervorhebung (`<mark>` auf `--yellow-weak`) am Gerät.
- **CP2 prüfen:** Das Wiki-Suchfeld ist 33 px hoch und bleibt damit unter dem 44-px-Maß.
  Vorbestehender Befund, Behebung in **P2-8** (Barrierefreiheit) — nicht in diesem Paket.

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git revert <commit>`. Keine Wiki-Mutation, deshalb kein Datenrückweg.

**Commit:** `b68057f` · kein Dienst-Restart nötig

---


### P2-7 — Instagram: Content-Plan und Rohmaterial — 06.10.2026

**Durchgeführt**

1. **Content-Plan auf echter Grundlage.** Der Block war seit P1-1 ausgeblendet (die Einträge
   kamen aus `_INSTA_MOCK` und verwiesen auf nie existierende Entwürfe `insta-001`/`insta-002`).
   Er zeigt jetzt den **tatsächlichen Entwurfsbestand** aus `GET /api/instagram/drafts`:
   je Zeile Bezeichnung (erster Satz der Caption — die Entwürfe tragen keinen Titel),
   technische Kennung, Erstellungsdatum, Art, Status, Medien, Hashtag-Zahl und die Aktion
   „Entwurf öffnen".
   **Ehrliche Aussage über die Datenlage:** bei allen Entwürfen ist **kein**
   Veröffentlichungszeitpunkt hinterlegt. Statt ein Erstellungsdatum als Termin auszugeben,
   steht über der Liste, dass es keine Terminplanung in den Daten gibt und wonach sortiert wird.
2. **Verknüpfung Plan → Entwurf.** „Entwurf öffnen" wechselt in den Unterbereich „Drafts",
   rollt zum gemeinten Entwurf und hebt ihn kurz hervor. Weil der Plan aus dem Entwurfsbestand
   selbst entsteht, kann kein Eintrag ins Leere verweisen; der Klickpfad prüft es trotzdem und
   meldet „Zu diesem Eintrag gibt es keinen Entwurf mehr: <Kennung>", falls ein Entwurf
   zwischenzeitlich verschwunden ist.
3. **Alle Datumsangaben vollständig mit Jahr.** Im Entwurfskopf stand ein rohes ISO-Datum
   (`createdAt.slice(0,10)`). Jetzt „erstellt 18.05.2026 · kein Termin hinterlegt" bzw.
   „geplant <Datum>", wenn ein Termin da ist. Die Kalenderwochen-Überschrift ohne Jahr
   („KW 10–11") ist mit dem Mock entfallen.
4. **Keine Schaltfläche ohne Wirkung.** Gegenprobe über alle 15 Schaltflächen des
   Instagram-Bereichs: jede hat `onclick` oder ist mit Begründung deaktiviert
   („↻ Sync nur per /instasync"). „+ Neuen Plan generieren" ist mit dem Mock entfallen.
5. **Rohmaterial: Suche, Filter und Begrenzung — serverseitig.** `GET /api/instagram/raw`
   nimmt jetzt `q` (Sessionkennung **und** Dateinamen), `type` (`image`/`video`/`leer`),
   `status`, `limit` (Standard 25, höchstens 200) und `offset`. Die Antwort nennt
   `gesamt`, `treffer`, `limit` und die Sessions — damit sagt die Oberfläche „25 von 907"
   statt stillschweigend zu kürzen. Vorher lieferte die Route **alle 907** Sessions und das
   Frontend rendete jede als Karte.
6. **Rohmaterial: erschließbare Karten.** Je Session Vorschaubild, **Dateiname** als
   Überschrift (die technische Sessionkennung steht darunter, nicht mehr allein oben),
   Datum mit Uhrzeit, Aufschlüsselung nach Bildern/Videos/sonstigen Dateien, Statusabzeichen
   und vier Aktionen. Werkzeugzeile mit Suchfeld, zwei Filtern und „Filter zurücksetzen";
   darunter eine Trefferzeile und „Weitere 25 laden".
7. **Vorschaubilder ohne Änderung der Rohdaten.** Neue Route
   `GET /api/instagram/raw/:id/thumb/:filename` rechnet das Bild bei jedem Abruf mit `sharp`
   aus dem Original (200 × 200, JPEG). **Es wird kein Vorschaubild abgelegt** — das wäre eine
   Änderung der Rohmaterialdateien, und genau die schließt das Paket aus. Dafür darf der
   Browser es 10 Minuten halten. Pfadprüfung gegen Ausbruch aus dem Sessionverzeichnis;
   Videos werden mit 415 abgewiesen (ein Videobild bräuchte ffmpeg), nicht lesbare Dateien
   mit 422 — in beiden Fällen zeigt die Karte das Typsymbol.
8. **Die Zustände werden unterschieden:** „Keine Daten" (kein Rohmaterial vorhanden) und
   „Keine Treffer" (Filter lässt nichts übrig, mit Rücksetz-Schaltfläche) sind zwei
   verschiedene Blöcke — Baustein aus P2-5.
9. **Die Session-Kennungsvergabe wurde nicht angefasst** (`generateRawSessionId` in
   `server.mjs`). Sie folgt nicht der Projektkonvention `YYMMDD-<subject>-<ort>`; eine
   Umstellung würde Bestandsdaten betreffen und ist nach Spec ausdrücklich nicht Teil
   dieses Pakets.

**Geänderte Dateien:** `public/js/instagram-material.js` (neu),
`public/css/instagram-material.css` (neu), `public/index.html`, `public/js/datenstand.js`
(Klassenname der Zustandsblöcke), `server.mjs`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `node --check` alle `public/js/*.js` + Inline-Skript | Exit 0 |
| `grep -n "x-if"` in den geänderten Dateien | keine Treffer — der Instagram-Bereich nutzt kein Alpine |
| `curl "…/api/instagram/raw?limit=25"` | `gesamt 907`, `treffer 907`, **25 Einträge** |
| Suche nach einem bekannten Dateinamen (`260518-jb-01.jpg`) | 93 Treffer, erste Session `jb-1805-mhwq` — gegen das Dateisystem abgeglichen |
| Filter Medientyp | „Mit Videos" → 273 Treffer, „Mit Bildern" → geprüft, „Ohne Dateien" → geprüft |
| Filter Status | „In Craft" → **8** Treffer, alle mit Abzeichen „In Craft" (Rohantwort: 8 Sessions mit `status=crafting`) |
| Erstaufruf | 25 von 907 Karten, Schaltfläche „Weitere 25 laden" vorhanden; nach einem Klick 50 Karten |
| Null Treffer | Trefferzeile „0 von 907 Sessions · Suche „…"" plus Zustand **„Keine Treffer"** mit Rücksetz-Schaltfläche — **nicht** „keine Daten" |
| Filter zurücksetzen | Suchfeld leer, wieder 25 von 907 |
| Vorschaubilder | im gefilterten Satz 9 von 25 Sessions mit gültigem Vorschaubild (200 × 200 px geladen), 16 mit Typsymbol. Ursache gemessen: von 673 Bilddateien im Rohmaterial sind **650 Platzhalter von 222 Byte ohne Bildinhalt**, nur 23 sind echte Bilder. Die Route antwortet dort mit 422, die Karte zeigt das Symbol |
| Vorschaubild-Pfadprüfung | `..%2F..%2Fsession.json` → 415/400, ohne Token → 401 |
| Content-Plan | 10 Zeilen = 10 echte Entwürfe; **0** Zeilen mit Datum ohne Jahr, **0** mit ISO-Datum |
| Verknüpfung Plan → Entwurf | Klick auf die erste Zeile → Unterbereich „Drafts", Karte `draft-card-insta-when-1805` vorhanden und hervorgehoben; „Draft bearbeiten: insta-when-1805" öffnet den richtigen Entwurf |
| Tote Schaltflächen | **0** von 15 im Instagram-Bereich ohne `onclick` oder Deaktivierungsgrund |
| Instagram, 6 Unterbereiche × 360/390/768/1440 px | **0 Überläufe von 24**, **0 abgeschnittene Texte**, Touchziele unter 44 px: **0** bei 360 und 390 px |
| Gegenprobe: keine Mutation | `insta_drafts` weiterhin **10 Zeilen**, letzte Änderung 18.05.2026; im Rohmaterial **0 Dateien** mit heutigem Änderungsdatum (jüngste Datei 05.10.2026 07:22); 909 Sessionverzeichnisse, 2.158 Dateien |
| Kein Scan, keine Generierung, keine Veröffentlichung | „Scan-Befehl kopieren" legt nur `/instascan <id>` in die Ablage — ausgeführt wird er im Telegram-Bot (dieselbe Linie wie `/instasync`) |
| Regression | Live-Feed, Drafts, Analyse und Forensic unverändert; Medien-Proxy weiterhin funktionsfähig (die 403 der abgelaufenen Meta-URLs bestehen unverändert und sind keine Folge dieses Pakets) |
| Smoke-Test | ALL PASS (31/31) |

**Getroffene Annahmen**
- **Bezeichnung eines Entwurfs:** der erste Satz der Caption, auf 70 Zeichen gekürzt. Die
  Entwürfe tragen kein Titelfeld; das ist die einzige vorhandene Bezeichnung und erfindet
  nichts.
- **Der Content-Plan IST der Entwurfsbestand.** Es gibt keine getrennte Plantabelle und kein
  Terminfeld. Eine erfundene Planstruktur hätte das Problem des Mocks wiederholt.
- **Löschdialog statt `confirm()`:** die Rohmaterial-Löschung fragt jetzt über `openModal()`
  nach (P2-4-Linie: keine Systemfenster), inhaltlich unverändert.
- **Vorschaubildgröße 200 × 200, Zuschnitt auf das Quadrat**, JPEG-Qualität 70. Frei gewählt;
  die Karte zeigt 72 px, der doppelte Wert deckt hochauflösende Displays.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Ladeverhalten der Vorschaubilder am Mobilnetz. 25 Bilder werden einzeln
  gerechnet (`loading="lazy"`); gemessen wurde nur im lokalen Netz.
- **CP2 prüfen:** Ob „Weitere 25 laden" die richtige Schrittweite ist oder ob der Owner
  lieber eine Seitenblätterung möchte.
- **CP2 prüfen:** Die Beschriftung „📁 Raw Material" ist noch englisch — Übersetzung in **P2-8**.
- **Datenbefund für den Owner, nicht behoben:** 650 der 673 Bilddateien im Rohmaterial sind
  222-Byte-Platzhalter ohne Bildinhalt. Das ist eine Eigenschaft des Bestands, keine Folge
  dieses Pakets, und wird hier nur sichtbar gemacht.

**Live-Auswirkung und Rückweg**
- Restart nötig: **ja** — `server.mjs` wurde geändert (Suchparameter, Vorschaubild-Route).
  Dienst am 06.10.2026 neu gestartet, `GET /health` → 200.
- Rückweg: `git revert <commit>` und `systemctl --user restart openclaw-dashboard.service`.
  Keine Datenänderung, deshalb kein Datenrückweg.

**Commit:** `e0c37f4` · Dienst-Restart nötig und durchgeführt

---


### P2-8 — Begriffe, Zahlen-/Datumsformate, Barrierefreiheit — 06.10.2026

**Durchgeführt**

1. **Reise-Kennungen werden erzeugt, nicht eingetippt.** Das Formular verlangte „ID (Slug,
   z. B. tokyo-2026-05)" als Pflichtfeld. Jetzt erzeugt `POST /api/trips` die Kennung nach der
   Projektkonvention `YYMMDD-trip-<ort>`, wenn keine mitgeliefert wird; das Feld ist optional
   und erklärt sich selbst. Eine **vorgegebene Kennung bleibt gültig** — der Endpunkt ist
   rückwärtsverträglich. Nebenbefund behoben: nach dem Anlegen landete man im Health-Bereich,
   jetzt im Reisebereich.
2. **Gemeinsame Übersetzungstabelle** `public/js/begriffe.js` für Datenbank-Rohwerte: 20
   Gruppen (`lease_type`, `lease_status`, `billing_mode`, `payment_method`, `charge_type`,
   `tenant_type`, `role`, `property_type`, `medium`, `reading_type`, Fuhrpark-, Instagram- und
   Dokumentwerte). `begriff()` übersetzt, `begriffBadge()` setzt ein Abzeichen,
   `begriffOptionen()` baut Auswahlfelder aus derselben Quelle. Ein **unbekannter Wert kommt
   unverändert zurück** — lieber ein sichtbarer Rohwert, der eine Lücke zeigt, als eine
   erfundene Bezeichnung.
3. **Dabei ein echter Fehler gefunden und behoben: Auswahlfelder boten Werte an, die die
   Datenbank ablehnt.** Die Spalten tragen CHECK-Bedingungen:
   | Feld | angeboten wurde | zulässig ist |
   |---|---|---|
   | `lease_type` | `residential_permanent`, `residential_temporary` | `residential`, `temporary`, `commercial`, `garage`, `storage` |
   | `payment_method` | `direct_debit` | `bank_transfer`, `sepa_direct_debit`, `cash`, `other` |
   Ein „Speichern" im Vertragsdetail hätte den Vertragstyp auf einen Wert gesetzt, den die
   Datenbank zurückweist — und weil der echte Wert nie vorausgewählt war, hätte ein Klick ihn
   auch noch stillschweigend geändert. `begriffOptionen()` bietet jetzt nur noch zulässige
   Werte an (Liste `BEGRIFF_OPTIONEN`) und hängt einen vorhandenen Bestandswert unverändert
   an, damit Speichern ihn nie ersetzt. Dieselbe Korrektur im Mieterwechsel-Assistenten und
   bei den Vorgabewerten für neue Verträge.
4. **Deutsche Beschriftungen.** „Runs & Statements" → „Abrechnungsläufe und Abrechnungen",
   „Pre-Check" → „Vorprüfung", „NK-Readiness" → „Abrechnungsreife", „Status & NK-Readiness" →
   „Status & Abrechnungsreife", „📁 Raw Material" → „📁 Rohmaterial", „Drafts" → „Entwürfe",
   „🔍 Forensic" → „Prüfdaten", „Live Feed" → „Aktuelle Beiträge", „Scan starten" →
   „Suchlauf starten", „📅 Sync" → „Mit Kalender abgleichen", „Blocker" → „Blockierend",
   „Run-ID/Statements/Snapshot" → „Lauf/Abrechnungen/Prüfsumme", „Exchange/Wahrung" →
   „Börse/Währung", „Avg Kurs" → „Ø Kaufkurs", „P&L" → „Gewinn/Verlust".
   **Hauptnavigation:** „Health" → „Gesundheit", „Trips" → „Reisen", „Assets" → „Immobilien",
   „Agents" → „Automatisierung". Die Bereichskennungen in `data-tab` und `?tab=` bleiben
   **unverändert** — jeder vorhandene Deeplink gilt weiter.
5. **Echte Umlaute statt „ae/oe/ue".** 103 Ersetzungen in sichtbarem Text über 11 Dateien,
   ausschließlich in Anzeigetext und in den Attributen `placeholder`, `aria-label`, `title`
   und `alt`. Schlüssel, Bezeichner und Datenwerte blieben unberührt — gegengeprüft über eine
   Suche nach Bezeichnern mit Umlauten (0 Treffer) und über `value="…"`-Attribute (unverändert).
6. **HRV und Readiness erklärt.** „💓 HRV 42 ms" ohne Skala und Quelle wurde zu
   „💓 HRV (Herzratenvariabilität) · 18 ms · Ø 19 ms über 30 Tage · Quelle: Oura, nachts
   gemessen. Höhere Werte stehen für mehr Erholung; der eigene Durchschnitt ist der Maßstab,
   nicht ein fester Zielwert." Readiness: „🎯 Erholung (Readiness) · 66 von 100 · wenig
   erholt · Quelle: Oura. Einteilung dieser Anzeige: ab 85 gut, ab 70 eingeschränkt, darunter
   wenig erholt." Die Schwellen 85/70 sind damit benannt **und** als Einteilung dieser
   Anzeige gekennzeichnet — nicht als Vorgabe von Oura.
7. **Zahlen- und Datumsformate.** `fmtEur` und `fmtUsd` setzen ein **geschütztes**
   Leerzeichen zwischen Betrag und Währungszeichen; vorher konnte ein Zeilenumbruch beide
   trennen. Die **Zeitzone** steht jetzt einmal im Seitenkopf („Seite geladen: … · alle Zeiten
   in Europe/Berlin") und damit in **jedem** Bereich, auch in denen ohne Datenstand-Leiste; in
   der Leiste ist der Satz dafür entfallen (eine Angabe, eine Stelle).
8. **Die fünf Zustände angewendet** (Baustein aus P2-5) in **acht** Bereichen: Mietverträge
   (keine Daten / keine Treffer), Nebenkosten-Abrechnungsläufe, Fuhrparkfilter (Aktiv,
   Archiviert, leerer Bestand — drei verschiedene Aussagen), Wiki (nicht eingerichtet, keine
   Treffer), SharePoint (keine Treffer, Laden fehlgeschlagen), Instagram-Rohmaterial, Trading
   (keine Position, leere Beobachtungsliste), Mieterliste.
9. **Barrierefreiheit.** Sechs „X"-Löschschaltflächen im Fuhrpark haben einen zugänglichen
   Namen bekommen (Service, Versicherung, TÜV, Steuer, Dokument, Reifensatz). Drei
   Eingabefelder unter dem 44-px-Maß wurden korrigiert: Wiki-Suche (33 px), SharePoint-Suche
   (36 px) und die drei Trading-Felder (29 px, zusätzlich mit deutschen Platzhaltern und
   zugänglichem Namen). Die Trading-Zeile bricht jetzt um, statt die Schaltfläche
   abzuschneiden.
10. **„Hans Dampf" ist unverändert** — in der Kopfzeile und im Meta-Tag (Owner-Entscheidung
    Nr. 6).

**Geänderte Dateien:** `public/js/begriffe.js` (neu), `public/index.html`, `server.mjs`,
`public/js/assets-vertraege.js`, `public/js/assets-stammdaten.js`, `public/js/assets-status.js`,
`public/js/assets-nebenkosten.js`, `public/js/assets-wizard.js`, `public/js/assets-stores.js`,
`public/js/banking-connect.js`, `public/js/fleet-detail.js`, `public/js/fleet-stores.js`,
`public/js/nk-befunde.js`, `public/js/wiki.js`, `public/js/datenstand.js`, `public/css/wiki.css`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `node --check` alle `public/js/*.js` + Inline-Skript | Exit 0 |
| Bezeichner mit Umlauten (Gegenprobe gegen versehentliche Umbenennung) | **0** nicht deklarierte Bezeichner in allen Frontend-Dateien |
| Reise-Kennung | `POST /api/trips` ohne `id` → **`260415-trip-barcelona`**; mit vorgegebener `id` → unverändert `p28-test-vorgabe`. **Beide Testreisen danach gelöscht**, Bestand wieder 1 Datei |
| Mietvertragstabelle | „Wohnung unbefristet" statt `residential`; **0** Zeilen mit Rohwert in 17 Verträgen |
| Vertragsdetail | Vertragstyp-Auswahl bietet genau die 5 zulässigen Werte, **der echte Wert `residential` ist vorausgewählt**; Zahlungsweise bietet die 4 zulässigen Werte |
| Englischer Oberflächentext, Browserdurchgang über alle 14 Bereiche | vorher 18 Begriffe, nachher **11** — die verbliebenen sind Eigennamen und Bereichsnamen (Trading, Banking, Status, Filter, Readiness, Workflow); in Immobilien und Fuhrpark **kein** englischer Oberflächentext mehr |
| Umlaut-Ersatzschreibweisen, Browserdurchgang | vorher 27 auffällige Wörter, nachher **0 echte** (die 17 verbliebenen Treffer sind korrekte deutsche Wörter wie „Datenquelle", „manuell", „Regenschauer" oder Daten aus Wiki und Ausgaben — kein Oberflächentext) |
| Rohwerte in sichtbarem Text | vorher 5, nachher **2**: `insta_tokens` (Quellenangabe der Token-Kachel) und „Commercial" im wörtlich zitierten Originaltext einer Core-Prüfmeldung — beides absichtlich |
| HRV-/Readiness-Kacheln | nennen Skala („von 100"), Quelle („Oura") und Bedeutung der Schwellen |
| Zeitzone | im Seitenkopf in allen 14 Bereichen vorhanden; in der Datenstand-Leiste nicht mehr doppelt |
| Geldbeträge | geschütztes Leerzeichen vor € und $ (Gegenprobe im gerenderten Text) |
| Touchziele bei 360 und 390 px, alle 14 Bereiche | **0 Verletzer** unter 44 × 44 px (vorher 3: Wiki-, SharePoint- und Trading-Eingaben) |
| Dokumentbreite 14 Bereiche × 360/390/768/1440 px | **0 Überläufe von 56** |
| Abgeschnittener Text ohne Scrollbehälter | **0** (die bei der Zwischenprüfung aufgetretene Beanstandung „+ Hinzufügen" bei 360 px ist mit dem Umbruch behoben) |
| Smoke-Test | ALL PASS (31/31) |
| Bestandsdaten | unverändert: `leases` 17 aktiv, `tenants` 26, letzte Änderung in beiden Tabellen 15.05.2026 |

**Getroffene Annahmen**
- **`residential` = „Wohnung unbefristet", `temporary` = „Wohnung befristet".** Die Spec nennt
  als Zielbezeichnung „Wohnung unbefristet" für `residential_permanent`; im Bestand steht
  stattdessen `residential`, und alle 13 so erfassten Verträge haben kein Enddatum. Die vier
  `temporary`-Verträge sind die temporär vermieteten Wohnungen aus Owner-Entscheidung Nr. 4.
- **Hauptnavigation teilweise übersetzt.** „Health", „Trips", „Assets" und „Agents" haben
  natürliche deutsche Entsprechungen und sind übersetzt; „Kalender", „Fuhrpark", „Trading",
  „Banking", „Private Equity", „Instagram", „SharePoint", „Wiki" und „Status" bleiben, weil
  sie Eigennamen oder im Deutschen gebräuchlich sind. Die Bereichskennungen sind unverändert,
  also bleibt jeder Deeplink gültig.
- **„Filter" und „Status" gelten als deutsche Wörter** und wurden nicht ersetzt.
- **„Readiness" und „HRV" bleiben als Herstellerbegriffe stehen**, jetzt aber mit deutscher
  Erklärung und deutschem Leitwort („Erholung (Readiness)").
- **Vorgabewert für neue Mietverträge** ist jetzt `residential` statt des von der Datenbank
  abgelehnten `residential_permanent`. Das ändert keinen Bestandswert, sondern nur den
  Vorschlag für künftige Anlagen.
- **Zeitzone nur einmal im Seitenkopf** statt an jeder Uhrzeit. Ein Hinweis je Zeitangabe
  hätte jede Zeile verlängert; die Spec verlangt, dass die Zeitzone genannt wird, nicht wie oft.

**Verbleibende Fehler — Befund für den Owner, nicht in diesem Paket behoben**
Beim Abgleich der Auswahlfelder gegen die CHECK-Bedingungen der Datenbank sind **weitere**
Felder aufgefallen, die unzulässige Werte anbieten. Sie liegen in Schreibpfaden, die über
diesen Anzeigeauftrag hinausgehen, und sind deshalb **nur dokumentiert**:

| Feld | angeboten | zulässig laut Datenbank |
|---|---|---|
| `lease_charges.charge_type` | `kaltmiete`, `nk_vorauszahlung`, `heizkosten_vorauszahlung`, `kaution`, `sonstige` | `base_rent`, `operating_cost_prepayment`, `heating_prepayment`, `garage_rent`, `vat` |
| `meters.medium` | zusätzlich `main_heat`, `space_heating_heat`, `warm_water_heat`, `warm_water_volume` | `cold_water`, `warm_water`, `heat`, `electricity`, `gas` |
| `meter_readings.reading_type` | `periodic` | `annual`, `interim`, `move_in`, `move_out`, `meter_reset`, `automatic` |
| Mietvertragsfilter „Zukünftig" | `future` | `draft`, `active`, `terminated`, `ended`, `unverified_legacy` |

Anlegen eines Mietbestandteils, eines Zählers oder einer Ablesung schlägt damit voraussichtlich
mit einem Datenbankfehler fehl. Die Begriffstabelle **kennt** die richtigen Werte bereits; die
betroffenen Formulare umzustellen heißt aber, auch die Schreibwege im Core zu prüfen — das ist
ein eigener Arbeitsschritt und keine Anzeigefrage.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Ob „Immobilien" und „Automatisierung" als Bereichsnamen passen, oder ob der
  Owner bei „Assets" und „Agents" bleiben möchte.
- **CP2 prüfen:** Die Formulare für Mietbestandteile, Zähler und Ablesungen ließen sich ohne
  passenden Datensatz nicht vollständig durchspielen; geprüft ist die Auswahl im
  Vertragsdetail und im Mieterwechsel-Assistenten.
- **CP2 prüfen:** Lesbarkeit der erklärenden Zeilen unter den Gesundheitskacheln am Gerät.

**Live-Auswirkung und Rückweg**
- Restart nötig: **ja** — `server.mjs` wurde geändert (Reise-Kennung). Dienst am 06.10.2026
  neu gestartet, `GET /health` → 200.
- Rückweg: `git revert <commit>` und `systemctl --user restart openclaw-dashboard.service`.
  Keine Bestandsdatenänderung; die beiden Testreisen sind gelöscht.

**Commit:** `c9e50c3` · Dienst-Restart nötig und durchgeführt

---


### P2-9 — Banking-Übersicht — 06.10.2026

**Durchgeführt**

1. **Je Konto steht jetzt da, was in den Daten steht.** Vorher zeigte die Zeile nur IBAN und
   Saldo. Jetzt: Kontobezeichnung, Status, Währung, Saldo **und der Datenstand des Saldos mit
   Alter** („Aktiv · EUR · Saldo vom 29.06.2026 (vor 98 Tagen)").
2. **Keine erfundene Kontobezeichnung.** `displayName` wird nur angezeigt, wenn er von der
   IBAN abweicht — im Bestand ist das bei keinem Konto der Fall, deshalb steht dort die IBAN.
   `accountType` und `ownerName` sind bei allen 12 Konten leer; ein Kontozweck ist in den
   Daten **nicht vorhanden** und wird nicht ergänzt.
3. **Kein Saldo ist nicht null Euro.** Konten ohne `currentBalance` zeigen „kein Saldo
   erfasst" und werden in der Summe nicht mitgerechnet.
4. **Summe je Währung, nicht über Währungen hinweg.** Die Summenzeile nennt die Währung
   ausdrücklich und wird je Währung getrennt gebildet — auch wenn derzeit alle Konten in EUR
   geführt werden. Darunter steht, wie viele Konten einbezogen sind, wie viele keinen Saldo
   haben und auf welchen Datenstand sich die Summe bezieht.
5. **Archivierte Konten getrennt und eingeklappt** („10 archivierte Konten anzeigen").
6. **Umsatzansicht — der lesende Zugriff existiert.** Die Spec hatte ihn als „nicht
   verifiziert" vermerkt. Geprüft: `GET /api/banking/accounts/:id/transactions` liefert die
   Zeilen aus `banking_transactions` (1.633 Zeilen im Bestand). Ein Klick auf das Konto öffnet
   die Umsatzliste: Buchungsdatum (mit Wertstellung, wenn abweichend), Gegenseite,
   Verwendungszweck, Buchungstext und Betrag; 50 Zeilen, „Weitere 50 laden"; ein zweiter Klick
   schließt sie. Über der Liste steht ausdrücklich: **Stand des letzten FinTS-Abgleichs, nicht
   der aktuelle Stand bei der Bank.**
7. **IBAN der Gegenseite maskiert**, auf Klick sichtbar — dasselbe Muster wie bei den
   Mieter-IBANs (`iban-masked` / `iban-reveal`).
8. **Seitenkopf und Datenstand** waren schon in P1-1/P2-5 ergänzt und sind hier nachgewiesen.

**Geänderte Dateien:** `public/js/banking-connect.js`, `public/index.html` (Stilvorlage)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `grep -n "x-if" public/js/banking-connect.js` | 17 Treffer, jede mit genau einem direkten Kindelement — Single-Root-Bedingung erfüllt (die neuen Blöcke nutzen `x-show`/`x-for`, keine neue `x-if`) |
| Beide aktiven Konten | Saldo, Währung „EUR", Status „Aktiv" und „Saldo vom 29.06.2026 (vor 98 Tagen)" |
| Summe | **17.968,73 EUR**, Währung genannt, Hinweis „2 aktive Konten · Datenstand 29.06.2026, vor 98 Tagen · Summiert wird je Währung getrennt." |
| Archivierte Konten | **10**, in einem eingeklappten Block, standardmäßig zu |
| Kontobezeichnung | IBAN, keine erfundene Bezeichnung |
| Seitenkopf | „Seite geladen: 06.10.2026, 11:09 · alle Zeiten in Europe/Berlin" — nicht mehr leer |
| Datenstand-Leiste | „⚠️ Bankkonten (FinTS) · Daten veraltet (98 Tage)" |
| Umsatzliste | **50 von 437 Umsätzen** für das erste Konto, jüngste Buchung 25.06.2026 (vor 103 Tagen), 47 maskierte Gegenseiten-IBANs, „Weitere 50 laden" vorhanden |
| Zweiter Klick auf dasselbe Konto | schließt die Liste (Container leer) |
| Gegenprobe: keine Mutation | `banking_sync_runs` weiterhin **3 Zeilen**, letzte vom 29.06.2026 — keine neue Bankverbindung, keine Transaktion, kein Abruf ausgelöst |
| Regression | Massenauswahl und Genehmigungsdialog unverändert; der Dialog wurde **nicht ausgeführt** |
| Dokumentbreite Banking × 360/390/768/1440 px | **0 Überläufe**, **0 Touchziele** unter 44 px bei 360/390 px |
| Smoke-Test | ALL PASS (31/31) |

**Getroffene Annahmen**
- **Umsatzansicht umgesetzt, nicht nur geplant.** Die Spec verlangte „nur planen, wenn ein
  lesender Zugriff tatsächlich existiert". Er existiert und ist bereits über den
  Banking-Proxy erreichbar — damit war die Umsetzung der kleinere Schritt als eine Planung,
  die ohnehin nur diese eine Route beschreibt.
- **Maskierte Gegenseiten-IBAN mit Aufklappen** statt voller Anzeige — dasselbe Muster, das
  im Projekt für Mieter-IBANs schon gilt.
- **50 Umsätze je Seite.** Frei gewählt; 437 Zeilen auf einmal wären am Telefon unbrauchbar.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Lesbarkeit der Umsatzliste in Kartenform am Gerät (4 Spalten → Kartenform
  nach der Regel aus P2-3).
- **CP2 prüfen:** Ob die Summenzeile über dem oder unter dem Kontoblock stehen soll.

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git revert <commit>`. Keine Datenänderung.

**Commit:** `fcd64c4` · kein Dienst-Restart nötig

---


### P2-10 — Agentenübersicht — 06.10.2026

**Durchgeführt**

1. **Aus einer statischen Karte wurde eine lesende Übersicht.** Der Bereich bestand aus einem
   einzigen Link auf n8n: keine Daten, kein Datenstand, kein Abruf.
2. **Neue lesende Route** `GET /api/agents/workflows` in `server.mjs`. Sie fasst drei Quellen
   zusammen: `/api/v1/workflows` und `/api/v1/executions` von n8n sowie Zählwerte aus der
   eigenen Tabelle `approval_tokens`.
3. **Der n8n-Schlüssel bleibt serverseitig.** Die Rohantwort von n8n geht **nicht** an den
   Browser — sie enthält die vollständigen Workflow-Definitionen samt Knotenparametern, und
   dort können Zugangsdaten stehen. Die Route liefert ausschließlich aufbereitete Felder.
4. **Vier Abschnitte:**
   - *Workflows in n8n* — Name, Schrittzahl, Zustand, letzte Änderung, letzter Lauf und
     Zeitplan. Ein inaktiver Workflow ist **nicht grün**, sondern grau mit „Inaktiv — läuft
     nicht"; sein hinterlegter Zeitplan erscheint als „Zeitplan hinterlegt (täglich 07:00),
     **wird nicht ausgeführt**". Archivierte Workflows tragen ein eigenes Abzeichen.
   - *Ausführungen* — n8n hat keine Historie, deshalb steht dort „Keine Ausführungen
     aufgezeichnet" mit der Begründung und dem ausdrücklichen Satz, dass das **keine** Aussage
     darüber ist, dass alles in Ordnung ist.
   - *Freigaben im Dashboard* — offene, verwendete und Gesamtzahl der Genehmigungen plus
     Zeitpunkt der letzten Anforderung. Nur Zählwerte und Zeitpunkte; **kein Token, kein
     Inhalt**.
   - *n8n öffnen* — der bestehende Link, unverändert erreichbar.
5. **Kein Schreibzugriff.** Es gibt keine POST-, PATCH-, PUT- oder DELETE-Route unter
   `/api/agents`. Kein `GRANT` auf die n8n-Datenbank; die bleibt für den `openclaw`-User
   gesperrt.

**Geänderte Dateien:** `server.mjs`, `public/index.html`, `public/css/tagesuebersicht.css`

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `curl .../api/agents/workflows` | **4 Workflows**, 0 Ausführungen, Freigabenzählwerte |
| Alle vier Workflows mit Name und Zustand | `health-withings-sync-daily`, `260509-openclaw-health-check`, `instagram-token-health-daily`, `banking-sync-daily` — **alle „Inaktiv — läuft nicht"** |
| Inaktiver Zustand nicht grün | **0** grüne Abzeichen in der ganzen Ansicht |
| „Keine Ausführungen aufgezeichnet" | vorhanden, mit Begründung und dem Satz, dass es kein Gütesiegel ist |
| n8n-Schlüssel in der Antwort | **0 Treffer** — der Schlüssel aus `~/.config/openclaw/env` kommt in der JSON-Antwort nicht vor |
| n8n-Schlüssel im ausgelieferten HTML/JS | **nicht vorhanden** (Gegenprobe über den gesamten Seitenquelltext) |
| Ohne Token | HTTP 401 |
| Schreibroute unter `/api/agents` | **0** |
| Verhalten bei nicht erreichbarem n8n | simuliert: Abschnitte „Workflows" und „Ausführungen" zeigen **„Laden fehlgeschlagen"** mit dem Grund und dem Zusatz „Das heißt NICHT, dass keine Workflows vorhanden sind."; die Freigaben bleiben lesbar. Fällt der ganze Abruf aus, steht „nicht abrufbar" und der Datenstand meldet „🔴 Quelle nicht erreichbar" |
| n8n-Link | `https://app.bikobickel.de/n8n/`, funktioniert weiter |
| Keine Ausführung ausgelöst, kein Workflow aktiviert | Gegenprobe: `/api/v1/executions` weiterhin 0 Einträge; alle vier Workflows weiterhin `active: false` |
| Dokumentbreite Automatisierung × 360/390/768/1440 px | **0 Überläufe**, **0 Touchziele** unter 44 px bei 360/390 px |
| Regression Status-Bereich | unverändert |
| Smoke-Test | ALL PASS (31/31) |

**Getroffene Annahmen**
- **Offene Freigaben kommen aus `approval_tokens`**, nicht aus n8n. Die Spec nannte die
  Tabelle als „Nutzung nicht geprüft"; sie enthält 39 Zeilen, davon 29 verwendete und
  derzeit 0 offene. Angezeigt werden nur Zählwerte und der Zeitpunkt der letzten Anforderung.
- **Der Zeitplan wird aus dem Schedule-Trigger-Knoten gelesen** und in einen Satz übersetzt
  („täglich 07:00"). Bei einem inaktiven Workflow steht ausdrücklich dabei, dass er nicht
  ausgeführt wird — ein „nächster Lauf" wäre dort eine Falschaussage.
- **20 Ausführungen je Abruf.** Derzeit gibt es keine; die Grenze verhindert, dass eine
  spätere Historie die Ansicht sprengt.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Sobald n8n wieder Läufe hat (derzeit nach Owner-Entscheidung Nr. 1 nicht
  vorgesehen), ist die Darstellung der Historie mit echten Daten zu prüfen. Geprüft ist bisher
  nur der Leerfall und der Fehlerfall.

**Live-Auswirkung und Rückweg**
- Restart nötig: **ja** — `server.mjs` wurde geändert (neue Route). Dienst am 06.10.2026
  neu gestartet, `GET /health` → 200.
- Rückweg: `git revert <commit>` und `systemctl --user restart openclaw-dashboard.service`.
  Lesend, keine Datenänderung.

**Commit:** `8fbeb62` · Dienst-Restart nötig und durchgeführt

---


### P2-11 — Immobilien- und Mieterdaten: Darstellung — 06.10.2026

**Durchgeführt**

**Nur Anzeige.** Dieses Paket schreibt nichts: keine Statusänderung, keine Datumskorrektur,
keine Zusammenführung von Mieterdatensätzen (Owner-Entscheidungen Nr. 3 und 4).

1. **Neuer Baustein** `public/js/assets-mietverhaeltnisse.js`. Er lädt Verträge und Mieter
   einmal und stellt daraus drei Verknüpfungen her: Mieter → Verträge, Vertrag →
   Vertragsparteien, Einheit → alle Verträge.
   **Zum Verknüpfungsweg:** der Core liefert keinen Endpunkt für die n:m-Tabelle
   `lease_tenants` (geprüft: `/api/assets/leases/:id/tenants` antwortet mit dem Vertrag
   selbst, nicht mit den Parteien). Die Liste `/api/assets/leases` enthält aber
   `tenant_names`, und jede `tenant_code` endet auf Objekt und Einheit
   (`jbickel-n24w3` → n24 / W3). **Beide Wege werden benutzt und gegeneinander geprüft** —
   Namensgleichheit allein wäre bei vier gleichnamigen Datensätzen nicht eindeutig. Die
   Mieteransicht nennt je Vertrag, wie die Zuordnung zustande kam („Kennung und Name",
   „über die Kennung", „nur über den Namen").
2. **Inkonsistenzen werden gekennzeichnet, nicht korrigiert.** Vertrag `n24-w6-2024` trägt
   im Detail einen gelben Hinweis: „Auszug am 15.11.2024 erfasst, Status weiterhin ‚Aktiv' —
   Klärung offen. Zusätzlich liegt das Auszugsdatum vor dem Kündigungsdatum (30.11.2025);
   ob das ein Tippfehler im Jahr ist, ist nicht bewertet." Darunter: „Die Entscheidung liegt
   beim Owner. Es wurde nichts geändert." In der Vertragsliste trägt die Zeile ein Abzeichen
   „⚠️ Klärung", damit der Fall nicht erst im Detail sichtbar wird.
3. **Der Mieterwechsel ist erkennbar.** Das Vertragsdetail zeigt alle Verträge derselben
   Einheit nebeneinander: `n24-w6-2024` ab 15.05.2024 mit Auszug 15.11.2024 und
   `n24-w6-2025` ab 01.12.2025 — mit Beginn, Kündigung, Auszug, Status und Mietern, der
   gerade geöffnete Vertrag hervorgehoben.
4. **Vertragsparteien im Vertragsdetail:** Name, Kennung, Kontakt und Rolle, jede Zeile
   führt in die Mieteransicht. Zusätzlich steht darunter, wer im Vertrag genannt ist
   (`tenant_names`), damit ein fehlender Mieterdatensatz auffällt.
5. **Hauptmieter statt Doppeleintrag.** Vier Mieterdatensätze lauten auf „Jürgen Bickel" mit
   derselben E-Mail. Nach Owner-Entscheidung Nr. 4 ist das **korrekt**; die Oberfläche sagt
   das auch so: „Das ist beabsichtigt: der Eigentümer ist Hauptmieter temporär vermieteter
   Wohnungen und vermietet unter (Owner-Entscheidung Nr. 4 vom 04.10.2026). Kein
   Doppeleintrag — die Datensätze werden nicht zusammengeführt." In der Mieterliste trägt
   jeder dieser Datensätze ein Abzeichen „Hauptmieter". Es gibt **keinen**
   Zusammenführungsvorschlag und keine Schaltfläche dafür.
6. **Ehrlicher Befund zu den Untermietern:** sie sind in den Daten **nicht erfasst**. Die
   Verknüpfungstabelle `lease_tenants` lässt per CHECK-Bedingung nur die Rollen
   `contract_party`, `occupant` und `guarantor` zu — eine Untermieter-Rolle gibt es im Schema
   nicht. Die Untervermietung ist deshalb nur am Vertragstyp „Wohnung befristet" erkennbar,
   und genau so steht es in der Mieteransicht. Ein eigenes Untermietverhältnis zu erfassen
   wäre eine Schemaänderung und damit eine Owner-Entscheidung.
7. **Neuer Abschnitt „Klärungsbedarf"** unter „Status & Abrechnungsreife" mit drei Teilen:
   - *Statusbedeutung* im Klartext: was „Aktiv" heißt, dass der Status **nicht** automatisch
     aus Kündigung oder Auszug folgt, und dass derzeit alle 17 Verträge auf „Aktiv" stehen.
   - *Klärungsbedarf in den Verträgen*: die beiden Fälle mit Sprung in das Vertragsdetail.
   - *Mehrere Mietverhältnisse pro Person*: der Fall „Jürgen Bickel" mit allen vier
     Kennungen und Verträgen und der Erklärung aus Owner-Entscheidung Nr. 4.

**Geänderte Dateien:** `public/js/assets-mietverhaeltnisse.js` (neu),
`public/js/assets-vertraege.js`, `public/js/assets-stammdaten.js`, `public/js/assets-status.js`,
`public/css/assets.css`, `public/index.html` (Skripteinbindung)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `npm run build` | Exit 0 |
| `node --check` alle `public/js/*.js` | Exit 0 |
| `grep -n "x-if"` in `assets-vertraege.js` und `assets-stammdaten.js` | keine Treffer — beide Dateien nutzen keine `x-if`; die neuen Blöcke sind klassisches HTML |
| Vertrag `n24-w6-2024` | sichtbarer Klärungshinweis im Detail **und** Abzeichen in der Liste |
| Einheit 32 (n24/W6) | beide Verträge mit Zeiträumen untereinander, Mieterwechsel erkennbar, der geöffnete Vertrag markiert |
| Vertragsparteien | für `n24-w6-2024` drei erfasste Parteien (Vormieter und die beiden Nachmieter — sie hängen an derselben Einheit) plus die Angabe „Im Vertrag genannt: …" |
| Mieteransicht „Jürgen Bickel" | alle **vier** Verträge, alle „Wohnung befristet", je mit Zuordnungsweg; Hauptmieter-Erklärung und Untermieter-Befund vorhanden |
| Mieterliste | die vier Datensätze tragen „Hauptmieter"; Mieterkennung unter dem Namen sichtbar |
| Übersicht „Klärungsbedarf" | **2 Vertragsfälle** und **1 Mehrfachvertrag**; jeder Eintrag nennt den Owner als Entscheider und führt per Schaltfläche in die Detailansicht |
| Statusbedeutung erklärt | im Abschnitt „Klärungsbedarf" und zusätzlich als Hinweis am Statusfeld im Vertragsdetail |
| Kein Zusammenführungsvorschlag | **0** Schaltflächen oder Vorschläge zum Zusammenführen |
| **Gegenprobe nach der Prüfung** | `SELECT count(*) FROM leases WHERE status='active'` → **17** (unverändert); `SELECT count(*) FROM tenants` → **26** (unverändert); Mieter-IDs **31, 32, 37, 38** existieren unverändert; `n24-w6-2024` weiterhin `active`, `start_date` 2024-05-15, `termination_date` 2025-11-30, `actual_move_out` 2024-11-15 — **nichts geändert**; letzte Änderung in `leases` und `tenants` jeweils 15.05.2026 |
| Regression | Mietersuche in den Stammdaten und Vertragsfilter aus P1-3 unverändert funktionsfähig; der Mieterwechsel-Assistent wurde **nicht gestartet** |
| Dokumentbreite Immobilien × 360/390/768/1440 px | **0 Überläufe**, **0 Touchziele** unter 44 px bei 360/390 px |
| Smoke-Test | ALL PASS (31/31) |

**Getroffene Annahmen**
- **Zuordnung über Mieterkennung plus Name.** Ohne Endpunkt für `lease_tenants` ist das der
  belastbarste Weg, und der Zuordnungsweg wird je Zeile ausgewiesen, statt eine Sicherheit zu
  behaupten, die es nicht gibt.
- **Vertragsparteien eines Vertrags** werden über die Einheit in der Mieterkennung bestimmt.
  Bei der Einheit n24/W6 erscheinen deshalb auch der Vormieter und die Nachmieter zusammen —
  das ist der Datenlage angemessen und wird durch die Vertragsliste darunter aufgelöst.
- **„Klärungsbedarf" liegt unter „Status & Abrechnungsreife"** und nicht als eigener
  Unterbereich: dort steht der bereichsübergreifende Zustand schon.
- **Zwei Befundarten** werden erkannt: Auszug oder Ende in der Vergangenheit bei Status
  „Aktiv", und mehrere gleichzeitig aktive Verträge auf einer Einheit. Beide Regeln stehen
  als Code am Dateianfang und erfinden keine weiteren Prüfungen.

**Noch nicht verifiziert — CP2 prüfen**
- **CP2 prüfen:** Ob die Darstellung der Hauptmieter-Beziehung so ausreicht oder ob der Owner
  eine echte Untermieter-Erfassung möchte — das wäre eine Schemaänderung und damit eine
  eigene Entscheidung.
- **CP2 prüfen:** Ob der Vertrag `n24-w6-2024` auf „Beendet" gesetzt und das Auszugsdatum
  geprüft werden soll. Die Oberfläche weist den Fall aus; die Änderung ist ausgesetzt
  (Owner-Entscheidung Nr. 3).
- **CP2 prüfen:** Lesbarkeit der beiden Tabellen im Vertragsdetail am Gerät (Kartenform).

**Live-Auswirkung und Rückweg**
- Restart nötig: nein (nur `public/`), Browser-Neuladen genügt.
- Rückweg: `git checkout <tag> -- public/js/assets-vertraege.js public/js/assets-stammdaten.js`
  bzw. `git revert <commit>`. Da nichts geschrieben wird, ist kein Datenrückweg erforderlich.

**Commit:** `31fea08` · kein Dienst-Restart nötig

---


### Phase 2 — Abschlussregression und Abnahmevorbereitung — 06.10.2026

**Durchgeführt**

Nach P2-11 eine gemeinsame Prüfung über **alle 14 Bereiche** (13 Fachbereiche plus die neue
Tagesübersicht) bei **360, 390, 768 und 1440 px**.

| Prüfung | Resultat |
|---|---|
| Horizontaler Seitenüberlauf | **0 von 56** Messungen |
| Touchziele unter 44 × 44 px bei 360 und 390 px | **0** in allen 14 Bereichen |
| Abgeschnittener Text ohne scrollbaren Behälter | **0** |
| `node --check` über `server.mjs`, 17 Frontend-Dateien, Inline-Skript | Exit 0 |
| `npm run build` | Exit 0 |
| `alert()`-Aufrufe (Regression P2-4) | **0** (ein Treffer in einem Kommentar) |
| `aria-label` über alle Frontend-Dateien | **43** (vor Phase 2: 11) |
| Alpine-Single-Root-Regel über alle 17 `x-if`-Templates | **0 Verletzungen**; die beiden per Zeichenkette eingesetzten Banking-Blöcke haben je genau ein Wurzelelement (einzeln nachgewiesen) |
| Smoke-Test | **ALL PASS (31/31)** |
| Dienste | `openclaw-dashboard.service` aktiv, `GET /health` → 200 |

**Die 28 Beanstandungen bei 768 und 1440 px sind kein Fehler**, sondern die in P2-2 bewusst
beschlossene Rücknahme der 44-px-Mindesthöhe oberhalb von 640 px. Sie bestanden vor Phase 2
genauso. Eine davon war neu und ist behoben: der n8n-Link in der Automatisierung war als
`inline-block` nur 42 px hoch (Commit `b0bfc9a`).

**Gegenprobe: keine Bestandsdaten verändert**

`leases` 17 aktiv · `tenants` 26 · Mieter-IDs 31/32/37/38 unverändert · `n24-w6-2024`
unverändert `active` mit denselben Datumsangaben · letzte Änderung in `leases` und `tenants`
jeweils 15.05.2026 · `insta_drafts` 10 Zeilen, letzte Änderung 18.05.2026 · **0** Dateien im
Instagram-Rohmaterial mit heutigem Änderungsdatum · `banking_sync_runs` 3 Zeilen, letzte vom
29.06.2026 · n8n-Ausführungen 0, alle vier Workflows weiterhin `active: false` · Reisen 1 Datei
(die zwei Testreisen aus der Kennungsprüfung sind gelöscht).

Externe Aktionen zu Testzwecken: **keine**.

**Bildschirmfotos**
`~/bikosoc-spec/screens/p2-5-bis-11/` — 28 Dateien: alle 14 Bereiche bei 390 px und bei
1440 px, Gerätefaktor 1, ganze Seitenlänge.

**Gesamtbericht**
`~/bikosoc-spec/report-dashboard-p2-5-bis-11-0920.md`

**Offene Owner-Entscheidung**
- **„Änderungen seit letztem Besuch"** (Spec §5) ist nicht umgesetzt: jede Umsetzung braucht
  eine neue Speicherung, der Auftrag erlaubte sie nur ohne. Drei Varianten mit Empfehlung
  stehen im Bericht §4; der Punkt steht sichtbar in der Tagesübersicht.
- **Optional:** vier weitere Formularfelder bieten Werte an, die die Datenbank per
  CHECK-Bedingung ablehnt (Mietbestandteil, Zählermedium, Ableseart, Vertragsfilter
  „Zukünftig"). Zwei gleichartige Fälle sind in P2-8 behoben; diese vier liegen in
  Schreibwegen, die auch den Core betreffen, und sind nur dokumentiert — Bericht §3.

**Nächster Schritt: CHECKPOINT 2** — vollständige Benutzer- und Mobilprüfung am echten Gerät
gemeinsam mit dem Owner. Die Punkte, die nur dort entschieden werden können, sind in den
Paketeinträgen als „CP2 prüfen" markiert.

---

---

---

### Phase 3 — Abschlusskorrekturen aus CHECKPOINT 2 — 06.10.2026

**Grundlage:** Owner-Smartphone-Test, externe Prüfung und Claude-Browserprüfung aus
CHECKPOINT 2. Reihenfolge wie beauftragt: Block A (Fehler) → B → C → D.

**Durchgeführt — 17 Punkte, 17 Commits**

| Punkt | Thema | Commit |
|---|---|---|
| A1 | „Load failed" am iPhone — Netzschicht mit Wiederholung, HTTP/2, Touch-Icon | `41fe1a2` |
| A2 | Verbindungsstand und Saldostand getrennt benannt (Diagnose: Fall **c**) | `45306ec` |
| A3 | Banking: Umsätze in den Blick holen, Archivieren in die Detailansicht | `29c2846` |
| A4 | Deeplinks aus „Heute" übergeben Objekt und Jahr | `dc9136e` |
| A5 | SharePoint: Dokumentlink zeigt wieder auf das Dokument | `a7486ab` |
| A6 | Vertragsparteien aus `lease_tenants` statt über die Einheit | `a4433ac` |
| A7 | Systemstatus: gespeicherte Zustände nicht als Erfolg | `3120ba6` |
| B | Vier Formularfelder auf zulässige Werte, fünf Schreibwegfehler dazu | `429725d` |
| C1 | Nebenkosten-Zeilen gebündelt, Zähler je Stufe | `f55c22d` |
| C2 | Mobiler Kopf 190 px → 100 px | `2e5c3e9` |
| C3 | Technische Hinweise in einen Diagnose-Abschnitt | `934d503` |
| C4 | Statuserklärung nach der tatsächlichen Logik | `ef2acc0` |
| C5 | „heute"/„gestern" nach dem lokalen Kalendertag | `f33407f` |
| D1 | Deutsche Zahlenformate, Geldbeträge ohne Umbruch | `aa220da` |
| D2 | Begriffe mit Umlauten, „Traveled" auf Deutsch | `4d8540a` |
| D3 | Formatierungsreste in Wiki-Suchausschnitten | `7a746fd` |
| D4 | Objektkarte ohne Foto als flacher Streifen | `b97531f` |

**Neue Dateien und Routen**
- `public/js/netz.js` — eine Netzschicht für alle Abrufe (A1).
- `GET /api/banking/verbindungsstand` — nur lesend, nur Zeitpunkte und Zählwerte (A2).
- `GET /api/assets/leases/:id/parteien` — nur lesend, `lease_tenants` (A6).

**Änderung außerhalb der Repositories**
`/etc/nginx/sites-enabled/openclaw.conf`: HTTP/2 aufgeschaltet
(`listen 46.62.153.181:443 ssl http2;`). Rückweg: `http2` entfernen, `nginx -t`,
`systemctl reload nginx`. Sicherung der alten Datei liegt im Arbeitsverzeichnis der
Sitzung.

**Verbleibende Fehler**
- Fahrzeug `FZG-MB/8`: die Fahrzeugkennung enthält einen Schrägstrich, die Bildadresse
  wird dadurch zu `/api/images/fleet-FZG-MB/8.jpg` und antwortet mit 404. Sichtbare
  Folge ist durch D4 behoben (flacher Streifen statt Leerraum), die 404 bleibt im
  Konsolenprotokoll. Nicht geändert — die Kennung ist ein Bestandsdatum.
- Instagram-Medienvorschau: `/api/instagram/media-proxy` antwortet mit 403. Bestand aus
  Phase 2, nicht Teil des Phase-3-Auftrags.
- `confirm()` wird an 14 Stellen noch verwendet (nicht im Banking-Archivweg, der war
  Gegenstand von A3). P2-4 hatte nur `alert()` ersetzt.

**Offene Owner-Entscheidungen**
- „Änderungen seit dem letzten Besuch" bleibt offen (laut Auftrag nicht zu ändern).
- Kopfzeile „Hans Dampf": unverändert, Entscheidung Nr. 6 steht weiter aus.

**Live-Auswirkung und Rückweg**
- `server.mjs` geändert (A2, A6) → Dienst neu gestartet, `GET /health` → 200.
- Rückweg je Punkt: `git revert <commit>`; für nginx siehe oben.

**Nächster Schritt:** Nachprüfung der Phase-3-Punkte durch den Owner (CP2-Nachprüfung).

---

### Phase 3b — Sammel-Lauf E1 bis E7 — 07.10.2026

Grundlage: Owner-Auftrag vom 07.10.2026 („Korrekturen nach CHECKPOINT 2 (Rest) +
Dropbox-Inbox + Ablaufdoku"). Phase 3 ist am iPhone bestätigt.

**E1 — Wöchentlicher Bankabgleich**

Diagnose zuerst, wie beauftragt. Drei Befunde, alle am Protokoll belegt:

1. **Ein automatischer Montagslauf hat nie existiert.** Banking-E3 (26.06.2026) hatte
   jeden automatischen Bankkontakt abgeschafft; übrig blieb montags **12:00** eine
   Telegram-Nachricht mit Startknopf, ausdrücklich ohne Bankkontakt. Weder ein
   systemd-Timer noch cron, n8n oder ein Gateway-Cron hat je einen Abgleich ausgelöst
   (`crontab -l` leer, `/etc/cron.d` ohne Banking, kein Banking-Timer in
   `systemctl --user list-timers`).
2. **Der Knopf war folgenlos.** Der Owner hat ihn am 13.07., 20.07., 03.08., 10.08.,
   17.08., 24.08. und 31.08.2026 gedrückt — zu jedem Druck steht
   „command-guard: Callback erkannt" im Gateway-Protokoll. In `banking_sync_runs` ist
   der jüngste Lauf unverändert der 29.06.2026, und zwischen `audit_log` #773
   (29.06., `weekly_sync.completed`) und #1349 (05.10., „Bank verbinden") liegt kein
   einzelner Banking-Eintrag. Ursache: Der Kanal liefert einen Klick als Text
   `callback_data: <präfix>_<inhalt>`; `parseCallbackEvent` prüfte auf
   `startsWith('<präfix>_')` und gab `null` zurück. Belegt in `conversation_log` (zwei
   Zeilen mit genau diesem Text) und durch die Protokollzeile „Inbound message …
   28 chars". Betroffen waren **alle** Knopf-Präfixe, nicht nur das Banking.
3. **Die Sitzungsreihenfolge hätte den Lauf zusätzlich scheitern lassen.**
   `listActiveSessions()` sortierte `ORDER BY id`, also älteste zuerst; je Institut wird
   nur eine Sitzung verarbeitet. Nach dem „Bank verbinden" vom 05.10. lagen zwei
   Sitzungen für die Kreissparkasse vor — die alte vom 22.06. (Stand 29.06.) und die
   frische, gültig bis 03.01.2027. Der Abgleich hätte immer die alte genommen.

Nicht die Ursache, geprüft und ausgeschlossen: Sidecar erreichbar
(`/health` → 200), Zugangsdaten entschlüsselbar (beide Sitzungen), Institut nicht
pausiert, SCA-Budget bei 0 von 6, zwei aktive Konten vorhanden.

**Umgesetzt**
- `unwrapCallbackContent()` schält die Transporthülle ab (vier Formen), Commit `5fdd300`.
- Scheduler `[banking-weekly]`, montags **13:00** Europe/Berlin, ruft
  `runWeeklySyncWithReport({ runPhase: 'scheduled' })`. Tagesmarke wird vor dem Lauf
  gesetzt. Telegram an Rolle `operativ`: Erfolg kurz, Fehler mit Grund. Commit `70c4f05`.
- `listActiveSessions()` sortiert jüngste Sitzung zuerst, Commit `70c4f05`.
- `POST /api/banking/accounts/:id/sync` umgesetzt (war HTTP 501),
  genehmigungspflichtig über `banking-accounts.sync`, Commit `1749b36`.
- Schaltfläche „Abgleich jetzt…" auf der Institutskarte mit Genehmigungsdialog, der den
  Bankkontakt und die pushTAN-Möglichkeit ausdrücklich nennt, Commit `5870b74`.
- Nebenbefund: `getSyncStatus()` suchte noch nach `daily_sync.completed` und meldete
  deshalb dauerhaft `never_synced`. Beide Namen zählen jetzt.

**Es wurde KEIN Abgleich ausgelöst** — wie beauftragt. Der Genehmigungsdialog wurde
geöffnet und abgebrochen; einziger Schreibaufruf dabei: `POST approval-preview`.

**E2 — Foto-Upload Objektkarte**

Ursache zweiteilig: `img-src` erlaubte kein `blob:`, deshalb blockierte der Browser das
`<img>` mit der Objekt-URL und die Verkleinerung warf „Bild konnte nicht geladen werden";
und `placeholder.textContent = '⏳'` löschte die beiden `<span>` des Platzhalters, weshalb
danach nur das Kamerasymbol übrig blieb. Nachgemessen mit der echten 4-MB-Datei: alte
Richtlinie → `<img>` mit `blob:` **blockiert**, `createImageBitmap` **ok 1512x2016**.
Jetzt: `blob:` erlaubt, bevorzugt `createImageBitmap` (ohne URL, ohne `<img>`),
Originaldatei als Rückfall, Platzhalter bleibt intakt. Commit `3cfcafc`.

**E3 — Kopfzeile** · Commit `059d17a`. Owner-Entscheidung Nr. 6 ist damit umgesetzt.

**E4 — Vertrag n24-w6-2024** · Status `active` → `ended`, `actual_move_out`
15.11.2024 → 15.11.2025, `termination_date` 30.11.2025 unverändert. Über
`PATCH /api/assets/leases/27` (vorgesehene Core-Route), `audit_log` #1391 mit Vorher- und
Nachher-Zustand. Vollständige Zeile vorher gesichert in
`~/backups/lease-27-vor-e4-20261007.json`. Danach: kein „Klärung"-Abzeichen mehr — weder
für diesen Vertrag noch für einen anderen; die Einheit hat nur noch einen aktiven Vertrag.
Bestand 17 Verträge unverändert (16 aktiv, 1 beendet).

**E5 — Dropbox-Inbox** · Commit `3fac89d`. Echter Durchlauf belegt: Ablage 10:29:06,
lokal 10:29:20, vom Prompt-Inbox-Watcher 10:30:17 übernommen, Prompt in tmux `bikosoc`
angekommen. Alle Testartefakte entfernt.

**E6 — Ablaufdoku** · `~/bikosoc-spec/doku-ablaeufe-20261007.md`, neun Abschnitte, nur
Ist-Zustand.

**E7 — Berichtsdisziplin** · Der Bericht zu diesem Lauf nennt Verträge über
`lease_number`, Konten über Anzahl, nie über IBAN oder Kontonummer; keine Mieternamen.

**Prüfungen und Resultate**
- `npm run build` ohne Fehler · `verify:commands` 118/118 · `verify-schema` ohne Drift
- `npm test` **663 pass, 0 fail, 0 skip** (58 Dateien) · Smoke-Test **31/31**
- Gateway und Dashboard neu gestartet, `GET /health` je 200
- Regression 14 Bereiche × 360/390/768/1440 px: 56 Screenshots in
  `~/bikosoc-spec/screens/p3b/`, **kein** waagerechter Überlauf des Dokuments
- `alert()` im Dashboard = 0 (nur noch in Kommentaren) · `confirm()` im Upload- und
  Banking-Pfad = 0 · `node --check` für alle 19 JS-Dateien, `server.mjs` und den
  Inline-Block grün
- Bestandsdaten vorher = nachher: `banking_sync_runs` 3, `banking_transactions` 1633,
  `banking_accounts` 12, `leases` 17, Bilderbestand 9 Dateien. Einzige Änderung: die
  beauftragte Zeile aus E4.

**Offene Befunde, nicht Teil des Auftrags**
- `GET /api/images/fleet-FZG-MB/8.jpg` → 404: Die Fahrzeugkennung enthält einen
  Schrägstrich, dadurch greift die Route `/api/images/:filename` nicht. Kosmetisch, das
  Fahrzeug hat kein Foto.
- `GET /api/instagram/media-proxy` → 403 für alle Vorschaubilder. Besteht unabhängig von
  diesem Lauf.
- `confirm()` gibt es weiter an zwölf Stellen außerhalb von Upload und Banking (Reisen,
  Entwürfe, Kalender, Dokumente, Verknüpfungen, PE, Nebenkosten, Verträge, Assistent).

**Live-Auswirkung und Rückweg**
- `server.mjs` geändert (CSP, Verbindungsstand) → Dienst neu gestartet, `/health` → 200.
- Neuer systemd-user-Timer `dropbox-inbox.timer` ist aktiv.
  Rückweg: `systemctl --user disable --now dropbox-inbox.timer`.
- Rückweg Code je Punkt: `git revert <commit>`.
- Rückweg E4 (Datenänderung):
  `PATCH /api/assets/leases/27` mit `{"status":"active","actual_move_out":"2024-11-15"}`;
  die vollständige Zeile liegt in `~/backups/lease-27-vor-e4-20261007.json`.

**Nächster Schritt:** zwei Owner-Aktionen — `/arm push` für den Core-Anteil und die
Nachprüfung des Montagsabgleichs am 12.10.2026 ab 13:00 Berliner Zeit.

---

### P4-1 — Aufräumen aus der Ist-Stand-Diagnose — 10.10.2026

Teil E des Arbeitspakets 1 (NK-Datenbasis MG24). Grundlage:
`~/bikosoc-spec/report-dashboard-iststand-20261010.md`.
Gesamtreport: `~/bikosoc-spec/report-paket1-nk-datenbasis-mg24-20261010.md`.

**Durchgeführt**
- **E1 Fahrzeugfoto (404).** `GET /api/images/fleet-FZG-MB/8.jpg` lief ins Leere. Ursache:
  Der Fahrzeugcode `FZG-MB/8` (Mercedes-Benz /8) enthält einen Schrägstrich; die Route
  `/api/images/:filename` endet dort, die Anfrage traf keinen Handler und beantwortete sich
  mit 404 statt mit dem 1x1-Platzhalter. Beim HOCHLADEN filtert der Server dieselbe Kennung
  mit `[^a-zA-Z0-9._-]` und legt `fleet-FZG-MB8.jpg` ab — Lese- und Schreibweg wichen
  auseinander. `imgUrl()` filtert jetzt identisch. Eine Datei lag nicht vor; das Fahrzeug
  zeigt nun korrekt „Foto hinzufügen" statt eines Konsolenfehlers.
- **E2 Audit-Lücke 06.10., 20:20 UTC.** Diagnose, keine Änderung. Die drei Anlagen
  (`lease_charge.create` #1382, `meter.create` #1383, `meter_reading.bulk_create` #1384,
  alle `dashboard:biko`, drei verschiedene request_id) sind echte Bedienschritte aus dem
  Formularpaket P3-B. Die Sequenzen stehen bei `last_value = 1, is_called = t` — je genau
  eine Zeile angelegt und wieder entfernt. **Im Code gibt es keinen Pfad, der diese Zeilen
  ohne Audit-Eintrag löschen kann:** `handleLeaseCharges` kennt nur GET und POST,
  Zählerstände nur GET und POST, und Zähler nur `POST …/archive` — ein protokolliertes
  Soft-Archiv. Kein Skript im Repo fasst die Tabellen an. Bleibt als Erklärung nur eine
  Löschung von Hand an der Produktiv-DB; die ist nach C2 freigabe- und belegpflichtig.
  Audit-Zeilen wurden **nicht** nachgetragen.
- **E3 Berührungsziele unter 44 px.** Beide Fälle bei 390 px nachgestellt: der Link auf ein
  verknüpftes Dokument unter „Reisen" (174x15 px) und „Öffnen ↗" im Bereich SharePoint
  (53x19 px). Neue Klasse `.dok-link` (gleiche Lösung wie `.sp-aktionen a`), angewandt auf
  alle fünf Dokumentlinks dieser Familie.
- **E4 Leerzustand Private Equity.** `readPE()` fing jeden Fehler ab und lieferte `[]` —
  fehlende Ablage, defekte Ablage und leere Liste sahen gleich aus. Neue lesende Route
  `GET /api/pe-zustand` unterscheidet die drei Fälle; der Leerzustand nennt jetzt den
  zutreffenden und den nächsten Schritt. `/api/pe` bleibt unverändert eine Liste.
- **E5 Instagram-Vorschaubilder (12x 403).** Nicht der Proxy. Die Adressen stammen aus
  `media-cache.json` (Stand 11.05.2026) und tragen das Ablauffeld `oe=` — nachgerechnet
  abgelaufen am 16.05.2026; das CDN antwortet seither mit 403, der Proxy reicht ihn durch.
  Der Medien-Cache wird in `src/modules/instagram/**` geholt (HDCC, außerhalb des Auftrags).
  Behoben ist deshalb die Folge, nicht die Ursache: abgelaufene Adressen werden gar nicht
  mehr angefragt (Platzhalter statt Fehler), und der Proxy antwortet auf eine erkennbar
  abgelaufene Signatur mit 410 statt zehn Sekunden auf eine Absage zu warten.
  **Offen als HDCC-Punkt:** Medien-Cache neu holen.
- **E6 Statusdateien.** Diese Datei: Rote-Zone-Freigabe als erledigt nachgetragen (alle fünf
  Core-Commits in `origin/master`, mit `git branch -r --contains` nachgeprüft).
  Im Agent-Repo: `docs/TODO.md` (Hook-Versionierung erledigt, Sprint-6-Cleanup geklärt) und
  `CLAUDE.md` §4 C6 / §8.

**Geänderte Dateien**
- `public/index.html` — `bildDateiSchluessel()` + `imgUrl()` (E1), `.dok-link` an fünf
  Stellen (E3), Leerzustand Private Equity (E4), `instaVorschauAbgelaufen()` (E5)
- `public/css/datenstand.css` — Klasse `.dok-link` (E3)
- `server.mjs` — `GET /api/pe-zustand` (E4), `cdnSignaturAbgelaufen()` im Media-Proxy (E5)
- `prompts/dashboard-ueberarbeitung/STATUS.md` — dieser Eintrag (E6)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `node --check server.mjs` | ok |
| Inline-JS von `index.html` geparst | ok (1 Block, kein Fehler) |
| `grep -n "x-if" public/js/*.js` | nur vorbestehende Stellen in `banking-connect.js`, nicht berührt |
| Dienst-Neustart `openclaw-dashboard` | active |
| Berührungsziele 390 px, Reisen / SharePoint / Fuhrpark / PE / Instagram | **0** unter 44 px (vorher 1 / 1) |
| Fuhrpark 1440 px: HTTP ≥ 400 | **keine** (vorher 404); `fleet-FZG-MB8.jpg` liefert jetzt den 1x1-Platzhalter |
| Instagram 1440 px: HTTP ≥ 400 | **keine** (vorher 12x 403) |
| Private Equity: Text des Leerzustands | „Keine Daten — Die Ablage ist eingerichtet und enthält keine Beteiligung." |
| Core-Gates (Agent-Repo) | build ok · verify:commands 120/120 · verify-schema ALL OK · `npm test` 807/0/0 · Smoke 31/31 |

**Verbleibende Fehler**
- Keine im Dashboard. Instagram-Vorschaubilder bleiben leer, bis der Medien-Cache neu geholt
  wird (HDCC-Punkt, siehe E5).

**Noch nicht verifiziert**
- Die Wirkung von `.dok-link` in den Bereichen Immobilien und Verträge — dort waren zum
  Messzeitpunkt keine verknüpften Dokumente gerendert.

**Offene Entscheidungen**
- E2: ob die Löschung vom 06.10. nachträglich belegt werden soll (Owner weiß, ob er sie
  selbst vorgenommen hat).

**Live-Auswirkung und Rückweg**
- Restart nötig: ja (Dashboard, wegen `server.mjs`) — durchgeführt.
- Rückweg: `git revert <commit>` + `systemctl --user restart openclaw-dashboard.service`.
  Nicht zurückgedreht wird dabei nichts — es gab keine Datenänderung.

**Commit:** siehe `git log` vom 10.10.2026, Betreff
„fix(dashboard): Fahrzeugfoto, Berührungsziele, PE-Leerzustand, Instagram-Vorschau"

---

### P4-2 — Nebenkosten erzeugen keinen Handlungsbedarf mehr — 10.10.2026

Owner-Entscheidung vom 10.10.2026 im Rahmen von Paket 2 (NK-Übernahme MG24).

**Durchgeführt**
- `heutePostenNebenkosten()` in `public/js/tagesuebersicht.js` ersatzlos entfernt. Die
  Funktion erzeugte die gebündelte Zeile „N Objekte mit Abrechnungsblockern" samt
  aufklappbaren Einzelzeilen (Befund C1 aus Phase 3).
- Damit entfällt auch die Zählung: die Kopfzeile „HANDLUNGSBEDARF" zählt nur noch,
  was tatsächlich in der Liste steht.
- Der Abruf von `nk-readiness` je Objekt ist aus der Tagesübersicht entfernt — sechs
  lesende Anfragen weniger je Seitenaufbau. Die §-556-Pflichten werden weiterhin
  abgerufen; sie speisen die Zeile unter „Datenquellen".
- **Nicht geändert:** Die Abrechnungsreife bleibt unverändert sichtbar unter
  Immobilien → Nebenkosten → Vorprüfung und Immobilien → Status & Abrechnungsreife,
  weiterhin mit den deutschen Erklärungen aus `nk-befunde.js`.
- **Telegram:** Aus dieser Quelle gab es nie eine Meldung. Geprüft im Agent-Repo:
  Die einzige NK-Benachrichtigung ist `src/modules/nk/alerts.ts` und meldet die
  §-556-Fristen aus `nk_period_obligations` (Tabelle leer). Kein Code-Pfad meldet
  `blocking_count`. Es war also nichts abzuschalten.

**Geänderte Dateien**
- `public/js/tagesuebersicht.js`
- `prompts/dashboard-ueberarbeitung/STATUS.md` (dieser Eintrag)

**Prüfungen und Resultate**

| Prüfung | Resultat |
|---|---|
| `node --check public/js/tagesuebersicht.js` | ok |
| Dienst-Neustart `openclaw-dashboard` | active |
| Tagesübersicht live (1440 px) | „1 kritisch · 2 dringend · 6 vorgemerkt" — vorher zusätzlich „6 offen" aus den NK-Blockern; kein Treffer mehr auf „Nebenkosten"/„blockierend" |
| Konsolenfehler / HTTP ≥ 400 | keine |
| Immobilien → Nebenkosten → Vorprüfung (MG24, 2025) | lädt, zeigt „0 blockierende Befunde, 22 Warnungen" mit Klartext-Erklärungen |

**Verbleibende Fehler**
- keine

**Noch nicht verifiziert**
- Das Verhalten am iPhone; geprüft wurde am Desktop und zuvor bei 390 px.

**Offene Entscheidungen**
- keine

**Live-Auswirkung und Rückweg**
- Restart nötig: ja (Dashboard) — durchgeführt.
- Rückweg: `git revert <commit>` + `systemctl --user restart openclaw-dashboard.service`.
  Keine Datenänderung.

**Commit:** siehe `git log` vom 10.10.2026, Betreff
„feat(tagesuebersicht): Nebenkosten erzeugen keinen Handlungsbedarf mehr"

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
