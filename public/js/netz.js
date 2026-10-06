/* ═══════════════════════════════════════════════════════════════════════════
   Netzschicht — eine Stelle für alle lesenden Abrufe
   Paket A1 (Phase 3, CHECKPOINT-2-Befund „Load failed" am iPhone)

   BEFUND (Owner, 06.10.2026 13:28–13:35 Ortszeit = 11:28–11:35 UTC)
   In „Immobilien" und „Instagram › Rohmaterial" erschien mehrfach
   „Fehler: Load failed" bzw. „Fehler beim Laden: Load failed"; der Bereich
   blieb leer. Am Desktop trat das nie auf.

   URSACHE, am Protokoll belegt
   Im gesamten Zeitfenster hat der Server KEINEN einzigen Fehler geliefert:
   alle Anfragen, die nginx erreichten, wurden mit 200 oder 304 beantwortet,
   und am 06.10. gibt es im Zugriffsprotokoll keine einzige 5xx- und keine
   499-Zeile. Die fehlgeschlagenen Anfragen erscheinen im Protokoll gar
   nicht — sie wurden auf dem Transportweg abgebrochen, bevor nginx sie sah.
   Belegt ist außerdem ein Netzwechsel mitten in der Sitzung: bis 11:28:53
   kamen die Anfragen über die WLAN-Adresse, um 11:30:11 über die
   Mobilfunkadresse, ab 11:31:32 wieder über WLAN. Genau in diesem Wechsel
   liegen die Fehlmeldungen. WebKit (Safari und Chrome auf iOS benutzen
   dieselbe Netzschicht) meldet einen auf Transportebene abgebrochenen
   `fetch` wörtlich als `TypeError: Load failed` — ohne Statuscode, ohne
   weitere Angabe. Dieselbe Meldung erzeugt ein Abbruch beim Wechsel in den
   Hintergrund.

   VERSTÄRKENDER FAKTOR
   Beim Bereichswechsel feuert das Dashboard bis zu ~20 Anfragen gleichzeitig
   (Immobilien: Objekte, Verträge, Abrechnungsreife je Objekt und Jahr …).
   Die Verbindung läuft über HTTP/1.1; WebKit hält dafür höchstens sechs
   gleichzeitige Verbindungen je Host. Ein Transportabbruch trifft damit nicht
   eine Anfrage, sondern eine ganze Welle — deshalb mehrere Meldungen auf
   einmal und ein leerer Bereich.

   WAS DIESE DATEI TUT
   1. Begrenzt gleichzeitige lesende Abrufe auf NETZ_MAX_PARALLEL. Damit
      stehen nie mehr Anfragen offen, als der Browser gleichzeitig führt.
   2. Wiederholt einen lesenden Abruf bei einem reinen Netzfehler zweimal mit
      ansteigender Wartezeit. Ein Netzwechsel ist nach wenigen hundert
      Millisekunden abgeschlossen; der zweite Versuch gelingt dann.
   3. Übersetzt die Fehlermeldungen. „Load failed" sagt dem Nutzer nichts;
      „Verbindung unterbrochen" sagt ihm, was er tun kann.
   4. Unterdrückt einen absichtlichen Abbruch (AbortError) als Fehlermeldung.

   NICHT verändert werden Schreibwege: eine Mutation wird NIE automatisch
   wiederholt. Eine zweimal gesendete Änderung wäre schlimmer als eine
   Fehlermeldung.

   Abhängigkeiten: keine. Diese Datei wird als erste geladen.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Vier gleichzeitige lesende Abrufe. Unter der Browsergrenze von sechs, damit
   für Bilder und Nachladungen Luft bleibt. */
const NETZ_MAX_PARALLEL = 4;

/* Zwei Wiederholungen, danach wird der Fehler gemeldet. */
const NETZ_WARTEZEITEN_MS = [400, 1200];

let _netzLaufend = 0;
const _netzWarteschlange = [];

function _netzNaechste() {
  if (_netzLaufend >= NETZ_MAX_PARALLEL) return;
  const auftrag = _netzWarteschlange.shift();
  if (!auftrag) return;
  _netzLaufend += 1;
  auftrag();
}

