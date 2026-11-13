/* kalender-500 (13.11.2026): Wiederholung und letzter guter Stand. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { kalenderHolen, holeMitWiederholung, standLesen, standSchreiben } from '../kalender-abruf.mjs';

const antwort = (status, body = {}, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

/* Gefälschter fetch: liefert nacheinander die vorgegebenen Ergebnisse. */
function folge(...ergebnisse) {
  const aufrufe = [];
  const fetchFn = async (url) => {
    aufrufe.push(url);
    const e = ergebnisse.shift();
    if (e instanceof Error) throw e;
    return e;
  };
  return { fetchFn, aufrufe };
}
const ohneWarten = { schlafen: async () => {} };

test('Erfolg beim ersten Versuch', async () => {
  const { fetchFn, aufrufe } = folge(antwort(200, { value: [{ id: 'a' }] }));
  const ev = await kalenderHolen('u1', 't', { fetchFn, ...ohneWarten });
  assert.deepEqual(ev, [{ id: 'a' }]);
  assert.equal(aufrufe.length, 1);
});

test('502 und Zeitüberschreitung werden wiederholt, dann Erfolg', async () => {
  const zeit = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  const { fetchFn, aufrufe } = folge(antwort(502), zeit, antwort(200, { value: [{ id: 'b' }] }));
  const ev = await kalenderHolen('u1', 't', { fetchFn, ...ohneWarten });
  assert.deepEqual(ev, [{ id: 'b' }]);
  assert.equal(aufrufe.length, 3);
});

test('Folgeseiten über nextLink werden geholt', async () => {
  const { fetchFn, aufrufe } = folge(
    antwort(200, { value: [{ id: 1 }], '@odata.nextLink': 'u2' }),
    antwort(200, { value: [{ id: 2 }] }),
  );
  const ev = await kalenderHolen('u1', 't', { fetchFn, ...ohneWarten });
  assert.deepEqual(ev.map(e => e.id), [1, 2]);
  assert.deepEqual(aufrufe, ['u1', 'u2']);
});

test('Dauerhaft 502: nach höchstens 4 Versuchen Fehler', async () => {
  const { fetchFn, aufrufe } = folge(antwort(502), antwort(502), antwort(502), antwort(502), antwort(200, { value: [] }));
  await assert.rejects(kalenderHolen('u1', 't', { fetchFn, ...ohneWarten }), /HTTP 502/);
  assert.equal(aufrufe.length, 4);
});

test('403 wird nicht wiederholt', async () => {
  const { fetchFn, aufrufe } = folge(antwort(403), antwort(200, { value: [] }));
  await assert.rejects(kalenderHolen('u1', 't', { fetchFn, ...ohneWarten }), /HTTP 403/);
  assert.equal(aufrufe.length, 1);
});

test('Gesamtbudget begrenzt die Versuche', async () => {
  let uhr = 0;
  const fetchFn = async () => { uhr += 10_000; return antwort(502); };
  await assert.rejects(holeMitWiederholung('u', 't', { fetchFn, frist: 25_000, jetzt: () => uhr, ...ohneWarten }));
  assert.ok(uhr <= 30_000, `Uhr ${uhr}`);
});

test('Stand schreiben und lesen; kaputte Datei ergibt null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kal-'));
  const datei = path.join(dir, 'sub', 'stand.json');
  assert.equal(standLesen(datei), null);
  standSchreiben(datei, [{ id: 'x' }], '2026-11-13T01:00:00.000Z');
  assert.deepEqual(standLesen(datei), { stand: '2026-11-13T01:00:00.000Z', events: [{ id: 'x' }] });
  fs.writeFileSync(datei, '{kaputt');
  assert.equal(standLesen(datei), null);
  fs.rmSync(dir, { recursive: true, force: true });
});
