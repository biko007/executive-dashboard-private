import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import pg from 'pg';

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
const INBOX_TOKEN       = ENV.INBOX_TOKEN       || '';

// ── Postgres Pool (Sprint 3 — Instagram drafts) ─────────────────────────────
const dbPool = ENV.POSTGRES_URL
  ? new pg.Pool({ connectionString: ENV.POSTGRES_URL, max: 3 })
  : null;

// ── Paths ─────────────────────────────────────────────────────────────────────

const TRAVEL_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/travel');
const HEALTH_LOG  = path.join(HOME, '.openclaw/workspace/artifacts/personal/health/health-log.jsonl');
const DRAFTS_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/mail-drafts');
const DOCS_DIR    = path.join(HOME, '.openclaw/workspace/artifacts/personal/documents');
const DOCS_META   = path.join(DOCS_DIR, 'metadata.json');
const DOCS_CATEGORIES = ['vertraege', 'rechnungen', 'notizen', 'sonstiges'];
const FLEET_DIR   = path.join(HOME, '.openclaw/workspace/artifacts/personal/fleet');
const FLEET_FILE  = path.join(FLEET_DIR, 'vehicles.json');
// Links constants removed — Sprint 9: proxied to Core API
const INSTA_DIR   = path.join(HOME, '.openclaw/workspace/artifacts/personal/instagram');
const RAW_DIR     = path.join(INSTA_DIR, 'raw');
const ASSETS_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/assets');
const PROPERTIES_FILE = path.join(ASSETS_DIR, 'properties.json');
const LEASES_FILE = path.join(ASSETS_DIR, 'leases.json');
const COSTS_DIR   = path.join(ASSETS_DIR, 'operating-costs');
const IMAGES_DIR  = path.join(HOME, '.openclaw/workspace/artifacts/personal/images');
const PE_DIR      = path.join(HOME, '.openclaw/workspace/artifacts/personal/private-equity');
const PE_FILE     = path.join(PE_DIR, 'investments.json');
const PE_VAL_FILE = path.join(PE_DIR, 'valuations.jsonl');

// ── Session Management (Sprint 5.5a-1) ──────────────────────────────────────

const CORE_SERVICE_TOKEN = ENV.CORE_SERVICE_TOKEN || '';
const sessions = new Map(); // sessionId → { id, actor, createdAt }

function createSession() {
  const id = randomUUID();
  const session = { id, actor: 'dashboard:biko', createdAt: new Date().toISOString() };
  sessions.set(id, session);
  return session;
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/__Host-DASHBOARD_SESSION=([a-f0-9-]{36})/);
  if (!match) return null;
  return sessions.get(match[1]) || null;
}

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