/* Platz in der Warteschlange holen. Gibt eine Funktion zurück, die den Platz
   wieder freigibt. */
function _netzPlatz() {
  return new Promise((weiter) => {
    _netzWarteschlange.push(() => weiter());
    _netzNaechste();
  });
}

function _netzFrei() {
  _netzLaufend = Math.max(0, _netzLaufend - 1);
  _netzNaechste();
}

function _netzSchlafen(ms) {
  return new Promise((weiter) => setTimeout(weiter, ms));
}

/* Ein reiner Netzfehler: `fetch` wirft einen TypeError ohne Statuscode.
   Ein HTTP-Fehler (404, 500) kommt NICHT hier an — der liefert eine Antwort
   und wird von der jeweiligen Auswertung behandelt. */
function netzIstNetzfehler(e) {
  if (!e) return false;
  if (e.name === 'AbortError') return false;
  return e instanceof TypeError
    || /load failed|network ?error|failed to fetch|verbindung/i.test(String(e.message || ''));
}

function netzIstAbbruch(e) {
  return !!e && (e.name === 'AbortError' || /aborted/i.test(String(e.message || '')));
}

/* Verständlicher Satz statt der Browsermeldung. Jede Meldung sagt, was gilt
   und was der Nutzer tun kann. */
function netzFehlerText(e) {
  if (!e) return 'Unbekannter Fehler.';
  if (netzIstAbbruch(e)) return 'Abruf abgebrochen.';
  if (netzIstNetzfehler(e)) {
    return 'Verbindung unterbrochen. Das Gerät hat die Anfrage nicht zu Ende senden können '
      + '(häufig beim Wechsel zwischen WLAN und Mobilfunk). Erneut versuchen.';
  }
  const m = /^HTTP (\d{3})$/.exec(String(e.message || ''));
  if (m) {
    const code = m[1];
    if (code === '404') return 'Der Abruf ist ins Leere gegangen (404). Die Daten sind nicht vorhanden.';
    if (code === '403') return 'Der Zugriff wurde abgelehnt (403).';
    if (code.startsWith('5')) return 'Der Server hat den Abruf nicht beantwortet (' + code + '). Erneut versuchen.';
    return 'Der Abruf wurde mit Status ' + code + ' abgewiesen.';
  }
  return String(e.message || e);
}

/* Schaltfläche „Erneut versuchen" für Leer- und Fehlerzustände.
   `aufruf` ist ein JavaScript-Ausdruck als Zeichenkette. */
function netzWiederholenKnopf(aufruf) {
  return '<button type="button" class="btn" onclick="' + aufruf + '">Erneut versuchen</button>';
}

/* Der einzige echte `fetch` des Dashboards.

   `opts.method` entscheidet über die Wiederholung: nur GET und HEAD werden
   wiederholt. `opts.netzKeineWiederholung === true` schaltet sie auch dort ab. */
async function netzFetch(url, opts = {}) {
  const methode = String(opts.method || 'GET').toUpperCase();
  const wiederholbar = (methode === 'GET' || methode === 'HEAD')
    && opts.netzKeineWiederholung !== true;
  /* Eigenes Feld nicht an fetch weitergeben. */
  const fetchOpts = { ...opts };
  delete fetchOpts.netzKeineWiederholung;

  await _netzPlatz();
  try {
    let letzterFehler = null;
    const versuche = wiederholbar ? NETZ_WARTEZEITEN_MS.length + 1 : 1;
    for (let i = 0; i < versuche; i += 1) {
      try {
        return await fetch(url, fetchOpts);
      } catch (e) {
        letzterFehler = e;
        /* Ein absichtlicher Abbruch wird nicht wiederholt. */
        if (netzIstAbbruch(e) || !netzIstNetzfehler(e)) throw e;
        if (i < versuche - 1) await _netzSchlafen(NETZ_WARTEZEITEN_MS[i]);
      }
    }
    throw letzterFehler;
  } finally {
    _netzFrei();
  }
}
