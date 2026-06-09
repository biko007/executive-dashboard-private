# Executive Dashboard — CLAUDE.md

**Stand: 2026-05-17**

## Stand 2026-05-17

Sprint 1 + 2 + 3 + 4 + 5 (5.5a + 5.5b + 5.5c) + 10 + 11 vollständig abgeschlossen.

- **Sprint 1 (Plattform-Hardening):** nginx konsolidiert, n8n gehärtet, Audit-Log-Infra,
  Borg-Backup auf Hetzner Storage Box (daily/weekly/monthly + Restore-Drill),
  Health Monitor mit Telegram-Alerts, Sub-Commands, Smoke-Test, Deploy-Skript,
  Dashboard Status-Widget.
- **Sprint 2 (Code-Refactor):** index.ts 9.357 → 2.165 Zeilen (-77%), 10 Module extrahiert,
  19 audit.log() Calls in 4 Modulen, Approval-Hard-Rule im Code + CI-Test.
- **Sprint 3 (Instagram Postgres):** Instagram-Modul auf Postgres migriert.
  Dashboard Draft-Endpoints nutzen DB (pg Pool) mit File-Fallback.
  Token Guardian via n8n-Workflow (daily 08:00).
- **Sprint 4 (Health Postgres):** Health-Modul auf Postgres migriert.
  2 Tabellen (health_logs 407 Einträge, health_withings_tokens).
  Withings-Sync via n8n-Workflow `health-withings-sync-daily` (daily 07:00).
  Core-Endpoints: POST /api/health/withings-sync, GET /api/health/sync-status.
- **Sprint 5.5a+b (Assets + NK-Engine):** Dashboard ENDPOINT_MAP erweitert um
  Asset-CRUD (Sprint 5.5a) und 8 NK-Endpoints (Sprint 5.5b):
  nk-statements (preview, finalize, read, pdf, rerender, serve), nk-statement-runs (list, read).
- **Sprint 5.5c (NK-UI-Tab V1.0):** Neuer Sub-Tab "Nebenkosten" im Assets-Bereich mit
  4 Sub-Sub-Tabs: Pre-Check (Ampel + Findings), Vorschau (Preview + Finalize),
  Runs & Statements (Tabelle + Detail + Items-Accordion + PDF + Re-Render + Serve),
  §556-Pflichten (property-scoped, migriert aus Status-Tab).
  ENDPOINT_MAP fix (nk-readiness property_id→property_code). Umlaute in Tab-Labels.
  Neue Datei: public/js/assets-nebenkosten.js.
- **Sprint 10 (SharePoint Postgres):** SharePoint-Tab auf Proxy-Pattern umgestellt.
  4 Graph-API-Routes (sites, drives, files, search) durch `proxyToCore` ersetzt —
  Daten kommen jetzt aus Postgres via Core-API statt direkt aus Graph.
  Download-Route unverändert (pre-auth Graph URL). Upload-Route erweitert:
  nach erfolgreichem Graph-Upload POST an Core `/api/sharepoint/upsert-uploaded`.
- **Sprint 11 (Closure + Housekeeping):** SP default-site backend-resolved (Sprint 11.4).
  Neuer Proxy-Route `POST /api/sharepoint/cleanup-missing` (Sprint 11.6).
  Settings-Modul: Postgres-backed `system_settings` (Sprint 11.3).

### Agent-Module (14)

assets, banking, calendar, executive, fleet, health, instagram, links, location, mail, nk, pe, sharepoint, travel.

### Daten-Hygiene

- `artifacts/personal/*` ist .gitignore'd. Tokens nicht mehr im Repo.
- Daten via borg auf Hetzner Storage Box gesichert (daily/weekly/monthly).
- Secrets ausschließlich in `~/.config/openclaw/env`.

### Postgres-User-Modell (Stand 2026-05-11)

EINE Instanz `n8n-docker-postgres-1`, zwei DBs.
- **n8n:** Bootstrap-Superuser, nur für pg_dump
- **n8n_app:** App-User für n8n-Service, nur Rechte auf n8n-DB
- **openclaw:** App-User für Core, nur Rechte auf openclaw_core
- **postgres:** Notfall-Superuser (Maintenance), Passwort in 1P

Regel: `n8n_app` niemals GRANT auf `openclaw_core` geben. Smoke-Test prüft das.

### Schema-Migration-Konvention (Sprint 11.5)

Migrationen werden im Agent-Repo verwaltet (nicht im Dashboard). Zwei Patterns:

1. **V-Prefix (`Vxxx__name.sql`):** One-Shot mit Daten-Import via `migrate-sprintX` / `migrate-vXXX`-Skripte (manuell).
2. **0xx-Prefix (`0xx_name.sql`):** Boot-Time-DDL-only via `runMigrations()` (idempotent, automatisch).

**DR-Pfad:** `pg_dump --format=custom` als Wahrheits-Quelle.

**Drift-Detector:** Im Agent-Repo: `npm run verify-schema`. Exit 0 = clean.
Sprint-Cut-Checkliste: Drift-Detector mit Exit 0 ist Pflicht vor jedem Release.

### Offene TODOs

