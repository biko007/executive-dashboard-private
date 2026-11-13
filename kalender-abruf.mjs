/* Kalenderabruf mit Wiederholung und letztem guten Stand (Auftrag kalender-500, 13.11.2026).

   Befund 13.11.2026: Das Exchange-Backend hinter Graph beantwortete rund 70 %
   der Postfachabfragen (Kalender und Mail, beide Postfächer) erst nach 21 s
   mit 502; die übrigen kamen in 0,3 s mit 200. Kein 429, kein Retry-After.
   Der alte Abruf wartete 20 s und brach dann ab — die Kachel blieb leer.

   Deshalb:
   - kurzer Zeitrahmen je Versuch (ein gesunder Abruf braucht < 1 s) und
     wenige Wiederholungen innerhalb eines Gesamtbudgets;
   - $top=100, damit das 8-Tage-Fenster in einer Seite kommt statt in
     Zehnerseiten (Graph-Standard), von denen jede einzeln scheitern kann;
   - nach jedem Erfolg der Stand auf Platte; scheitert Graph, liefert der
     Server diesen Stand mit Zeitstempel aus, statt leer zu antworten. */

import fs from 'node:fs';
import path from 'node:path';

export const VERSUCH_MS = 6000;
export const GESAMT_MS = 25000;
export const MAX_VERSUCHE = 4;
export const MAX_SEITEN = 10;

/** Ein GET mit Wiederholung. Wiederholt bei Zeitüberschreitung, Netzfehler,
 *  429 und 5xx; andere Fehler (401/403/404) sofort weiter. */
export async function holeMitWiederholung(url, token, { fetchFn = fetch, versuchMs = VERSUCH_MS, frist, maxVersuche = MAX_VERSUCHE, schlafen = (ms) => new Promise(r => setTimeout(r, ms)), jetzt = () => Date.now() } = {}) {
  let letzter = null;
  for (let i = 0; i < maxVersuche; i += 1) {
    const rest = frist - jetzt();
    if (rest <= 200) break;
    try {
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(Math.min(versuchMs, rest)),
      });
      if (res.ok) return await res.json();
      const text = await res.text().catch(() => '');
      letzter = new Error(`Graph API HTTP ${res.status}: ${text.slice(0, 200)}`);
      letzter.status = res.status;
      if (res.status !== 429 && res.status < 500) throw letzter;
      const ra = Number(res.headers?.get?.('retry-after'));
      if (Number.isFinite(ra) && ra > 0) await schlafen(Math.min(ra * 1000, Math.max(0, frist - jetzt() - 200)));
    } catch (e) {
      if (e.status && e.status !== 429 && e.status < 500) throw e;
      letzter = e.status ? e : new Error(e?.name === 'TimeoutError' ? 'The operation was aborted due to timeout' : String(e?.message || e));
    }
  }
  throw letzter || new Error('The operation was aborted due to timeout');
}

/** Alle Seiten der calendarView holen. */
export async function kalenderHolen(ersteUrl, token, opts = {}) {
  const frist = (opts.jetzt || Date.now)() + (opts.gesamtMs || GESAMT_MS);
  const events = [];
  let url = ersteUrl;
  for (let i = 0; i < MAX_SEITEN && url; i += 1) {
    const json = await holeMitWiederholung(url, token, { ...opts, frist });
    if (json?.value?.length) events.push(...json.value);
    url = json?.['@odata.nextLink'] || null;
  }
  return events;
}

export function standLesen(datei) {
  try {
    const j = JSON.parse(fs.readFileSync(datei, 'utf8'));
    if (Array.isArray(j?.events) && typeof j?.stand === 'string') return j;
  } catch { /* kein Stand vorhanden */ }
  return null;
}

export function standSchreiben(datei, events, stand = new Date().toISOString()) {
  try {
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    const tmp = `${datei}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ stand, events }));
    fs.renameSync(tmp, datei);
  } catch (e) {
    console.error('[calendar] Stand nicht gespeichert:', e.message);
  }
}
