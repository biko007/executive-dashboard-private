/**
 * Banking-Formular „Bank verbinden" (20.10.2026): beide Banken wählbar,
 * KSK-Anfrage unverändert gegenüber dem erfolgreichen Verbinden vom
 * 20.10.2026, 11:11. Ohne Browser und ohne Bankkontakt: die Datei wird in
 * einem leeren Kontext geladen, Alpine wird nur so weit nachgestellt, wie
 * die Registrierung es braucht.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function lade() {
  let komponente = null;
  const kontext = {
    ENDPOINT_MAP: {},
    console,
    approvalMutation: async () => ({}),
    document: { addEventListener: (_e, fn) => fn() },
    Alpine: { data: (_name, fabrik) => { komponente = fabrik(); }, store: () => ({}) },
    window: {}, setTimeout, clearTimeout,
  };
  vm.createContext(kontext);
  const code = readFileSync(new URL('../public/js/banking-connect.js', import.meta.url), 'utf8');
  vm.runInContext(code + '\n;globalThis.__f = { bankingConnectFormHtml, bankingVerbindenBody, BANKING_BANKEN, bankingFreigabeHinweis };', kontext);
  return { ...kontext.__f, komponente };
}

test('Formular bietet KSK und Volksbank an, nichts ist gesperrt', () => {
  const { bankingConnectFormHtml } = lade();
  const html = bankingConnectFormHtml();
  assert.match(html, /<option value="64350070">Kreissparkasse Tuttlingen \(64350070\)<\/option>/);
  assert.match(html, /<option value="64390130">Volksbank Schwarzwald-Donau-Neckar eG \(64390130\)<\/option>/);
  assert.doesNotMatch(html, /Weitere Banken werden später unterstützt/);
  assert.doesNotMatch(html, /x-model="blz" disabled/);
});

test('KSK-Anfrage ist Feld für Feld dieselbe wie vor der Änderung', () => {
  const { bankingVerbindenBody } = lade();
  assert.deepEqual(
    { ...bankingVerbindenBody('64350070', 'KENNUNG', 'GEHEIM', 'pushTAN1') },
    {
      blz: '64350070',
      bank_name: 'Kreissparkasse Tuttlingen',
      fints_url: 'https://banking-bw1.s-fints-pt-bw.de/fints30',
      user_id: 'KENNUNG',
      pin: 'GEHEIM',
      tan_medium: 'pushTAN1',
    });
});

test('Volksbank: Adresse hinterlegt, SecureGo plus, eigener Platzhalter', () => {
  const { bankingVerbindenBody, komponente } = lade();
  const body = bankingVerbindenBody('64390130', 'ALIAS', 'GEHEIM', 'SecureGo');
  assert.equal(body.fints_url, 'https://fints1.atruvia.de/cgi-bin/hbciservlet');
  assert.equal(body.bank_name, 'Volksbank Schwarzwald-Donau-Neckar eG');

  komponente.blz = '64390130';
  komponente.bankGewechselt();
  assert.equal(komponente.tanMedium, 'SecureGo');
  // Array aus dem vm-Kontext: über JSON vergleichen (anderes Realm)
  assert.equal(JSON.stringify(komponente.tanVerfahrenListe.map(v => v.label)), JSON.stringify(['SecureGo plus (App-Freigabe)']));
  assert.equal(komponente.anmeldePlatzhalter, 'VR-NetKey oder Alias');
  assert.match(komponente.freigabeHinweis, /SecureGo plus App/);
});

test('Zurück zur KSK stellt S-pushTAN wieder ein', () => {
  const { komponente } = lade();
  komponente.blz = '64390130';
  komponente.bankGewechselt();
  komponente.blz = '64350070';
  komponente.bankGewechselt();
  assert.equal(komponente.tanMedium, 'pushTAN1');
  assert.equal(komponente.anmeldePlatzhalter, 'Benutzerkennung');
  assert.match(komponente.freigabeHinweis, /S-pushTAN App/);
});

test('unbekannte BLZ fällt auf die KSK zurück, nie auf eine freie Adresse', () => {
  const { bankingVerbindenBody } = lade();
  assert.equal(bankingVerbindenBody('99999999', 'u', 'p', 'x').blz, '64350070');
});

/* Abruf nach dem Verbinden (23.10.2026): Statusabfrage mit nachgestellten
   Zeitgebern — jeder setTimeout-Aufruf wird gesammelt und von Hand ausgelöst. */
function ladeMitAbruf(phasen) {
  let komponente = null;
  const zeitgeber = [];
  const abfragen = [];
  const kontext = {
    ENDPOINT_MAP: {}, console, approvalMutation: async () => ({}),
    document: { addEventListener: (_e, fn) => fn() },
    Alpine: {
      data: (_name, fabrik) => { komponente = fabrik(); },
      store: () => ({ fetch: async (url) => { abfragen.push(url); return { ok: true, json: async () => ({ phase: phasen.shift() }) }; } }),
    },
    window: {}, setTimeout: (fn) => { zeitgeber.push(fn); return zeitgeber.length; }, clearTimeout: () => {},
  };
  vm.createContext(kontext);
  vm.runInContext(readFileSync(new URL('../public/js/banking-connect.js', import.meta.url), 'utf8'), kontext);
  return { komponente, zeitgeber, abfragen };
}