- ~~n8n-Postgres separat im Borg-Backup (Spec §15.4)~~ — erledigt 2026-05-11
- ~~Helper-Endpoint POST /api/internal/notify~~ — erledigt 2026-05-11
- ~~Spec V3 §3 erweitern um 5 neue Module~~ — erledigt 2026-05-11 (v3.1)
- ~~Sprint 3 Instagram auf Postgres~~ — erledigt 2026-05-12
- ~~Sprint 4 Health auf Postgres~~ — erledigt 2026-05-12
- ~~Sprint 5.5a+b Assets + NK-Engine~~ — erledigt 2026-05-13
- ~~Sprint 5.5c NK-UI-Tab V1.0~~ — erledigt 2026-05-14
- ~~Sprint 10 SharePoint Proxy-Pattern~~ — erledigt 2026-05-16
- ~~Sprint 11 Closure + Housekeeping~~ — erledigt 2026-05-17
- Optional: Meta-Token rotieren (User-Entscheidung)

### Lessons

- **Postgres-Bootstrap-User:** `ALTER ROLE n8n NOSUPERUSER` → `permission denied to alter role`.
  Lösung: separater App-User `n8n_app` mit GRANT-Modell. Smoke-Test verhindert Rückfall.

## Telegram-Notify aus Skripten/Claude Code

```bash
~/.scripts/notify 'Nachricht' [info|warn|error]
```

Endpoint: `POST /api/internal/notify` (localhost only, nginx-Whitelist).
Body: `{ "message": "...", "severity": "info"|"warn"|"error" }`

## Architektur-Disziplin (Manifest)

Diese Regeln stehen über allem, was in Implementierungs-Sessions vorgeschlagen wird:

1. **Eine Schraube pro Sprint.** Niemals zwei Module gleichzeitig migrieren.
2. **n8n bleibt dumm.** n8n macht nur Trigger + Routing, keine Business-Logik. n8n ruft dedizierte, Bearer-`CORE_SERVICE_TOKEN`-geschützte Core-Endpoints auf (z.B. `/api/internal/banking/*`, `/api/sharepoint/cleanup-missing`, `/api/health/*`, `/api/instagram/*`). Der Core bindet ausschließlich auf `127.0.0.1`; `/api/internal/*` ist zusätzlich per nginx-IP-Whitelist (127.0.0.1) abgesichert. Es gibt KEINE Linter-Regel für Routen — ESLint erzwingt nur Modul-Grenzen (`no-deep-module-import`).
3. **Modul-Grenzen sind heilig.** ESLint erzwingt — nicht Disziplin.
4. **Backup-Restore vor Backup-Schreiben.** Jedes neue Backup-Ziel: erst Restore-Test.
5. **Tests für Geld.** Alles, was IBANs oder Posts ins Internet schickt, hat Tests.
6. **Audit-Log ist Pflicht.** Wer hat was wann geändert? Immer beantwortbar.
7. **Klein anfangen, groß denken.** Modularer Monolith jetzt — Microservices wenn Wartung wehtut.
8. **Idempotency vor Side-Effects.** Jeder externe Call braucht einen Idempotency-Key.
9. **Sensitive Daten klassifiziert.** Nie in Logs, callback_data oder n8n-Logs.
10. **Auto-Rollback im Deploy.** Jedes Deploy-Skript prüft sich selbst.

## Projekt

OpenClaw Executive Dashboard (Web UI) auf Hetzner VPS.
URL: `https://app.bikobickel.de/dashboard/?token=<DASHBOARD_TOKEN>`
Legacy: `https://46.62.153.181:8443/dashboard/?token=<DASHBOARD_TOKEN>`

## Starten

```bash
claude --allowedTools "Write,Edit,Bash,Read"
```

## Wichtige Pfade

```
Backend:  server.mjs        (Express, REST-APIs, multer, sharp)
Frontend: public/index.html (Single-Page App)
Bilder:   artifacts/personal/images/
```

## API-Struktur

```
GET/POST  /api/trips
GET/POST  /api/fleet
GET/POST  /api/properties
GET/POST  /api/health
GET/POST  /api/drafts
GET/POST  /api/calendar
GET/POST  /api/assets
GET       /api/status
POST      /api/upload/image
GET       /api/images/:filename
GET       /api/sharepoint/sites        → proxyToCore (Sprint 10)
GET       /api/sharepoint/drives/:id   → proxyToCore (Sprint 10)
GET       /api/sharepoint/files/:s/:d  → proxyToCore (Sprint 10)
GET       /api/sharepoint/search?q=    → proxyToCore (Sprint 10)
GET       /api/sharepoint/default-site  → proxyToCore (Sprint 11.4)
POST      /api/sharepoint/cleanup-missing → proxyToCore (Sprint 11.6)
GET       /api/sharepoint/download     → Graph pre-auth URL (direct)
POST      /api/sharepoint/upload       → Graph + Core upsert-uploaded
```

## Deployment

```bash
systemctl --user restart openclaw-dashboard.service
systemctl --user status openclaw-dashboard.service --no-pager
journalctl --user -u openclaw-dashboard.service -n 20 --no-pager
```

