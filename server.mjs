import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || '/root';
// Bind to localhost only — nginx proxies 8443 → here
const PORT = 18800;
const BIND = '127.0.0.1';

// ── Env ──────────────────────────────────────────────────────────────────────

function readEnvFile() {
  const out = {};
  try {
    const content = fs.readFileSync(
      path.join(HOME, '.config/openclaw/env'), 'utf8'
    );
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      const eq = line.indexOf('=');
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && v) out[k] = v;
    }
  } catch {}
  return out;
}

const ENV = readEnvFile();
const DASHBOARD_TOKEN   = ENV.DASHBOARD_TOKEN   || '';
const ANTHROPIC_API_KEY = ENV.ANTHROPIC_API_KEY  || '';
const M365_TENANT_ID    = ENV.M365_TENANT_ID    || '';
const M365_CLIENT_ID    = ENV.M365_CLIENT_ID    || '';
const M365_CLIENT_SECRET= ENV.M365_CLIENT_SECRET|| '';
const M365_USER         = ENV.M365_USER         || '';

// ── Paths ─────────────────────────────────────────────────────────────────────

const TRAVEL_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/travel');
const HEALTH_LOG  = path.join(HOME, '.openclaw/workspace/artifacts/personal/health/health-log.jsonl');
const DRAFTS_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/mail-drafts');
const DOCS_DIR    = path.join(HOME, '.openclaw/workspace/artifacts/personal/documents');
const DOCS_META   = path.join(DOCS_DIR, 'metadata.json');
const DOCS_CATEGORIES = ['vertraege', 'rechnungen', 'notizen', 'sonstiges'];
const FLEET_DIR   = path.join(HOME, '.openclaw/workspace/artifacts/personal/fleet');
const FLEET_FILE  = path.join(FLEET_DIR, 'vehicles.json');
const LINKS_DIR   = path.join(HOME, '.openclaw/workspace/artifacts/personal/links');
const LINKS_FILE  = path.join(LINKS_DIR, 'links.json');
const SP_INDEX_FILE = path.join(HOME, '.openclaw/workspace/artifacts/personal/sharepoint/sharepoint-index.json');
const INSTA_DIR   = path.join(HOME, '.openclaw/workspace/artifacts/personal/instagram');
const ASSETS_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/assets');
const PROPERTIES_FILE = path.join(ASSETS_DIR, 'properties.json');
const LEASES_FILE = path.join(ASSETS_DIR, 'leases.json');
const COSTS_DIR   = path.join(ASSETS_DIR, 'operating-costs');
const IMAGES_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/images');

// ── Auth middleware ───────────────────────────────────────────────────────────

