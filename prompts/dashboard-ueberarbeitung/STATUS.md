# STATUS — Dashboard-Überarbeitung

Fortschreiben nach **jedem** Arbeitspaket. Keine Erfolgsmeldung ohne tatsächliches Prüfergebnis.

**Letzte Aktualisierung:** 04.10.2026, 17:00 UTC
**Aktuelle Phase:** Phase 0 abgeschlossen — Phase 1 nicht begonnen
**Sicherungsstand:** Tag `pre-dashboard-ueberarbeitung-20261004` → Commit `735d5b8`
**Änderungsstand Code:** funktional unverändert gegenüber `735d5b8`; HEAD ist `1fe1499`
(nur Arbeitsdateien unter `prompts/dashboard-ueberarbeitung/` hinzugefügt)

---

## Paketübersicht

| Paket | Thema | Aufwand | Status | Commit | Prüfung |
|---|---|---|---|---|---|
| **Phase 0** | Bestandsaufnahme, Sicherung, Arbeitsdateien | — | **erledigt** | `1fe1499` | Report `~/bikosoc-spec/report-dashboard-phase0-1700.md` |
| P1-1 | Aktualität und Statuskonsistenz (A, B) | L | offen | — | — |
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