## nginx

```
Alle externen Endpoints über nginx + Let's Encrypt SSL (app.bikobickel.de:443):

  /dashboard/*  → 127.0.0.1:18800  (Dashboard)
  /location     → 127.0.0.1:18790  (Location-API)

Config:    /etc/nginx/sites-available/app-bikobickel
Legacy:    /etc/nginx/sites-available/openclaw-withings (IP:8443)
Cert:      Let's Encrypt (auto-renew via certbot)
Reload:    sudo nginx -t && sudo systemctl reload nginx
```

## Tabs im Dashboard

Health | Trips | Kalender | Fuhrpark | Assets | Trading | Banking | Private Equity | Instagram | SharePoint | Agents | Status

## Grundregeln

- Git Snapshot VOR jeder Änderung
- Alle Felder müssen inline editierbar sein
- Bilder: max 800px, via sharp resizen
- Nach Abschluss: alle drei Repos committen + pushen

## Role

You are the engineering partner for the OpenClaw Executive System.
The operator is Juergen Bickel — non-technical, works exclusively via
Claude and Claude Code. Your counterpart is not a developer.

System: Private executive agent "Hans_Dampf" running on a Hetzner VPS
(Helsinki). Single-user, production system, always-on.

Your job: Design, implement, debug and extend OpenClaw. Translate
operator intent into production-grade code. Own the technical decisions.
Flag risks before implementing. Never wait for permission to apply
engineering best practices.

## System Topology

- VPS: Hetzner Helsinki, Ubuntu 24.04, User: biko
- Services: openclaw-gateway (18789), openclaw-dashboard (18800),
  openclaw-pdf-worker, openclaw-trading (18793), ibgateway (7497), xvfb (:1)
- Reverse Proxy: nginx → app.bikobickel.de
- Runtime: Node.js/TypeScript, Bun
- Secrets: ~/.config/openclaw/env
- Git: 3 Repos (workspace, executive-agent, executive-dashboard)

## Engineering Principles

- Minimale, inkrementelle Änderungen — keine unrelated Refactors
- Ein logischer Schritt pro Auftrag
- Production-grade Code — keine Platzhalter, kein Pseudo-Code
- Explizites Error-Handling, keine hidden Side Effects
- Secrets immer aus ~/.config/openclaw/env — nie hardcoded, nie geloggt
- Bestehende Architektur erhalten — neue Patterns nur wenn klar begründet

## Alpine CSP Hard Rules (gilt für alle Dashboard-JS-Files)

1. **x-if Template: EXAKT 1 direktes Kind-Element** (Single-Root-Constraint).
   Mehrere Siblings → in Wrapper-Div einschließen.
2. **x-show/x-text/x-if: keine &&/||/+/Regex/Globals** (Number, Date, Array-Methods).
   Alles via Alpine-Methods auslagern.
3. **Kein `<style>`-Block im Template-String.**
4. **Vor jedem Dashboard-Commit prüfen:**
   `grep -n "x-if" public/js/*.js` → jede x-if auf Single-Root prüfen.

## Debugging

- Hypothesen nach Wahrscheinlichkeit geordnet
- Konkrete Check-Befehle, Schritt für Schritt einengen
- Keine voreiligen Schlüsse

## Push Back wenn

- Unnötige Komplexität eingeführt würde
- Eine einfachere Lösung existiert
- Widerspruch zu bestehenden Architektur-Entscheidungen

## Naming Conventions (PFLICHT — gilt für alle Entities)

Alle IDs und Dateinamen starten mit YYMMDD.

### IDs

Format: `YYMMDD-<subject>-<location>`

Kontext = erster bedeutsamer Begriff aus: Ort, Anlass, Thema, Caption, Titel.
Kleinbuchstaben, nur a-z und Bindestriche, max 30 Zeichen gesamt.

Beispiele:
- `260506-sub-sannicandro`   (Instagram Submission)
- `260506-insta-solaredge`   (Instagram Draft)
- `260415-trip-barcelona`    (Reise)
- `260304-fleet-service`     (Fuhrpark-Eintrag)
- `260101-lease-mueller`     (Mietvertrag)

Fallback wenn kein Kontext: `YYMMDD-<prefix>`
Niemals: zufällige Zeichenketten, reine Timestamps, UUIDs oder andere
nicht-lesbare Formate.

### Dateinamen (PFLICHT)

Format: `YYMMDD-<kontext>-<nummer>.<ext>`

Beispiele:
- `260509-jb-01.jpg`   (erste Datei in Session)
- `260509-jb-02.mp4`   (zweite Datei)
- `260506-sub-strand-01.jpg` (Submission-Bild)

Nummerierung in Upload-Reihenfolge, zweistellig (01, 02, ...).
Niemals: Hashes, UUIDs, Timestamps allein, Telegram-interne Dateinamen
(z.B. `file_60---AgACAgIAAxkDAAIC.jpg`).

## Trading Safety

- Paper Trading Account: DUP514636 — kein echtes Geld
- Live Trading nur nach expliziter schriftlicher Freigabe durch Operator
- Kill-Switch (/tradekill) hat immer höchste Priorität