function auth(req, res, next) {
  if (!DASHBOARD_TOKEN) {
    return res.status(500).json({ error: 'DASHBOARD_TOKEN not configured in ~/.config/openclaw/env' });
  }
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const qtoken = req.query.token || '';
  if (bearer === DASHBOARD_TOKEN || qtoken === DASHBOARD_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Graph token cache ─────────────────────────────────────────────────────────

const graphCache = { token: '', expiresAt: 0 };

async function getGraphToken() {
  if (graphCache.token && Date.now() < graphCache.expiresAt) return graphCache.token;
  const form = new URLSearchParams({
    client_id:     M365_CLIENT_ID,
    scope:         'https://graph.microsoft.com/.default',
    client_secret: M365_CLIENT_SECRET,
    grant_type:    'client_credentials',
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${M365_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(), signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`Graph token HTTP ${res.status}`);
  const data = await res.json();
  graphCache.token     = data.access_token;
  graphCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return graphCache.token;
}

async function graphGet(url) {
  const token = await getGraphToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Graph API HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

async function graphRequest(method, url, body) {
  const token = await getGraphToken();
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Graph API HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  if (res.status === 204) return {};
  return res.json();
}

// ── Trip AI enrichment (Claude Haiku) ────────────────────────────────────────

async function enrichTripWithHaiku(name) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');

  const prompt =
    `Du hilfst bei der Reiseplanung. Der Nutzer plant eine Reise nach "${name}".\n` +
    `Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text davor/danach):\n` +
    `{\n` +
    `  "destination": "<Hauptstadt oder bekannteste Stadt des Ziels>",\n` +
    `  "country": "<Land auf Deutsch>",\n` +
    `  "country_code": "<ISO-3166-1-Alpha-2-Ländercode, z.B. JP>",\n` +
    `  "lat": <Breitengrad der Destination als Dezimalzahl, z.B. 35.6895>,\n` +
    `  "lon": <Längengrad der Destination als Dezimalzahl, z.B. 139.6917>,\n` +
    `  "climate": "<eines von: tropical|temperate|cold|desert|mixed>",\n` +
    `  "activities": ["<eines oder mehrere von: business|leisure|outdoor|beach|city>"],\n` +
    `  "currency": "<Währungsname und Symbol, z.B. Japanischer Yen (¥)>",\n` +
    `  "visa_de": "<Visapflicht für deutschen Pass, z.B. 'kein Visum erforderlich (bis 90 Tage)'>",\n` +
    `  "distance_km": <Luftlinie in km von Tuttlingen (48.0641°N, 8.8236°E) als ganze Zahl>,\n` +
    `  "travel_mode": "<Empfohlenes Hauptverkehrsmittel, z.B. Flugzeug, Zug, Auto>",\n` +
    `  "door_to_door_estimate": "<Haustür-zu-Haustür Zeitschätzung ab Tuttlingen, z.B. 'ca. 14-16 Stunden (Flug FRA + Transfers)'>",\n` +
    `  "exchange_rate_eur": "<Wechselkurs: wie viel Landeswährung bekommt man für 1 EUR, z.B. '1 EUR ≈ 160 JPY' oder '1 EUR ≈ 1,08 USD'>"\n` +
    `}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Kein JSON in Haiku-Antwort');

  const p = JSON.parse(jsonMatch[0]);
  return {
    destination:           String(p.destination || name),
    country_code:          String(p.country_code || '').toUpperCase(),
    lat:                   Number(p.lat) || 0,
    lon:                   Number(p.lon) || 0,
    climate:               String(p.climate || 'temperate'),
    activities:            Array.isArray(p.activities) ? p.activities.map(String) : ['leisure'],
    currency:              String(p.currency || ''),
    visa_de:               String(p.visa_de || ''),
    distance_km:           Number(p.distance_km) || 0,
    travel_mode:           String(p.travel_mode || ''),
    door_to_door_estimate: String(p.door_to_door_estimate || ''),
    exchange_rate_eur:     String(p.exchange_rate_eur || ''),
  };
}

async function fetchWeatherForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto&forecast_days=7`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = await res.json();
  const d = data?.daily;
  if (!d?.time?.length) return [];
  return d.time.map((date, i) => ({
    date,
    tmax: Math.round(d.temperature_2m_max[i] ?? 0),
    tmin: Math.round(d.temperature_2m_min[i] ?? 0),
    precip: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
  }));
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── API: Images ──────────────────────────────────────────────────────────────

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Serve images (token required via query param)
app.get('/api/images/:filename', auth, (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '');
  const fp = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Image not found' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(fp);
});

// Upload + resize image
app.post('/api/upload/image', auth, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const entityType = String(req.body.entityType || '').replace(/[^a-z]/g, '');
    const entityId = String(req.body.entityId || '').replace(/[^a-zA-Z0-9._\-]/g, '');
    if (!entityType || !entityId) return res.status(400).json({ error: 'entityType and entityId required' });

    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    const filename = `${entityType}-${entityId}.jpg`;
    const outPath = path.join(IMAGES_DIR, filename);

    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(outPath);

    res.json({ imagePath: `/api/images/${filename}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete image
app.delete('/api/images/:filename', auth, (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '');
  const fp = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ ok: true });
});

// ── API: Instagram Media Cache ────────────────────────────────────────────────

app.get('/api/instagram/media', auth, (req, res) => {
  try {
    const file = path.join(INSTA_DIR, 'media-cache.json');
    if (!fs.existsSync(file)) return res.json({ items: [] });
    const cache = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(cache);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Trips ────────────────────────────────────────────────────────────────

app.get('/api/trips', auth, (req, res) => {
  try {
    if (!fs.existsSync(TRAVEL_DIR)) return res.json([]);
    const trips = fs.readdirSync(TRAVEL_DIR)
      .filter(f => f.endsWith('.json'))
      .flatMap(f => {
        try { return [JSON.parse(fs.readFileSync(path.join(TRAVEL_DIR, f), 'utf8'))]; }
        catch { return []; }
      })
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    res.json(trips);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/trips', auth, async (req, res) => {
  try {
    const { id, name, destination, start_date, end_date, climate, activities } = req.body;
    if (!id || !name || !start_date || !end_date) {
      return res.status(400).json({ error: 'id, name, start_date and end_date are required' });
    }
    const safeId = String(id).replace(/[^a-z0-9\-_]/gi, '');
    if (!safeId) return res.status(400).json({ error: 'Invalid trip id' });
    const filePath = path.join(TRAVEL_DIR, `${safeId}.json`);
    if (!filePath.startsWith(TRAVEL_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'Trip with this ID already exists' });
    }
    if (!fs.existsSync(TRAVEL_DIR)) fs.mkdirSync(TRAVEL_DIR, { recursive: true });
    const trip = {
      id: safeId,
      name: String(name),
      destination: String(destination || ''),
      start_date: String(start_date),
      end_date: String(end_date),
      climate: String(climate || ''),
      activities: Array.isArray(activities) ? activities.map(String) : [],
      segments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // AI enrichment via Claude Haiku
    const enrichTarget = destination || name;
    if (ANTHROPIC_API_KEY && enrichTarget) {
      try {
        console.log(`[dashboard] Enriching trip "${enrichTarget}" via Haiku …`);
        const enriched = await enrichTripWithHaiku(enrichTarget);
        if (!trip.destination && enriched.destination) trip.destination = enriched.destination;
        trip.country_code          = enriched.country_code;
        trip.climate               = enriched.climate;
        trip.activities            = enriched.activities;
        trip.currency              = enriched.currency;
        trip.visa_de               = enriched.visa_de;
        trip.distance_km           = enriched.distance_km;
        trip.travel_mode           = enriched.travel_mode;
        trip.door_to_door_estimate = enriched.door_to_door_estimate;
        trip.exchange_rate_eur     = enriched.exchange_rate_eur;

        // Weather forecast via Open-Meteo
        if (enriched.lat && enriched.lon) {
          try {
            const forecast = await fetchWeatherForecast(enriched.lat, enriched.lon);
            if (forecast.length) trip.weather_forecast = forecast;
          } catch (wErr) {
            console.log(`[dashboard] Weather fetch failed: ${wErr.message}`);
          }
        }
        console.log(`[dashboard] Enrichment done for "${enrichTarget}"`);
      } catch (aiErr) {
        console.log(`[dashboard] AI enrichment failed: ${aiErr.message}`);
        // Trip still gets created, just without enrichment
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(trip, null, 2));

    // Auto-create M365 calendar event for the trip
    if (M365_TENANT_ID && M365_CLIENT_ID && M365_CLIENT_SECRET && M365_USER) {
      try {
        const calTitle = `${trip.name}${trip.destination ? ' – ' + trip.destination : ''}`;
        const bodyParts = [
          trip.destination && `Ziel: ${trip.destination}`,
          trip.climate     && `Klima: ${trip.climate}`,
          trip.activities?.length && `Aktivitäten: ${trip.activities.join(', ')}`,
        ].filter(Boolean);
        const calUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events`;
        await graphRequest('POST', calUrl, {
          subject: calTitle,
          isAllDay: true,
          start: { dateTime: `${trip.start_date}T00:00:00`, timeZone: 'Europe/Berlin' },
          end:   { dateTime: `${trip.end_date}T00:00:00`,   timeZone: 'Europe/Berlin' },
          body:  bodyParts.length ? { contentType: 'Text', content: bodyParts.join('\n') } : undefined,
        });
        console.log(`[dashboard] Calendar event created for trip "${trip.name}"`);
      } catch (calErr) {
        console.log(`[dashboard] Calendar event creation failed: ${calErr.message}`);
      }
    }

    res.status(201).json(trip);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/trips/:id', auth, (req, res) => {
  try {
    // Strict sanitization: only allow slug-safe characters
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid trip id' });
    const filePath = path.join(TRAVEL_DIR, `${id}.json`);
    // Guard against path traversal (redundant after sanitize, but belt-and-suspenders)
    if (!filePath.startsWith(TRAVEL_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Trip not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/trips/:id', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid trip id' });
    const filePath = path.join(TRAVEL_DIR, `${id}.json`);
    if (!filePath.startsWith(TRAVEL_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Trip not found' });
    const trip = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allowed = ['name', 'destination', 'start_date', 'end_date', 'climate', 'activities', 'segments'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) trip[key] = req.body[key];
    }
    trip.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(trip, null, 2));
    res.json(trip);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Health ───────────────────────────────────────────────────────────────

app.get('/api/health', auth, (req, res) => {
  try {
    const days = Math.min(Math.max(1, Number(req.query.days) || 30), 365);
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    if (!fs.existsSync(HEALTH_LOG)) return res.json([]);
    let entries = fs.readFileSync(HEALTH_LOG, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } })
      .filter(e => (e.timestamp || '') >= cutoff);

    // Aggregate sleep sessions per night (sum durations, avg quality)
    const sleepByNight = new Map();
    const nonSleep = [];
    for (const e of entries) {
      if (e.type === 'sleep' && e.value != null) {
        const day = e.timestamp.slice(0, 10);
        const prev = sleepByNight.get(day);
        if (prev) {
          prev.value += e.value;
          prev.deep_sleep_h = (prev.deep_sleep_h || 0) + (e.deep_sleep_h || 0);
          prev.rem_sleep_h = (prev.rem_sleep_h || 0) + (e.rem_sleep_h || 0);
          prev.light_sleep_h = (prev.light_sleep_h || 0) + (e.light_sleep_h || 0);
          if (e.quality && e.quality > (prev.quality || 0)) prev.quality = e.quality;
        } else {
          sleepByNight.set(day, { ...e });
        }
      } else {
        nonSleep.push(e);
      }
    }
    entries = [...nonSleep, ...sleepByNight.values()];

    entries = entries.map(e => {
        // Normalize steps: value lives in e.steps, not e.value
        if (e.type === 'steps') {
          e.value = e.steps ?? 0;
          e.unit = 'Schritte';
        }
        // Normalize heartrate
        if (e.type === 'heartrate') {
          e.value = e.hr_avg ?? 0;
          e.unit = 'bpm';
        }
        // Normalize activity: build a readable value string
        if (e.type === 'activity') {
          const parts = [];
          if (e.duration_min) parts.push(`${e.duration_min} min`);
          if (e.steps)        parts.push(`${e.steps} Schritte`);
          if (e.distance_m)   parts.push(`${(e.distance_m / 1000).toFixed(1)} km`);
          if (e.calories)     parts.push(`${e.calories} kcal`);
          e.value = parts.join(', ') || null;
          e.unit = '';
          e.text = e.activity_type || '';
        }
        // Round aggregated sleep values
        if (e.type === 'sleep') {
          e.value = Math.round(e.value * 10) / 10;
        }
        return e;
      })
      // Filter out activity entries with no useful metrics
      .filter(e => {
        if (e.type !== 'activity') return true;
        return e.steps || e.distance_m || e.calories || e.hr_avg;
      })
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Health Trends & Alerts ───────────────────────────────────────────────

function readHealthEntries(daysCutoff) {
  if (!fs.existsSync(HEALTH_LOG)) return [];
  const cutoff = new Date(Date.now() - daysCutoff * 86_400_000).toISOString();
  return fs.readFileSync(HEALTH_LOG, 'utf8')
    .split('\n').filter(Boolean)
    .flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } })
    .filter(e => (e.timestamp || '') >= cutoff);
}

function computeWeightTrend(days) {
  const entries = readHealthEntries(days).filter(e => e.type === 'weight' && e.value != null);
  if (!entries.length) return null;
  const values = entries.map(e => e.value);
  const current = values[values.length - 1];
  const first = values[0];
  const change = +(current - first).toFixed(2);
  const avg = +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const direction = Math.abs(change) < 0.3 ? 'stable' : change > 0 ? 'up' : 'down';
  return {
    current: +current.toFixed(1), min: +Math.min(...values).toFixed(1),
    max: +Math.max(...values).toFixed(1), avg, change: +change.toFixed(1),
    direction, dataPoints: values.length,
  };
}

// Aggregate sleep entries by night: sum durations, weighted-avg quality per date
function aggregateSleepByNight(entries) {
  const byDay = new Map();
  for (const e of entries) {
    if (e.type !== 'sleep' || e.value == null) continue;
    const day = e.timestamp.slice(0, 10);
    const prev = byDay.get(day) || { total: 0, qualities: [] };
    prev.total += e.value;
    if (e.quality != null && e.quality > 0) prev.qualities.push(e.quality);
    byDay.set(day, prev);
  }
  return byDay; // Map<dateStr, { total: number, qualities: number[] }>
}

function computeSleepTrend(days) {
  const entries = readHealthEntries(days).filter(e => e.type === 'sleep' && e.value != null);
  if (!entries.length) return null;
  const byNight = aggregateSleepByNight(entries);
  const durations = Array.from(byNight.values()).map(n => n.total);
  const qualities = Array.from(byNight.values()).flatMap(n => n.qualities);
  if (!durations.length) return null;
  const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
  return {
    avgDuration: avg(durations), minDuration: +Math.min(...durations).toFixed(1),
    maxDuration: +Math.max(...durations).toFixed(1),
    avgQuality: qualities.length ? +avg(qualities) : 0,
    dataPoints: durations.length,
  };
}

function computeAlerts() {
  const alerts = [];
  const recent = readHealthEntries(7);

  // Sleep < 6h on 3+ of last 7 nights (aggregate sessions per night)
  const sleepEntries = recent.filter(e => e.type === 'sleep' && e.value != null);
  const sleepByDay = new Map();
  for (const s of sleepEntries) {
    const day = s.timestamp.slice(0, 10);
    sleepByDay.set(day, (sleepByDay.get(day) ?? 0) + s.value);
  }
  const shortNights = Array.from(sleepByDay.values()).filter(h => h < 6).length;
  if (shortNights >= 3) {
    alerts.push({ type: 'sleep_low_week', severity: 'warning', message: `Schlaf unter 6h an ${shortNights} von 7 Tagen` });
  }

  // Sleep < 5h last night
  const lastSleepValues = Array.from(sleepByDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  if (lastSleepValues.length && lastSleepValues[0][1] < 5) {
    alerts.push({ type: 'sleep_critical', severity: 'critical', message: `Schlaf letzte Nacht nur ${lastSleepValues[0][1].toFixed(1)}h` });
  }

  // Weight change > 2kg in 7 days
  const wt = computeWeightTrend(7);
  if (wt && Math.abs(wt.change) > 2) {
    const dir = wt.change > 0 ? '+' : '';
    alerts.push({ type: 'weight_change', severity: 'warning', message: `Gewichtsveränderung ${dir}${wt.change} kg in 7 Tagen` });
  }

  // No Withings data for 3+ days
  const threeDay = readHealthEntries(3).filter(e => e.source === 'withings');
  if (!threeDay.length) {
    alerts.push({ type: 'no_withings_data', severity: 'info', message: 'Keine Withings-Daten seit 3+ Tagen' });
  }

  return alerts;
}

function computeHeartrateTrend(days) {
  const entries = readHealthEntries(days).filter(e => e.type === 'heartrate' && e.hr_avg != null);
  if (!entries.length) return null;
  // Use hr_min as resting HR when plausible (40-100 bpm), otherwise hr_avg
  const restingValues = entries.map(e => {
    const min = e.hr_min;
    return (min != null && min >= 40 && min <= 100) ? min : e.hr_avg;
  });
  const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : 0;
  const last = restingValues[restingValues.length - 1];
  return {
    current: last,
    avg: avg(restingValues),
    dataPoints: restingValues.length,
  };
}

app.get('/api/health/trends', auth, (req, res) => {
  try {
    const days = Math.min(Math.max(1, Number(req.query.days) || 30), 365);
    res.json({
      weight: computeWeightTrend(days),
      sleep: computeSleepTrend(days),
      heartrate: computeHeartrateTrend(days),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health/alerts', auth, (req, res) => {
  try {
    res.json(computeAlerts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health/chart-data', auth, (req, res) => {
  try {
    const type = String(req.query.type || 'weight');
    const days = Math.min(Math.max(1, Number(req.query.days) || 90), 365);
    const entries = readHealthEntries(days);

    if (type === 'weight') {
      const data = entries
        .filter(e => e.type === 'weight' && e.value != null)
        .map(e => ({ date: e.timestamp.slice(0, 10), value: e.value }))
        .sort((a, b) => a.date.localeCompare(b.date));
      res.json(data);
    } else if (type === 'sleep') {
      // Aggregate: sum sleep sessions per night
      const byDay = new Map();
      for (const e of entries.filter(e => e.type === 'sleep' && e.value != null)) {
        const day = e.timestamp.slice(0, 10);
        const prev = byDay.get(day);
        if (prev) {
          prev.duration += e.value;
          if (e.quality != null && e.quality > (prev.quality || 0)) prev.quality = e.quality;
        } else {
          byDay.set(day, { date: day, duration: e.value, quality: e.quality ?? null });
        }
      }
      // Round aggregated values
      for (const v of byDay.values()) v.duration = Math.round(v.duration * 10) / 10;
      const data = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
      res.json(data);
    } else {
      res.status(400).json({ error: 'type must be weight or sleep' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Drafts ───────────────────────────────────────────────────────────────

app.get('/api/drafts', auth, (req, res) => {
  try {
    if (!fs.existsSync(DRAFTS_DIR)) return res.json([]);
    const drafts = fs.readdirSync(DRAFTS_DIR)
      .filter(f => f.endsWith('.json'))
      .flatMap(f => {
        try { return [JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf8'))]; }
        catch { return []; }
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(drafts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/drafts/:id', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid draft id' });
    const filePath = path.join(DRAFTS_DIR, `${id}.json`);
    if (!filePath.startsWith(DRAFTS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allowed = ['to', 'subject', 'bodyText'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) draft[key] = req.body[key];
    }
    draft.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(draft, null, 2));
    res.json(draft);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/drafts/:id', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid draft id' });
    const filePath = path.join(DRAFTS_DIR, `${id}.json`);
    if (!filePath.startsWith(DRAFTS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const trashDir = path.join(DRAFTS_DIR, '.trash');
    if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
    const bakName = `${id}.json.${Date.now()}.bak`;
    fs.renameSync(filePath, path.join(trashDir, bakName));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Calendar (M365 Graph) ────────────────────────────────────────────────

app.get('/api/calendar', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const start = new Date();
    const end   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}` +
      `/calendarView?startDateTime=${encodeURIComponent(start.toISOString())}` +
      `&endDateTime=${encodeURIComponent(end.toISOString())}` +
      `&$select=id,subject,start,end,isAllDay,location,organizer,onlineMeeting,bodyPreview` +
      `&$orderby=start/dateTime`;

    const events = [];
    for (let i = 0; i < 10; i++) {
      const json = await graphGet(url);
      if (json?.value?.length) events.push(...json.value);
      const next = json?.['@odata.nextLink'];
      if (!next) break;
      url = next;
    }
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create calendar event
app.post('/api/calendar', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const { subject, start, end, location, body, isAllDay } = req.body;
    if (!subject || !start || !end) {
      return res.status(400).json({ error: 'subject, start and end are required' });
    }
    const payload = {
      subject,
      start: { dateTime: start, timeZone: 'Europe/Berlin' },
      end:   { dateTime: end,   timeZone: 'Europe/Berlin' },
    };
    if (location) payload.location = { displayName: location };
    if (body)     payload.body = { contentType: 'Text', content: body };
    if (isAllDay) payload.isAllDay = true;
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events`;
    const event = await graphRequest('POST', url, payload);
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update calendar event
app.patch('/api/calendar/:eventId', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const eventId = req.params.eventId;
    const { subject, start, end, location, body, isAllDay } = req.body;
    const payload = {};
    if (subject !== undefined)  payload.subject = subject;
    if (start !== undefined)    payload.start = { dateTime: start, timeZone: 'Europe/Berlin' };
    if (end !== undefined)      payload.end   = { dateTime: end,   timeZone: 'Europe/Berlin' };
    if (location !== undefined) payload.location = { displayName: location };
    if (body !== undefined)     payload.body = { contentType: 'Text', content: body };
    if (isAllDay !== undefined) payload.isAllDay = isAllDay;
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events/${encodeURIComponent(eventId)}`;
    const event = await graphRequest('PATCH', url, payload);
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete calendar event
app.delete('/api/calendar/:eventId', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const eventId = req.params.eventId;
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events/${encodeURIComponent(eventId)}`;
    await graphRequest('DELETE', url);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Trip Segment Calendar Sync ──────────────────────────────────────────

const SEGMENT_EMOJI = {
  flight: '✈️', hotel: '🏨', transfer: '🚆', activity: '🎫', note: '📝',
};

// Sync single segment to M365 calendar
app.post('/api/trips/:tripId/segments/:segId/calendar', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const tripId = req.params.tripId.replace(/[^a-z0-9\-_]/gi, '');
    const segId = req.params.segId;
    const filePath = path.join(TRAVEL_DIR, `${tripId}.json`);
    if (!filePath.startsWith(TRAVEL_DIR + path.sep)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Trip not found' });

    const trip = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const seg = (trip.segments || []).find(s => s.id === segId);
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    if (seg.calendarEventId) {
      return res.json({ eventId: seg.calendarEventId, webLink: seg.calendarWebLink || '', skipped: true });
    }

    const emoji = SEGMENT_EMOJI[seg.type] || '📋';
    const subject = `${trip.name} — ${emoji} ${seg.title}`;
    const isHotel = seg.type === 'hotel';
    const startDt = seg.datetime_local || trip.start_date + 'T12:00:00';
    const endDate = new Date(startDt);
    endDate.setHours(endDate.getHours() + (isHotel ? 24 : 1));
    const endDt = endDate.toISOString().replace('Z', '');

    const bodyParts = [
      seg.confirmation && `Bestätigung: ${seg.confirmation}`,
      seg.notes && `Notizen: ${seg.notes}`,
      `Trip: ${trip.name} (${trip.id})`,
    ].filter(Boolean);

    const calUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events`;
    const event = await graphRequest('POST', calUrl, {
      subject,
      start: { dateTime: startDt, timeZone: seg.timezone || 'Europe/Berlin' },
      end: { dateTime: endDt, timeZone: seg.timezone || 'Europe/Berlin' },
      location: trip.destination ? { displayName: trip.destination } : undefined,
      body: bodyParts.length ? { contentType: 'Text', content: bodyParts.join('\n') } : undefined,
    });

    seg.calendarEventId = event.id;
    seg.calendarWebLink = event.webLink || '';
    trip.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(trip, null, 2));

    res.status(201).json({ eventId: event.id, webLink: event.webLink || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Batch sync all segments of a trip to M365 calendar
app.post('/api/trips/:tripId/sync-calendar', auth, async (req, res) => {
  if (!M365_TENANT_ID || !M365_CLIENT_ID || !M365_CLIENT_SECRET || !M365_USER) {
    return res.status(503).json({ error: 'M365 credentials not configured' });
  }
  try {
    const tripId = req.params.tripId.replace(/[^a-z0-9\-_]/gi, '');
    const filePath = path.join(TRAVEL_DIR, `${tripId}.json`);
    if (!filePath.startsWith(TRAVEL_DIR + path.sep)) return res.status(400).json({ error: 'Invalid path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Trip not found' });

    const trip = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let created = 0, skipped = 0, failed = 0;

    for (const seg of (trip.segments || [])) {
      if (seg.calendarEventId) { skipped++; continue; }
      try {
        const emoji = SEGMENT_EMOJI[seg.type] || '📋';
        const subject = `${trip.name} — ${emoji} ${seg.title}`;
        const isHotel = seg.type === 'hotel';
        const startDt = seg.datetime_local || trip.start_date + 'T12:00:00';
        const endDate = new Date(startDt);
        endDate.setHours(endDate.getHours() + (isHotel ? 24 : 1));
        const endDt = endDate.toISOString().replace('Z', '');

        const bodyParts = [
          seg.confirmation && `Bestätigung: ${seg.confirmation}`,
          seg.notes && `Notizen: ${seg.notes}`,
          `Trip: ${trip.name} (${trip.id})`,
        ].filter(Boolean);

        const calUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(M365_USER)}/events`;
        const event = await graphRequest('POST', calUrl, {
          subject,
          start: { dateTime: startDt, timeZone: seg.timezone || 'Europe/Berlin' },
          end: { dateTime: endDt, timeZone: seg.timezone || 'Europe/Berlin' },
          location: trip.destination ? { displayName: trip.destination } : undefined,
          body: bodyParts.length ? { contentType: 'Text', content: bodyParts.join('\n') } : undefined,
        });

        seg.calendarEventId = event.id;
        seg.calendarWebLink = event.webLink || '';
        created++;
      } catch (e) {
        console.log(`[dashboard] segment calendar sync failed for ${seg.id}: ${e.message}`);
        failed++;
      }
    }

    trip.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(trip, null, 2));
    res.json({ created, skipped, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Documents ───────────────────────────────────────────────────────────

function readDocsMeta() {
  try { return JSON.parse(fs.readFileSync(DOCS_META, 'utf8')); } catch { return {}; }
}
function writeDocsMeta(meta) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.writeFileSync(DOCS_META, JSON.stringify(meta, null, 2));
}

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.trash') continue;
      results.push(...walkDir(full));
    } else if (entry.isFile() && entry.name !== 'metadata.json') {
      results.push(full);
    }
  }
  return results;
}

// Multer storage — category subfolder
const docStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const kategorie = DOCS_CATEGORIES.includes(req.body.kategorie) ? req.body.kategorie : 'sonstiges';
    const dest = path.join(DOCS_DIR, kategorie);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(_req, file, cb) {
    // Sanitize original name, prefix with timestamp to avoid collisions
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-äöüÄÖÜß ]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage: docStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// List all documents
app.get('/api/documents', auth, (req, res) => {
  try {
    const meta = readDocsMeta();
    const files = walkDir(DOCS_DIR).map(fp => {
      const rel = path.relative(DOCS_DIR, fp);
      const stat = fs.statSync(fp);
      const parts = rel.split(path.sep);
      const kategorie = DOCS_CATEGORIES.includes(parts[0]) ? parts[0] : 'sonstiges';
      const m = meta[rel] || {};
      return {
        name: path.basename(fp),
        path: rel,
        size: stat.size,
        date: stat.mtime.toISOString(),
        kategorie: m.kategorie || kategorie,
        tripId: m.tripId || null,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload document
app.post('/api/documents/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rel = path.relative(DOCS_DIR, req.file.path);
    const kategorie = DOCS_CATEGORIES.includes(req.body.kategorie) ? req.body.kategorie : 'sonstiges';
    const tripId = req.body.tripId || null;

    const meta = readDocsMeta();
    meta[rel] = { kategorie, tripId, uploadedAt: new Date().toISOString() };
    writeDocsMeta(meta);

    const stat = fs.statSync(req.file.path);
    res.status(201).json({
      name: req.file.originalname,
      path: rel,
      size: stat.size,
      date: stat.mtime.toISOString(),
      kategorie,
      tripId,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete document
app.delete('/api/documents/:path(*)', auth, (req, res) => {
  try {
    const rel = req.params.path;
    const filePath = path.join(DOCS_DIR, rel);
    if (!filePath.startsWith(DOCS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    fs.unlinkSync(filePath);
    const meta = readDocsMeta();
    delete meta[rel];
    writeDocsMeta(meta);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download document
app.get('/api/documents/download/:path(*)', auth, (req, res) => {
  try {
    const rel = req.params.path;
    const filePath = path.join(DOCS_DIR, rel);
    if (!filePath.startsWith(DOCS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath, path.basename(filePath));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SharePoint API ────────────────────────────────────────────────────────────

const spUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

// List all sites
app.get('/api/sharepoint/sites', auth, async (req, res) => {
  try {
    const data = await graphGet('https://graph.microsoft.com/v1.0/sites?search=*&$top=200');
    res.json(data.value || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List drives for a site
app.get('/api/sharepoint/drives/:siteId', auth, async (req, res) => {
  try {
    const data = await graphGet(`https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(req.params.siteId)}/drives`);
    res.json(data.value || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List files in a drive (optional folderId query param)
app.get('/api/sharepoint/files/:siteId/:driveId', auth, async (req, res) => {
  try {
    const base = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(req.params.siteId)}/drives/${encodeURIComponent(req.params.driveId)}`;
    const folderId = req.query.folderId;
    const url = folderId
      ? `${base}/items/${encodeURIComponent(folderId)}/children?$top=200`
      : `${base}/root/children?$top=200`;
    const data = await graphGet(url);
    const items = (data.value || []).map(f => ({
      id: f.id,
      name: f.name || '',
      size: f.size || 0,
      webUrl: f.webUrl || '',
      lastModifiedDateTime: f.lastModifiedDateTime || '',
      createdDateTime: f.createdDateTime || '',
      mimeType: f.file?.mimeType || null,
      downloadUrl: f['@microsoft.graph.downloadUrl'] || null,
      isFolder: !!f.folder,
      childCount: f.folder?.childCount ?? null,
    }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search documents via Graph Search API
app.get('/api/sharepoint/search', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
    const body = {
      requests: [{
        entityTypes: ['driveItem'],
        query: { queryString: q },
        from: 0,
        size: 25,
        region: 'DEU',
      }],
    };
    const data = await graphRequest('POST', 'https://graph.microsoft.com/v1.0/search/query', body);
    const hits = [];
    const containers = data?.value?.[0]?.hitsContainers || [];
    for (const c of containers) {
      for (const hit of (c.hits || [])) {
        const r = hit.resource || {};
        hits.push({
          name: r.name || '',
          webUrl: r.webUrl || '',
          lastModifiedDateTime: r.lastModifiedDateTime || '',
          size: r.size || null,
          summary: hit.summary || null,
        });
      }
    }
    res.json(hits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download proxy (uses pre-auth downloadUrl from Graph)
app.get('/api/sharepoint/download', auth, async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    const upstream = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!upstream.ok) return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    const ct = upstream.headers.get('content-type');
    const cd = upstream.headers.get('content-disposition');
    if (ct) res.setHeader('Content-Type', ct);
    if (cd) res.setHeader('Content-Disposition', cd);
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload file to SharePoint drive
app.post('/api/sharepoint/upload', auth, spUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { siteId, driveId, path: filePath } = req.body;
    if (!siteId || !driveId) return res.status(400).json({ error: 'Missing siteId or driveId' });
    const uploadPath = filePath || req.file.originalname;
    const token = await getGraphToken();
    const base = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}`;
    const url = `${base}/root:/${encodeURIComponent(uploadPath)}:/content`;
    const upstream = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: req.file.buffer,
      signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: `Graph API HTTP ${upstream.status}: ${errText}` });
    }
    const result = await upstream.json();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Fleet ────────────────────────────────────────────────────────────────

function readFleet() {
  try { return JSON.parse(fs.readFileSync(FLEET_FILE, 'utf8')); } catch { return []; }
}
function writeFleet(vehicles) {
  fs.mkdirSync(FLEET_DIR, { recursive: true });
  fs.writeFileSync(FLEET_FILE, JSON.stringify(vehicles, null, 2));
}
function slugifyFleet(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function makeReadableFleetId(make, model, existingIds) {
  const base = 'v-' + slugifyFleet(make) + '-' + slugifyFleet(model);
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// List all vehicles
app.get('/api/fleet', auth, (req, res) => {
  try {
    res.json(readFleet());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create vehicle
app.post('/api/fleet', auth, (req, res) => {
  try {
    const { type, make, model, year, name, plate, vin, color, mileage } = req.body;
    if (!type || !make || !model || !year) {
      return res.status(400).json({ error: 'type, make, model and year are required' });
    }
    if (type !== 'car' && type !== 'bike') {
      return res.status(400).json({ error: 'type must be "car" or "bike"' });
    }
    const y = Number(year);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    const all = readFleet();
    const id = makeReadableFleetId(String(make), String(model), all.map(v => v.id));
    const now = new Date().toISOString();
    const vehicle = {
      id, type,
      name: String(name || `${make} ${model}`),
      plate: plate || undefined,
      vin: vin || undefined,
      make: String(make), model: String(model), year: y,
      color: color || undefined,
      mileage: mileage != null ? Number(mileage) : undefined,
      serviceLog: [], documents: [],
      createdAt: now, updatedAt: now,
    };
    all.push(vehicle);
    writeFleet(all);
    res.status(201).json(vehicle);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get vehicle by ID
app.get('/api/fleet/:id', auth, (req, res) => {
  try {
    const v = readFleet().find(v => v.id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(v);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update vehicle
app.put('/api/fleet/:id', auth, (req, res) => {
  try {
    const all = readFleet();
    const idx = all.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
    const allowed = ['name', 'plate', 'vin', 'make', 'model', 'year', 'color', 'mileage', 'tuevDate', 'vehicleTax', 'insurance'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) all[idx][key] = req.body[key];
    }
    // Handle ID change
    if (req.body.newId) {
      let newId = req.body.newId.toLowerCase();
      if (!newId.startsWith('v-')) newId = 'v-' + newId;
      if (!/^v-[a-z0-9]+(-[a-z0-9]+)*$/.test(newId) || newId.length < 4) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      if (all.some(v => v.id === newId)) {
        return res.status(409).json({ error: 'ID already in use' });
      }
      const oldId = all[idx].id;
      all[idx].id = newId;
      // Rename docs directory
      const oldDir = path.join(FLEET_DIR, 'docs', oldId);
      const newDir = path.join(FLEET_DIR, 'docs', newId);
      if (fs.existsSync(oldDir)) fs.renameSync(oldDir, newDir);
      // Update link-store references
      const links = readLinks();
      let linksChanged = false;
      for (const link of links) {
        if (link.entityType === 'fleet' && link.entityId === oldId) {
          link.entityId = newId;
          linksChanged = true;
        }
      }
      if (linksChanged) writeLinks(links);
    }
    all[idx].updatedAt = new Date().toISOString();
    writeFleet(all);
    res.json(all[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete vehicle
app.delete('/api/fleet/:id', auth, (req, res) => {
  try {
    const all = readFleet();
    const idx = all.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
    all.splice(idx, 1);
    writeFleet(all);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add service entry
app.post('/api/fleet/:id/service', auth, (req, res) => {
  try {
    const all = readFleet();
    const idx = all.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
    const { date, type, mileage, cost, notes } = req.body;
    if (!date || !type) return res.status(400).json({ error: 'date and type are required' });
    const entry = {
      date: String(date),
      type: String(type),
      mileage: mileage != null ? Number(mileage) : undefined,
      cost: cost != null ? Number(cost) : undefined,
      notes: notes || undefined,
    };
    all[idx].serviceLog.push(entry);
    if (entry.mileage != null && (all[idx].mileage == null || entry.mileage > all[idx].mileage)) {
      all[idx].mileage = entry.mileage;
    }
    all[idx].updatedAt = new Date().toISOString();
    writeFleet(all);
    res.status(201).json(all[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Document Links API ────────────────────────────────────────────────────────

function readLinks() {
  try {
    if (fs.existsSync(LINKS_FILE)) return JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
  } catch {}
  return [];
}

function writeLinks(links) {
  fs.mkdirSync(LINKS_DIR, { recursive: true });
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2), 'utf8');
}

function readSpIndex() {
  try {
    if (fs.existsSync(SP_INDEX_FILE)) {
      const idx = JSON.parse(fs.readFileSync(SP_INDEX_FILE, 'utf8'));
      return idx?.files || [];
    }
  } catch {}
  return [];
}

app.get('/api/links', auth, (req, res) => {
  res.json(readLinks());
});

app.get('/api/links/search/sp', auth, (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json([]);
  const files = readSpIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = files.filter(f => {
    const haystack = `${f.name} ${f.path} ${f.siteName} ${f.driveName}`.toLowerCase();
    return terms.every(t => haystack.includes(t));
  });
  matches.sort((a, b) => (b.lastModifiedDateTime || '').localeCompare(a.lastModifiedDateTime || ''));
  const results = matches.slice(0, 15).map(f => ({
    name: f.name,
    webUrl: f.webUrl,
    driveId: f.driveId || '',
    itemId: f.siteId + '::' + f.driveId + '::' + f.path,
    siteName: f.siteName || '',
    path: f.path || '',
    size: f.size || 0,
  }));
  res.json(results);
});

app.get('/api/links/:entityType/:entityId', auth, (req, res) => {
  const links = readLinks().filter(
    l => l.entityType === req.params.entityType && l.entityId === req.params.entityId
  );
  res.json(links);
});

app.post('/api/links', auth, async (req, res) => {
  try {
    const { entityType, entityId, docType, spItemId, localPath, label } = req.body;
    if (!entityType || !entityId || !docType || !label) {
      return res.status(400).json({ error: 'entityType, entityId, docType, label required' });
    }

    const links = readLinks();
    const { randomBytes } = await import('node:crypto');
    const id = 'lnk-' + randomBytes(3).toString('hex');
    const link = {
      id,
      entityType,
      entityId,
      docType,
      label,
      createdAt: new Date().toISOString(),
    };

    if (docType === 'sharepoint' && spItemId) {
      // Look up SP details from index
      const files = readSpIndex();
      const match = files.find(f => {
        const fId = f.siteId + '::' + f.driveId + '::' + f.path;
        return fId === spItemId;
      });
      if (match) {
        link.spItemId = spItemId;
        link.spDriveId = match.driveId;
        link.spName = match.name;
        link.spWebUrl = match.webUrl;
      } else {
        link.spItemId = spItemId;
      }
    } else if (docType === 'local' && localPath) {
      link.localPath = localPath;
      link.localName = path.basename(localPath);
    }

    links.push(link);
    writeLinks(links);
    res.status(201).json(link);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/links/:linkId', auth, (req, res) => {
  const links = readLinks();
  const idx = links.findIndex(l => l.id === req.params.linkId);
  if (idx === -1) return res.status(404).json({ error: 'Link not found' });
  const removed = links.splice(idx, 1)[0];
  writeLinks(links);
  res.json(removed);
});

// ── Assets (Immobilien) ──────────────────────────────────────────────────────

function readProperties() {
  try { return JSON.parse(fs.readFileSync(PROPERTIES_FILE, 'utf8')); } catch { return []; }
}
function writeProperties(props) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(props, null, 2));
}
function readLeases() {
  try { return JSON.parse(fs.readFileSync(LEASES_FILE, 'utf8')); } catch { return []; }
}
function writeLeases(leases) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.writeFileSync(LEASES_FILE, JSON.stringify(leases, null, 2));
}
function readCosts(propertyId, year) {
  const fp = path.join(COSTS_DIR, `${propertyId}-${year}.json`);
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}
function writeCosts(propertyId, year, data) {
  fs.mkdirSync(COSTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(COSTS_DIR, `${propertyId}-${year}.json`), JSON.stringify(data, null, 2));
}

// List all properties
app.get('/api/assets/properties', auth, (req, res) => {
  try { res.json(readProperties()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single property
app.get('/api/assets/properties/:id', auth, (req, res) => {
  try {
    const p = readProperties().find(p => p.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update property fields
app.put('/api/assets/properties/:id', auth, (req, res) => {
  try {
    const all = readProperties();
    const idx = all.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Property not found' });
    const allowed = ['label', 'address', 'type', 'owner'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) all[idx][key] = req.body[key];
    }
    all[idx].updatedAt = new Date().toISOString();
    writeProperties(all);
    res.json(all[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add unit to property
app.post('/api/assets/properties/:id/units', auth, (req, res) => {
  try {
    const all = readProperties();
    const idx = all.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Property not found' });
    const { id, label, floor, sqm, rentType, tenant } = req.body;
    if (!id || !label) return res.status(400).json({ error: 'id and label required' });
    if (all[idx].units.some(u => u.id === id)) return res.status(409).json({ error: 'Unit ID exists' });
    const unit = {
      id: String(id), label: String(label), floor: String(floor || ''),
      sqm: sqm != null ? Number(sqm) : null,
      rentType: rentType || 'vacant', tenant: tenant || '',
      lease: null, currentRent: null,
    };
    all[idx].units.push(unit);
    all[idx].updatedAt = new Date().toISOString();
    writeProperties(all);
    res.status(201).json(all[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update unit
app.put('/api/assets/properties/:propId/units/:unitId', auth, (req, res) => {
  try {
    const all = readProperties();
    const pIdx = all.findIndex(p => p.id === req.params.propId);
    if (pIdx === -1) return res.status(404).json({ error: 'Property not found' });
    const uIdx = all[pIdx].units.findIndex(u => u.id === req.params.unitId);
    if (uIdx === -1) return res.status(404).json({ error: 'Unit not found' });
    const allowed = ['label', 'floor', 'sqm', 'rentType', 'tenant', 'currentRent'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) all[pIdx].units[uIdx][key] = req.body[key];
    }
    all[pIdx].updatedAt = new Date().toISOString();
    writeProperties(all);
    res.json(all[pIdx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete unit
app.delete('/api/assets/properties/:propId/units/:unitId', auth, (req, res) => {
  try {
    const all = readProperties();
    const pIdx = all.findIndex(p => p.id === req.params.propId);
    if (pIdx === -1) return res.status(404).json({ error: 'Property not found' });
    all[pIdx].units = all[pIdx].units.filter(u => u.id !== req.params.unitId);
    all[pIdx].updatedAt = new Date().toISOString();
    writeProperties(all);
    // Remove related leases
    const leases = readLeases().filter(l => !(l.propertyId === req.params.propId && l.unitId === req.params.unitId));
    writeLeases(leases);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Set distribution key
app.put('/api/assets/properties/:id/distribution-keys', auth, (req, res) => {
  try {
    const all = readProperties();
    const pIdx = all.findIndex(p => p.id === req.params.id);
    if (pIdx === -1) return res.status(404).json({ error: 'Property not found' });
    const { id, label, values } = req.body;
    if (!id || !label) return res.status(400).json({ error: 'id and label required' });
    const kIdx = all[pIdx].distributionKeys.findIndex(k => k.id === id);
    const key = { id: String(id), label: String(label), values: values || {} };
    if (kIdx === -1) all[pIdx].distributionKeys.push(key);
    else all[pIdx].distributionKeys[kIdx] = key;
    all[pIdx].updatedAt = new Date().toISOString();
    writeProperties(all);
    res.json(all[pIdx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete distribution key
app.delete('/api/assets/properties/:propId/distribution-keys/:keyId', auth, (req, res) => {
  try {
    const all = readProperties();
    const pIdx = all.findIndex(p => p.id === req.params.propId);
    if (pIdx === -1) return res.status(404).json({ error: 'Property not found' });
    all[pIdx].distributionKeys = all[pIdx].distributionKeys.filter(k => k.id !== req.params.keyId);
    all[pIdx].updatedAt = new Date().toISOString();
    writeProperties(all);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List leases (optionally filtered by propertyId)
app.get('/api/assets/leases', auth, (req, res) => {
  try {
    let leases = readLeases();
    if (req.query.propertyId) leases = leases.filter(l => l.propertyId === req.query.propertyId);
    res.json(leases);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create/update lease
app.put('/api/assets/leases/:propId/:unitId', auth, (req, res) => {
  try {
    const { propId, unitId } = req.params;
    const { tenant, startDate, endDate, rentNet, operatingCosts, depositAmount, linkedDocs } = req.body;
    const all = readLeases();
    const now = new Date().toISOString();
    const existIdx = all.findIndex(l => l.unitId === unitId && l.propertyId === propId);

    if (existIdx !== -1) {
      if (tenant !== undefined) all[existIdx].tenant = tenant;
      if (startDate !== undefined) all[existIdx].startDate = startDate;
      if (endDate !== undefined) all[existIdx].endDate = endDate;
      if (rentNet !== undefined) all[existIdx].rentNet = Number(rentNet);
      if (operatingCosts !== undefined) all[existIdx].operatingCosts = Number(operatingCosts);
      if (depositAmount !== undefined) all[existIdx].depositAmount = Number(depositAmount);
      if (linkedDocs !== undefined) all[existIdx].linkedDocs = linkedDocs;
      all[existIdx].updatedAt = now;
      writeLeases(all);
      // Sync unit data
      syncUnitFromLease(propId, unitId, all[existIdx]);
      res.json(all[existIdx]);
    } else {
      const lease = {
        id: `lease-${propId}-${unitId}`,
        unitId, propertyId: propId,
        tenant: tenant || '', startDate: startDate || now.slice(0, 10),
        endDate: endDate || null,
        rentNet: Number(rentNet || 0), operatingCosts: Number(operatingCosts || 0),
        depositAmount: Number(depositAmount || 0),
        linkedDocs: linkedDocs || [],
        createdAt: now, updatedAt: now,
      };
      all.push(lease);
      writeLeases(all);
      syncUnitFromLease(propId, unitId, lease);
      res.status(201).json(lease);
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function syncUnitFromLease(propId, unitId, lease) {
  try {
    const all = readProperties();
    const pIdx = all.findIndex(p => p.id === propId);
    if (pIdx === -1) return;
    const uIdx = all[pIdx].units.findIndex(u => u.id === unitId);
    if (uIdx === -1) return;
    all[pIdx].units[uIdx].lease = lease.id;
    all[pIdx].units[uIdx].currentRent = lease.rentNet;
    all[pIdx].units[uIdx].tenant = lease.tenant;
    writeProperties(all);
  } catch {}
}

// Delete lease
app.delete('/api/assets/leases/:id', auth, (req, res) => {
  try {
    const all = readLeases();
    const idx = all.findIndex(l => l.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lease not found' });
    const lease = all[idx];
    all.splice(idx, 1);
    writeLeases(all);
    // Clear unit reference
    try {
      const props = readProperties();
      const pIdx = props.findIndex(p => p.id === lease.propertyId);
      if (pIdx !== -1) {
        const uIdx = props[pIdx].units.findIndex(u => u.id === lease.unitId);
        if (uIdx !== -1) {
          props[pIdx].units[uIdx].lease = null;
          props[pIdx].units[uIdx].currentRent = null;
          props[pIdx].units[uIdx].tenant = '';
          writeProperties(props);
        }
      }
    } catch {}
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get operating costs
app.get('/api/assets/costs/:propId/:year', auth, (req, res) => {
  try {
    const data = readCosts(req.params.propId, req.params.year);
    if (!data) return res.json({ propertyId: req.params.propId, year: Number(req.params.year), distributionKeyId: '', costs: {}, updatedAt: null });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Set operating costs
app.put('/api/assets/costs/:propId/:year', auth, (req, res) => {
  try {
    const { costs, distributionKeyId } = req.body;
    const data = {
      propertyId: req.params.propId,
      year: Number(req.params.year),
      distributionKeyId: distributionKeyId || '',
      costs: costs || {},
      updatedAt: new Date().toISOString(),
    };
    writeCosts(req.params.propId, req.params.year, data);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Calculate Nebenkostenabrechnung
app.get('/api/assets/nk/:propId/:year', auth, (req, res) => {
  try {
    const propId = req.params.propId;
    const year = Number(req.params.year);
    const props = readProperties();
    const prop = props.find(p => p.id === propId);
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    const oc = readCosts(propId, year);
    if (!oc) return res.status(404).json({ error: `No operating costs for ${year}` });

    const dk = prop.distributionKeys.find(k => k.id === oc.distributionKeyId);
    if (!dk) return res.status(400).json({ error: `Distribution key ${oc.distributionKeyId} not found` });

    const COST_LABELS = {
      heizung: 'Heizung', wasser: 'Wasser', abwasser: 'Abwasser', muell: 'Müll',
      hausmeister: 'Hausmeister', versicherung: 'Versicherung', grundsteuer: 'Grundsteuer',
      allgemeinstrom: 'Allgemeinstrom', aufzug: 'Aufzug',
    };

    const totalCosts = Object.values(oc.costs).reduce((s, v) => s + (v || 0), 0);
    const leases = readLeases().filter(l => l.propertyId === propId);

    const results = [];
    for (const unit of prop.units) {
      if (unit.rentType === 'vacant') continue;
      const share = dk.values[unit.id] || 0;
      const unitCost = totalCosts * (share / 100);
      const lease = leases.find(l => l.unitId === unit.id);
      const prepaid = (lease?.operatingCosts || 0) * 12;
      const balance = prepaid - unitCost;
      const details = Object.entries(oc.costs)
        .filter(([, v]) => v && v > 0)
        .map(([cat, amount]) => ({
          category: COST_LABELS[cat] || cat,
          amount: Math.round((amount * share / 100) * 100) / 100,
        }));
      results.push({
        unitId: unit.id, unitLabel: unit.label, tenant: unit.tenant || '–',
        share, totalCost: Math.round(unitCost * 100) / 100,
        prepaid: Math.round(prepaid * 100) / 100,
        balance: Math.round(balance * 100) / 100, details,
      });
    }
    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, BIND, () => {
  const configured = DASHBOARD_TOKEN ? '✓ token configured' : '⚠ DASHBOARD_TOKEN missing!';
  console.log(`[dashboard] http://${BIND}:${PORT}  ${configured}`);
  console.log('[dashboard] public via nginx: https://<server-ip>:8443/dashboard/');
});
