# Executive Dashboard — CLAUDE.md

**Stand: 2026-03-03**

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
POST      /api/upload/image
GET       /api/images/:filename
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

Trips | Health | Drafts | Kalender | Fuhrpark | Assets | SharePoint | Dokumente | Instagram

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
  openclaw-trading (18793), ibgateway (7497), xvfb (:1)
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
- `260509-raw-0905-01.jpg`   (erste Datei in Raw-Session raw-0905)
- `260509-raw-0905-02.mp4`   (zweite Datei)
- `260506-sub-strand-01.jpg` (Submission-Bild)

Nummerierung in Upload-Reihenfolge, zweistellig (01, 02, ...).
Niemals: Hashes, UUIDs, Timestamps allein, Telegram-interne Dateinamen
(z.B. `file_60---AgACAgIAAxkDAAIC.jpg`).

## Trading Safety

- Paper Trading Account: DUP514636 — kein echtes Geld
- Live Trading nur nach expliziter schriftlicher Freigabe durch Operator
- Kill-Switch (/tradekill) hat immer höchste Priorität