/** Auth + session: creates session cookie if valid auth but no session. */
function requireSession(req, res, next) {
  // First check auth
  if (!DASHBOARD_TOKEN) {
    return res.status(500).json({ error: 'DASHBOARD_TOKEN not configured' });
  }
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const qtoken = req.query.token || '';
  if (bearer !== DASHBOARD_TOKEN && qtoken !== DASHBOARD_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check/create session
  let session = getSession(req);
  if (!session) {
    session = createSession();
    res.setHeader('Set-Cookie',
      `__Host-DASHBOARD_SESSION=${session.id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    );
  }
  req.dashboardSession = session;
  next();
}

// ── Header Stripping (Trust Boundary) ───────────────────────────────────────

function stripUntrustedHeaders(req) {
  delete req.headers['x-actor'];
  delete req.headers['x-dashboard-session-id'];
  delete req.headers['x-internal-secret'];
  delete req.headers['x-approval-bypass'];
  delete req.headers['x-request-id'];
  delete req.headers['x-correlation-id'];
  delete req.headers['x-forwarded-for'];
}

// ── Origin/Referer Check (POST/PATCH/PUT/DELETE) ────────────────────────────

function checkOrigin(req, res, next) {
  const method = req.method.toUpperCase();
  if (!['POST','PATCH','PUT','DELETE'].includes(method)) return next();

  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  // Allow localhost for development
  if (origin === 'https://app.bikobickel.de' || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://localhost')) {
    return next();
  }
  // Fallback: check referer host
  try {
    const refUrl = new URL(referer);
    if (refUrl.hostname === 'app.bikobickel.de' || refUrl.hostname === '127.0.0.1' || refUrl.hostname === 'localhost') {
      return next();
    }
  } catch {}

  // No origin header at all is OK (same-origin requests may omit it)
  if (!origin && !referer) return next();

  res.status(403).json({ error: 'Origin check failed' });
}

// ── CSRF Token Mechanics ────────────────────────────────────────────────────

const csrfRateLimits = new Map(); // sessionId → { count, resetAt }

/** CSRF validation middleware for mutations on /api/assets/* */
function requireCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (!['POST','PATCH','PUT','DELETE'].includes(method)) return next();

  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken) {
    return res.status(403).json({ error: 'Missing X-CSRF-Token header' });
  }

  const session = req.dashboardSession;
  if (!session) {
    return res.status(403).json({ error: 'No session' });
  }

  if (!dbPool) {
    return res.status(500).json({ error: 'Database not available for CSRF check' });
  }

  dbPool.query(
    'SELECT id FROM csrf_tokens WHERE token = $1 AND session_id = $2 AND expires_at > now()',
    [csrfToken, session.id]
  ).then(result => {
    if (result.rows.length === 0) {
      return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid or expired CSRF token' } });
    }
    next();
  }).catch(e => {
    res.status(500).json({ error: 'CSRF validation error: ' + e.message });
  });
}

// ── Core Proxy for /api/assets/* ────────────────────────────────────────────

const CORE_BASE = 'http://127.0.0.1:18789';

async function proxyToCore(req, res) {
  const session = req.dashboardSession;
  if (!session) {
    return res.status(401).json({ error: 'No dashboard session' });
  }
  if (!CORE_SERVICE_TOKEN) {
    return res.status(500).json({ error: 'CORE_SERVICE_TOKEN not configured' });
  }

  const requestId = randomUUID();
  const url = CORE_BASE + req.originalUrl;

  try {
    const headers = {
      'Authorization': `Bearer ${CORE_SERVICE_TOKEN}`,
      'X-Actor': session.actor,
      'X-Dashboard-Session-ID': session.id,
      'X-Request-ID': requestId,
      'Content-Type': 'application/json',
    };

    // Forward mutation-relevant headers from client
    if (req.headers['x-approval-token']) headers['X-Approval-Token'] = req.headers['x-approval-token'];
    if (req.headers['idempotency-key']) headers['Idempotency-Key'] = req.headers['idempotency-key'];
    if (req.headers['x-csrf-token']) headers['X-CSRF-Token'] = req.headers['x-csrf-token'];

    const fetchOpts = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(30_000),
    };

    // Forward body for mutations
    if (['POST','PATCH','PUT'].includes(req.method.toUpperCase()) && req.body) {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const coreRes = await fetch(url, fetchOpts);
    const contentType = coreRes.headers.get('content-type') || '';
    const body = contentType.includes('json') ? await coreRes.json() : await coreRes.text();

    res.status(coreRes.status);
    if (typeof body === 'string') {
      res.set('Content-Type', 'text/plain').send(body);
    } else {
      res.json(body);
    }
  } catch (e) {
    console.error(`[dashboard] Core proxy error: ${e.message}`);
    res.status(502).json({ error: 'Core service unavailable', detail: e.message });
  }
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

// Apply header stripping globally before any routes
app.use((req, res, next) => {
  stripUntrustedHeaders(req);
  next();
});

// Apply origin check globally
app.use(checkOrigin);

app.use(express.json());

// CSP header
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── CSRF Token Refresh Endpoint ─────────────────────────────────────────────

app.get('/api/csrf-refresh', requireSession, (req, res) => {
  const session = req.dashboardSession;

  // Rate limit: 60/min per session
  const now = Date.now();
  let limit = csrfRateLimits.get(session.id);
  if (!limit || now > limit.resetAt) {
    limit = { count: 0, resetAt: now + 60_000 };
    csrfRateLimits.set(session.id, limit);
  }
  if (limit.count >= 60) {
    return res.status(429).json({ error: 'CSRF refresh rate limit exceeded' });
  }
  limit.count++;

  const token = randomUUID();
  const expiresAt = new Date(now + 3600_000); // 1 hour

  // Store in DB
  if (dbPool) {
    dbPool.query(
      'INSERT INTO csrf_tokens (token, session_id, expires_at) VALUES ($1, $2, $3)',
      [token, session.id, expiresAt.toISOString()]
    ).catch(e => console.error('[dashboard] CSRF insert error:', e.message));
  }

  // Set CSRF cookie (NOT HttpOnly — JS needs to read it)
  res.setHeader('Set-Cookie', [
    `__Host-CSRF=${token}; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
  ]);

  res.json({ token, expires_at: expiresAt.toISOString() });
});

// ── API: Status ─────────────────────────────────────────────────────────────

