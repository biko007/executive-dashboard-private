import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

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
    const entries = fs.readFileSync(HEALTH_LOG, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } })
      .filter(e => (e.timestamp || '') >= cutoff)
      .map(e => {
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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, BIND, () => {
  const configured = DASHBOARD_TOKEN ? '✓ token configured' : '⚠ DASHBOARD_TOKEN missing!';
  console.log(`[dashboard] http://${BIND}:${PORT}  ${configured}`);
  console.log('[dashboard] public via nginx: https://<server-ip>:8443/dashboard/');
});
