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

app.post('/api/trips', auth, (req, res) => {
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
    fs.writeFileSync(filePath, JSON.stringify(trip, null, 2));
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
      `&$select=subject,start,end,isAllDay,location,organizer,onlineMeeting` +
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

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, BIND, () => {
  const configured = DASHBOARD_TOKEN ? '✓ token configured' : '⚠ DASHBOARD_TOKEN missing!';
  console.log(`[dashboard] http://${BIND}:${PORT}  ${configured}`);
  console.log('[dashboard] public via nginx: https://<server-ip>:8443/dashboard/');
});