app.get('/api/status', async (_req, res) => {
  const check = async (port) => {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) });
      return r.ok || r.status < 500;
    } catch { return false; }
  };
  const [gateway, trading] = await Promise.all([check(18789), check(18793)]);
  res.json({
    status: gateway ? 'ok' : 'degraded',
    services: { gateway, dashboard: true, trading },
    timestamp: new Date().toISOString()
  });
});

// ── Service Health / Ready / Version (no auth, root paths) ──────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'executive-dashboard', uptime: process.uptime() });
});

app.get('/ready', async (_req, res) => {
  const check = async (port) => {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch { return false; }
  };
  const [gateway, trading] = await Promise.all([check(18789), check(18793)]);
  res.json({
    ok: true,
    service: 'executive-dashboard',
    dependencies: { gateway, trading },
  });
});

app.get('/version', (_req, res) => {
  res.json({ service: 'executive-dashboard', version: '1.0.0', node: process.version, uptime: process.uptime() });
});

// ── API: Images ──────────────────────────────────────────────────────────────

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Serve images (token required via query param)
app.get('/api/images/:filename', auth, (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '');
  const fp = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(fp)) {
    // Return 1x1 transparent PNG instead of 404 — no console errors in frontend
    const PIXEL = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(PIXEL);
  }
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

// ── API: Instagram Media Proxy ───────────────────────────────────────────────

app.get('/api/instagram/media-proxy', auth, async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  // Only allow Instagram CDN domains
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  if (!parsed.hostname.match(/\.(cdninstagram\.com|fbcdn\.net)$/)) {
    return res.status(403).json({ error: 'Only Instagram CDN URLs allowed' });
  }
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) return res.status(upstream.status).end();
    const ct = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed' });
  }
});

// ── API: Instagram Insights ──────────────────────────────────────────────────

