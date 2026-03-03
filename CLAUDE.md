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
