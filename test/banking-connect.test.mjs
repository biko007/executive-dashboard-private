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
  vm.runInContext(code + '\n;globalThis.__f = { bankingConnectFormHtml, bankingVerbindenBody, BANKING_BANKEN };', kontext);
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