app.get('/api/instagram/insights', auth, (req, res) => {
  try {
    const file = path.join(INSTA_DIR, 'insights-cache.json');
    if (!fs.existsSync(file)) return res.json({});
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Instagram Forensics ────────────────────────────────────────────────

app.get('/api/instagram/forensics', auth, (req, res) => {
  try {
    // Find latest spike-forensic-v2 file
    let forensic = null;
    const forensicFiles = fs.readdirSync(INSTA_DIR)
      .filter(f => f.startsWith('spike-forensic-v2-') && f.endsWith('.json'))
      .sort();
    if (forensicFiles.length) {
      forensic = JSON.parse(fs.readFileSync(path.join(INSTA_DIR, forensicFiles[forensicFiles.length - 1]), 'utf8'));
    }

    // Find latest demographics snapshot
    let demographics = null;
    const demoDir = path.join(INSTA_DIR, 'demographics-snapshots');
    if (fs.existsSync(demoDir)) {
      const demoFiles = fs.readdirSync(demoDir)
        .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
        .sort();
      if (demoFiles.length) {
        demographics = JSON.parse(fs.readFileSync(path.join(demoDir, demoFiles[demoFiles.length - 1]), 'utf8'));
      }
    }

    res.json({ forensic, demographics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: Instagram Drafts ────────────────────────────────────────────────────

const INSTA_DRAFTS_DIR = path.join(INSTA_DIR, 'drafts');

/** Convert a Postgres row to the draft JSON shape the frontend expects. */
function rowToDraft(row) {
  return {
    id: row.id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    status: row.status,
    caption: row.caption || '',
    hashtags: row.hashtags || [],
    media_type: row.media_type || 'image',
    media_files: typeof row.media_files === 'string' ? JSON.parse(row.media_files) : (row.media_files || []),
    mediaPath: row.media_path || undefined,
    vision_analysis: row.vision_analysis || undefined,
    source_session_id: row.source_session_id || undefined,
    approved_at: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    approved_by: row.approved_by || undefined,
    published_at: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    meta_post_id: row.meta_post_id || undefined,
    instagram_post_id: row.meta_post_id || undefined,
    failed_at: row.failed_at ? new Date(row.failed_at).toISOString() : undefined,
    failure_reason: row.failure_reason || undefined,
  };
}

app.get('/api/instagram/drafts', auth, async (req, res) => {
  try {
    if (dbPool) {
      const { rows } = await dbPool.query(
        'SELECT * FROM insta_drafts WHERE status != $1 ORDER BY created_at DESC',
        ['archived']
      );
      return res.json(rows.map(rowToDraft));
    }
    // Fallback: file-based
    if (!fs.existsSync(INSTA_DRAFTS_DIR)) return res.json([]);
    const files = fs.readdirSync(INSTA_DRAFTS_DIR).filter(f => f.endsWith('.json'));
    const drafts = [];
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(INSTA_DRAFTS_DIR, f), 'utf8'));
        if (d?.id && d?.status) drafts.push(d);
      } catch { /* skip broken file */ }
    }
    drafts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(drafts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update Instagram draft
app.put('/api/instagram/drafts/:id', auth, async (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid draft id' });

    if (dbPool) {
      // Validate status if provided
      const validStatuses = ['draft', 'review', 'approved', 'published', 'archived'];
      if (req.body.status && !validStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
      }
      const { rows } = await dbPool.query('SELECT * FROM insta_drafts WHERE id = $1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Draft not found' });
      const draft = rows[0];
      const allowed = ['caption', 'hashtags', 'status'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) draft[key] = req.body[key];
      }
      await dbPool.query(
        'UPDATE insta_drafts SET caption=$2, hashtags=$3, status=$4 WHERE id=$1',
        [id, draft.caption, draft.hashtags, draft.status]
      );
      const { rows: updated } = await dbPool.query('SELECT * FROM insta_drafts WHERE id = $1', [id]);
      return res.json(rowToDraft(updated[0]));
    }

    // Fallback: file-based
    const filePath = path.join(INSTA_DRAFTS_DIR, `${id}.json`);
    if (!filePath.startsWith(INSTA_DRAFTS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const allowed = ['caption', 'hashtags', 'status'];
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

// Delete Instagram draft (soft-delete: DB → archived, file → .trash)
app.delete('/api/instagram/drafts/:id', auth, async (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid draft id' });

    if (dbPool) {
      const { rowCount } = await dbPool.query(
        "UPDATE insta_drafts SET status='archived' WHERE id=$1 AND status != 'archived'",
        [id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Draft not found or already archived' });
      return res.json({ ok: true });
    }

    // Fallback: file-based
    const filePath = path.join(INSTA_DRAFTS_DIR, `${id}.json`);
    if (!filePath.startsWith(INSTA_DRAFTS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const trashDir = path.join(INSTA_DRAFTS_DIR, '.trash');
    if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
    const bakName = `${id}.json.${Date.now()}.bak`;
    fs.renameSync(filePath, path.join(trashDir, bakName));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List media files for a draft
app.get('/api/instagram/drafts/:id/media', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    if (!id) return res.status(400).json({ error: 'Invalid draft id' });
    const filePath = path.join(INSTA_DRAFTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const files = [];

    // Check mediaPath field
    if (draft.mediaPath) {
      const mp = draft.mediaPath;
      if (fs.existsSync(mp)) {
        const stat = fs.statSync(mp);
        if (stat.isDirectory()) {
          for (const name of fs.readdirSync(mp)) {
            const fp = path.join(mp, name);
            try {
              const s = fs.statSync(fp);
              if (s.isFile()) files.push({ name, path: fp, type: detectMediaType(name) || 'document', size: s.size });
            } catch {}
          }
        } else {
          files.push({ name: path.basename(mp), path: mp, type: detectMediaType(mp) || 'document', size: stat.size });
        }
      }
    }

    // Fallback: check submission reference in notes
    if (!files.length && draft.notes) {
      const subMatch = draft.notes.match(/sub-[a-z0-9\-]+/i);
      if (subMatch) {
        const subDir = path.join(INSTA_DIR, 'submissions', subMatch[0]);
        if (fs.existsSync(subDir)) {
          for (const name of fs.readdirSync(subDir)) {
            const fp = path.join(subDir, name);
            try {
              const s = fs.statSync(fp);
              if (s.isFile() && detectMediaType(name)) files.push({ name, path: fp, type: detectMediaType(name), size: s.size });
            } catch {}
          }
        }
      }
    }

    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download a draft media file
app.get('/api/instagram/drafts/:id/download/:filename', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '');
    if (!id || !filename) return res.status(400).json({ error: 'Invalid parameters' });
    const filePath = path.join(INSTA_DRAFTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Draft not found' });
    const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let targetFile = null;
    if (draft.mediaPath) {
      const mp = draft.mediaPath;
      if (fs.existsSync(mp)) {
        const stat = fs.statSync(mp);
        if (stat.isDirectory()) {
          const candidate = path.join(mp, filename);
          if (candidate.startsWith(mp) && fs.existsSync(candidate)) targetFile = candidate;
        } else if (path.basename(mp) === filename) {
          targetFile = mp;
        }
      }
    }

    if (!targetFile) return res.status(404).json({ error: 'File not found' });
    res.download(targetFile, filename);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Raw Session Helpers ──────────────────────────────────────────────────────

function loadRawSession(id) {
  try { return JSON.parse(fs.readFileSync(path.join(RAW_DIR, id, 'session.json'), 'utf-8')); }
  catch { return null; }
}

function saveRawSession(session) {
  fs.writeFileSync(path.join(RAW_DIR, session.id, 'session.json'), JSON.stringify(session, null, 2));
}

function listRawSessions() {
  if (!fs.existsSync(RAW_DIR)) return [];
  return fs.readdirSync(RAW_DIR)
    .map(name => loadRawSession(name))
    .filter(s => s !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function generateRawSessionId(context) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  let base = 'raw';
  if (context) {
    const slug = context.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12);
    if (slug) base = `raw-${slug}`;
  }
  const candidate = `${base}-${dd}${mm}`;
  if (!fs.existsSync(path.join(RAW_DIR, candidate))) return candidate;
  for (let i = 2; i <= 20; i++) {
    const alt = `${candidate}-${i}`;
    if (!fs.existsSync(path.join(RAW_DIR, alt))) return alt;
  }
  return `${candidate}-${Date.now().toString(36).slice(-4)}`;
}

function detectMediaType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'txt', 'zip'].includes(ext)) return 'document';
  return null;
}

// ── API: Raw Sessions ────────────────────────────────────────────────────────

// List all raw sessions
app.get('/api/instagram/raw', auth, (req, res) => {
  try {
    const sessions = listRawSessions().map(s => {
      const origDir = path.join(RAW_DIR, s.id, 'original');
      let fileCount = 0, mediaCount = 0;
      try {
        const entries = fs.readdirSync(origDir);
        fileCount = entries.length;
        mediaCount = entries.filter(f => {
          const t = detectMediaType(f);
          return t === 'image' || t === 'video';
        }).length;
      } catch {}
      return { ...s, fileCount, mediaCount };
    });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Session detail with file list
app.get('/api/instagram/raw/:id', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    const session = loadRawSession(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const origDir = path.join(RAW_DIR, id, 'original');
    let files = [];
    try {
      files = fs.readdirSync(origDir).map(name => {
        const stat = fs.statSync(path.join(origDir, name));
        return { name, size: stat.size, type: detectMediaType(name) || 'document', mtime: stat.mtime.toISOString() };
      });
    } catch {}
    res.json({ session, files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create new raw session
app.post('/api/instagram/raw', auth, (req, res) => {
  try {
    const { id: customId, context } = req.body || {};
    const id = customId ? String(customId).replace(/[^a-z0-9\-]/g, '').slice(0, 30) : generateRawSessionId(context);
    const dir = path.join(RAW_DIR, id);
    if (fs.existsSync(dir)) return res.status(409).json({ error: 'Session already exists' });
    fs.mkdirSync(path.join(dir, 'original'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'processed'), { recursive: true });
    const session = { id, created_at: new Date().toISOString(), mode: 'upload', status: 'active', files: [] };
    fs.writeFileSync(path.join(dir, 'session.json'), JSON.stringify(session, null, 2));
    res.status(201).json({ session });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete raw session
app.delete('/api/instagram/raw/:id', auth, (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    const dir = path.join(RAW_DIR, id);
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Session not found' });
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload file to raw session — proxied to Core inbox endpoint (E2c)
const rawUploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/instagram/raw/:id/upload', auth, rawUploadMem.single('file'), async (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-z0-9\-_]/gi, '');
    const session = loadRawSession(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!INBOX_TOKEN) return res.status(500).json({ error: 'INBOX_TOKEN not configured' });

    const formData = new FormData();
    formData.append('session_id', id);
    formData.append('source', 'dashboard');
    formData.append('files', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

    const coreRes = await fetch(`${CORE_BASE}/api/instagram/inbox`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INBOX_TOKEN}` },
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });

    const coreBody = await coreRes.json();
    res.status(coreRes.status).json(coreBody);
  } catch (e) {
    console.error(`[dashboard] Inbox proxy error: ${e.message}`);
    res.status(502).json({ error: 'Core inbox unavailable', detail: e.message });
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

app.get('/api/health', auth, async (req, res) => {
  try {
    const days = Math.min(Math.max(1, Number(req.query.days) || 30), 365);
    const url = `${CORE_BASE}/api/health/entries?days=${days}`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${CORE_SERVICE_TOKEN}` }, signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Core health service unavailable', detail: e.message });
  }
});

app.get('/api/health/trends', auth, async (req, res) => {
  try {
    const days = Math.min(Math.max(1, Number(req.query.days) || 30), 365);
    const url = `${CORE_BASE}/api/health/trends?days=${days}`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${CORE_SERVICE_TOKEN}` }, signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Core health service unavailable', detail: e.message });
  }
});

app.get('/api/health/alerts', auth, async (req, res) => {
  try {
    const url = `${CORE_BASE}/api/health/alerts`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${CORE_SERVICE_TOKEN}` }, signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Core health service unavailable', detail: e.message });
  }
});

app.get('/api/health/chart-data', auth, async (req, res) => {
  try {
    const type = String(req.query.type || 'weight');
    const days = Math.min(Math.max(1, Number(req.query.days) || 90), 365);
    const url = `${CORE_BASE}/api/health/chart-data?type=${encodeURIComponent(type)}&days=${days}`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${CORE_SERVICE_TOKEN}` }, signal: AbortSignal.timeout(10_000) });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Core health service unavailable', detail: e.message });
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

// ── SharePoint API (Sprint 10 — Proxy to Core for reads, Graph for download/upload) ──

const spUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

// SharePoint reads → Core proxy (Sprint 10)
app.get('/api/sharepoint/sites', requireSession, proxyToCore);
app.get('/api/sharepoint/drives/:siteId', requireSession, proxyToCore);
app.get('/api/sharepoint/files/:siteId/:driveId', requireSession, proxyToCore);
app.get('/api/sharepoint/search', requireSession, proxyToCore);
app.get('/api/sharepoint/default-site', requireSession, proxyToCore);
app.post('/api/sharepoint/cleanup-missing', requireSession, proxyToCore);

// Download stays in dashboard (proxies to pre-auth Graph URL)
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

// Upload file to SharePoint drive, then notify Core
app.post('/api/sharepoint/upload', auth, spUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { siteId, driveId, path: filePath, siteName, driveName } = req.body;
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

    // Sprint 10: Notify Core to upsert the uploaded file in DB
    if (CORE_SERVICE_TOKEN) {
      try {
        await fetch(`${CORE_BASE}/api/sharepoint/upsert-uploaded`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CORE_SERVICE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: result.name || uploadPath,
            webUrl: result.webUrl || '',
            size: result.size || req.file.size || 0,
            lastModifiedDateTime: result.lastModifiedDateTime || new Date().toISOString(),
            createdDateTime: result.createdDateTime || new Date().toISOString(),
            graphItemId: result.id || null,
            mimeType: result.file?.mimeType || req.file.mimetype || null,
            siteId,
            driveId,
            siteName: siteName || '',
            driveName: driveName || '',
            path: uploadPath,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (notifyErr) {
        console.error(`[dashboard] SP upsert-uploaded notify failed: ${notifyErr.message}`);
      }
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Fleet (Sprint 6) — Proxy to Core ─────────────────────────────────────────
// All /api/fleet/* routes are proxied to Core (18789) via trust-boundary.
// Reads pass through with session only. Mutations require session + CSRF.
app.get('/api/fleet/*', requireSession, proxyToCore);
app.post('/api/fleet/*', requireSession, requireCsrf, proxyToCore);
app.patch('/api/fleet/*', requireSession, requireCsrf, proxyToCore);
app.delete('/api/fleet/*', requireSession, requireCsrf, proxyToCore);

// ── Banking (Sprint 7b) — Proxy to Core ──────────────────────────────────────
// All /api/banking/* routes are proxied to Core (18789) via trust-boundary.
// Reads pass through with session only. Mutations (connect, complete-tan) require session + CSRF.
app.get('/api/banking/*', requireSession, proxyToCore);
app.post('/api/banking/*', requireSession, requireCsrf, proxyToCore);
app.delete('/api/banking/*', requireSession, requireCsrf, proxyToCore);

// ── API: Fleet (Legacy — File-based, disabled by Sprint 6 proxy above) ───────

/* DISABLED: Old file-based fleet routes — replaced by Core proxy above.
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
app.put('/api/fleet/:id', auth, async (req, res) => {
  try {
    const all = readFleet();
    const idx = all.findIndex(v => v.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });
    const allowed = ['name', 'plate', 'vin', 'make', 'model', 'year', 'color', 'mileage', 'tuevDate', 'purchasePrice', 'vehicleTax', 'insurance'];
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
      // Update link-store references via Core API
      await fetch(`${CORE_BASE}/api/links/rename-entity`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CORE_SERVICE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'fleet', old_entity_id: oldId, new_entity_id: newId }),
      }).catch(() => {});
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
END DISABLED */

// ── Document Links API (Sprint 9: proxy to Core) ─────────────────────────────

app.get('/api/links', requireSession, proxyToCore);
app.get('/api/links/search/sp', requireSession, proxyToCore);
app.get('/api/links/:entityType/:entityId', requireSession, proxyToCore);
app.post('/api/links', requireSession, requireCsrf, proxyToCore);
app.delete('/api/links/:linkCode', requireSession, requireCsrf, proxyToCore);

// ── Assets (Immobilien) — Proxy to Core (Sprint 5.5a-1) ─────────────────────
// All /api/assets/* routes are proxied to Core (18789) via trust-boundary.
// Reads pass through with auth only. Mutations require session + CSRF.

app.get('/api/assets/*', requireSession, proxyToCore);
app.post('/api/assets/*', requireSession, requireCsrf, proxyToCore);
app.patch('/api/assets/*', requireSession, requireCsrf, proxyToCore);
app.put('/api/assets/*', requireSession, requireCsrf, proxyToCore);
app.delete('/api/assets/*', requireSession, requireCsrf, proxyToCore);

// ── API: Private Equity ───────────────────────────────────────────────────────

function readPE() {
  try { return JSON.parse(fs.readFileSync(PE_FILE, 'utf8')); } catch { return []; }
}
function writePE(investments) {
  fs.mkdirSync(PE_DIR, { recursive: true });
  fs.writeFileSync(PE_FILE, JSON.stringify(investments, null, 2));
}
function slugifyPE(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function makePEId(company, existingIds) {
  const base = slugifyPE(company);
  if (!base) return 'pe-' + Date.now();
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// List investments
app.get('/api/pe', auth, (req, res) => {
  try { res.json(readPE()); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create investment
app.post('/api/pe', auth, (req, res) => {
  try {
    const { company, sector, investedAmount, shares, totalShares, investmentDate, valuationMethod, contactPerson, notes, status } = req.body;
    if (!company || investedAmount == null || shares == null || totalShares == null) {
      return res.status(400).json({ error: 'company, investedAmount, shares, totalShares are required' });
    }
    const amt = Number(investedAmount), sh = Number(shares), ts = Number(totalShares);
    const all = readPE();
    const now = new Date().toISOString();
    const ownershipPct = ts > 0 ? Math.round((sh / ts) * 10000) / 100 : 0;
    const inv = {
      id: makePEId(String(company), all.map(i => i.id)),
      company: String(company),
      sector: String(sector || ''),
      investmentDate: investmentDate || now.slice(0, 10),
      shares: sh, totalShares: ts, ownershipPct,
      investedAmount: amt,
      currentValuation: amt,
      valuationDate: now.slice(0, 10),
      valuationMethod: valuationMethod || 'cost',
      status: status || 'active',
      contactPerson: contactPerson || undefined,
      notes: notes || undefined,
      createdAt: now, updatedAt: now,
    };
    all.push(inv);
    writePE(all);
    res.status(201).json(inv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single investment
app.get('/api/pe/:id', auth, (req, res) => {
  try {
    const inv = readPE().find(i => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Investment not found' });
    res.json(inv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update investment
app.put('/api/pe/:id', auth, (req, res) => {
  try {
    const all = readPE();
    const idx = all.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Investment not found' });
    const allowed = ['company', 'sector', 'investmentDate', 'shares', 'totalShares', 'investedAmount', 'currentValuation', 'valuationDate', 'valuationMethod', 'status', 'contactPerson', 'notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) all[idx][key] = req.body[key];
    }
    // Recalc ownership
    const sh = Number(all[idx].shares), ts = Number(all[idx].totalShares);
    all[idx].ownershipPct = ts > 0 ? Math.round((sh / ts) * 10000) / 100 : 0;
    all[idx].updatedAt = new Date().toISOString();
    writePE(all);
    res.json(all[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete investment
app.delete('/api/pe/:id', auth, (req, res) => {
  try {
    const all = readPE();
    const idx = all.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Investment not found' });
    all.splice(idx, 1);
    writePE(all);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add valuation
app.post('/api/pe/:id/valuation', auth, (req, res) => {
  try {
    const all = readPE();
    const idx = all.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Investment not found' });
    const { amount, method, notes } = req.body;
    if (amount == null) return res.status(400).json({ error: 'amount is required' });
    const now = new Date().toISOString();
    const entry = { investmentId: req.params.id, date: now.slice(0, 10), amount: Number(amount), method: method || all[idx].valuationMethod, notes: notes || undefined };
    fs.mkdirSync(PE_DIR, { recursive: true });
    fs.appendFileSync(PE_VAL_FILE, JSON.stringify(entry) + '\n', 'utf8');
    all[idx].currentValuation = Number(amount);
    all[idx].valuationDate = entry.date;
    if (method) all[idx].valuationMethod = method;
    all[idx].updatedAt = now;
    writePE(all);
    res.status(201).json(all[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get valuation history
app.get('/api/pe/:id/valuations', auth, (req, res) => {
  try {
    if (!fs.existsSync(PE_VAL_FILE)) return res.json([]);
    const entries = fs.readFileSync(PE_VAL_FILE, 'utf8')
      .split('\n').filter(l => l.trim())
      .map(l => JSON.parse(l))
      .filter(e => e.investmentId === req.params.id);
    res.json(entries);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Trading Proxy ────────────────────────────────────────────────────────────

const TRADING_URL = 'http://127.0.0.1:18793';

app.get('/api/trading/status', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/status`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json({ connected: false, error: 'Service nicht erreichbar' });
  }
});

app.get('/api/trading/watchlist', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/watchlist`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json([]);
  }
});

app.post('/api/trading/watchlist', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Service nicht erreichbar' });
  }
});

app.delete('/api/trading/watchlist/:symbol', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/watchlist/${req.params.symbol}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Service nicht erreichbar' });
  }
});

app.get('/api/trading/strategies', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/strategies`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json({});
  }
});

// ── Trading Universe Proxy ────────────────────────────────────────────────────

app.get('/api/trading/universe', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json({ symbols: [], lastBuild: '', totalScanned: 0 });
  }
});

app.get('/api/trading/universe/config', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe/config`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json({});
  }
});

app.put('/api/trading/universe/config', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Service nicht erreichbar' });
  }
});

app.get('/api/trading/universe/scan', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe/scan`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json([]);
  }
});

app.post('/api/trading/universe/scan', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe/scan`, {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.status(503).json({ error: 'Scan fehlgeschlagen oder Timeout' });
  }
});

app.get('/api/trading/universe/top', auth, async (req, res) => {
  try {
    const r = await fetch(`${TRADING_URL}/universe/top`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.json(await r.json());
  } catch {
    res.json([]);
  }
});

// ── API: System Status Widget ────────────────────────────────────────────────

let _statusCache = { data: null, ts: 0 };
const STATUS_CACHE_TTL = 30_000; // 30s

app.get('/api/dashboard/status', auth, async (_req, res) => {
  try {
    if (_statusCache.data && Date.now() - _statusCache.ts < STATUS_CACHE_TTL) {
      return res.json(_statusCache.data);
    }
    const r = await fetch('http://127.0.0.1:18789/api/system-status', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`Core returned ${r.status}`);
    const data = await r.json();
    _statusCache = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    // Return cached data if available, even if stale
    if (_statusCache.data) return res.json({ ..._statusCache.data, _stale: true });
    res.status(503).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

// ── Startup Canary ──────────────────────────────────────────────────────────

if (!CORE_SERVICE_TOKEN) {
  console.error('[dashboard] CRITICAL: CORE_SERVICE_TOKEN not set — assets proxy will fail');
}

// Scan public/ for leaked tokens
try {
  const publicDir = path.join(__dirname, 'public');
  const tokenPattern = /Bearer [a-f0-9]{32,}/;
  for (const file of fs.readdirSync(publicDir)) {
    if (file.endsWith('.html') || file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(publicDir, file), 'utf-8');
      if (tokenPattern.test(content)) {
        console.error(`[dashboard] CANARY ALERT: Possible leaked token in public/${file} — aborting`);
        process.exit(1);
      }
    }
  }
} catch (e) {
  // Non-fatal if public dir can't be scanned
}

app.listen(PORT, BIND, () => {
  const configured = DASHBOARD_TOKEN ? '✓ token configured' : '⚠ DASHBOARD_TOKEN missing!';
  const coreConfigured = CORE_SERVICE_TOKEN ? '✓ core token' : '⚠ CORE_SERVICE_TOKEN missing!';
  const inboxConfigured = INBOX_TOKEN ? '✓ inbox token' : '⚠ INBOX_TOKEN missing!';
  console.log(`[dashboard] http://${BIND}:${PORT}  ${configured}  ${coreConfigured}  ${inboxConfigured}`);
  console.log('[dashboard] public via nginx: https://<server-ip>:8443/dashboard/');
});