const warte = () => new Promise(r => setImmediate(r));

test('nach dem Verbinden: Hinweis zur zweiten Freigabe, solange die Bank wartet, danach Übersicht', async () => {
  const { komponente, zeitgeber, abfragen } = ladeMitAbruf(['laeuft', 'warte_auf_freigabe', 'warte_auf_freigabe', 'fertig']);
  let uebersicht = 0;
  komponente.loadOverview = () => { uebersicht++; };
  komponente.sessionId = 21;
  komponente.view = 'connect';
  komponente.beobachteAbruf();
  const gesehen = [];
  for (let i = 0; i < 4; i++) {
    await warte();
    gesehen.push(komponente.abrufPhase);
    if (i < 3) zeitgeber.shift()();
  }
  assert.deepEqual(gesehen, ['laeuft', 'warte_auf_freigabe', 'warte_auf_freigabe', 'fertig']);
  assert.equal(abfragen[0], '/api/banking/abruf-status/21');
  zeitgeber.shift()();   // Weiterleitung nach „fertig"
  assert.equal(komponente.view, 'overview');
  assert.equal(uebersicht, 1);
  assert.equal(komponente.abrufPhase, null);
});

test('Formular zeigt den Freigabe-Hinweis genau in der Phase „warte_auf_freigabe"', () => {
  const { bankingConnectFormHtml } = lade();
  const html = bankingConnectFormHtml();
  assert.match(html, /x-show="abrufPhase === 'warte_auf_freigabe'"[^>]*>\s*<div x-text="abrufHinweis"><\/div>/);
  assert.match(html, /x-show="abrufAbbrechbar"[\s\S]*@click="abrufAbbrechen\(\)"/);
});

test('Hinweistext: Freigabe n von m – Konto …xxxx', () => {
  const { bankingFreigabeHinweis } = lade();
  assert.equal(bankingFreigabeHinweis({ phase: 'warte_auf_freigabe', n: 2, m: 8, konto: '0133' }),
    'Freigabe 2 von 8 in der App bestätigen – Konto …0133');
  assert.equal(bankingFreigabeHinweis({ phase: 'laeuft', n: 2, m: 8, konto: '0133' }), '');
  assert.equal(bankingFreigabeHinweis({ phase: 'warte_auf_freigabe' }), 'Freigabe in der App bestätigen');
});

test('Kennung wird ohne Leerraum gesendet, PIN unverändert', () => {
  const { bankingVerbindenBody } = lade();
  const body = bankingVerbindenBody('64350070', ' KENNUNG\u00A0\t', ' GEHEIM ', 'pushTAN1');
  assert.equal(body.user_id, 'KENNUNG');
  assert.equal(body.pin, ' GEHEIM ');
});

test('Formulartext beschreibt die verschlüsselte Speicherung der PIN', () => {
  const { bankingConnectFormHtml } = lade();
  const html = bankingConnectFormHtml();
  assert.match(html, /PIN wird verschlüsselt übertragen und verschlüsselt gespeichert/);
  assert.doesNotMatch(html, /nicht gespeichert/);
});

test('Abbrechen während der Freigaben schickt DELETE an die Sitzung, einmal', async () => {
  const aufrufe = [];
  let komponente = null;
  const kontext = {
    ENDPOINT_MAP: {}, console, approvalMutation: async () => ({}),
    document: { addEventListener: (_e, fn) => fn() },
    Alpine: { data: (_n, f) => { komponente = f(); }, store: () => ({ fetch: async (url, opt) => { aufrufe.push([url, opt && opt.method]); return { ok: true }; } }) },
    window: {}, setTimeout, clearTimeout,
  };
  vm.createContext(kontext);
  vm.runInContext(readFileSync(new URL('../public/js/banking-connect.js', import.meta.url), 'utf8'), kontext);
  komponente.sessionId = 25;
  komponente.abrufAbbrechbar = true;
  await komponente.abrufAbbrechen();
  await komponente.abrufAbbrechen();
  assert.deepEqual(aufrufe, [['/api/banking/session/25', 'DELETE']]);
  assert.equal(komponente.abrufAbbrechbar, false);
  assert.equal(komponente.abrufAbbruchGesendet, true);
});

test('Ansicht inzwischen gewechselt: keine Weiterleitung', async () => {
  const { komponente, zeitgeber } = ladeMitAbruf(['fertig']);
  komponente.loadOverview = () => { throw new Error('darf nicht laufen'); };
  komponente.sessionId = 22;
  komponente.view = 'connect';
  komponente.beobachteAbruf();
  await warte();
  komponente.view = 'accounts';
  zeitgeber.shift()();
  assert.equal(komponente.view, 'accounts');
});
