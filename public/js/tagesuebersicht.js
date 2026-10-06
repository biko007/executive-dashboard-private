/* ═══════════════════════════════════════════════════════════════════════════
   Tagesübersicht — Startansicht „Heute"
   Paket P2-5 (Spec §5, prompts/dashboard-ueberarbeitung/03-…)

   WARUM
   Die Anwendung startete im Health-Bereich. Um zu sehen, was heute wichtig
   ist, musste der Owner 13 Bereiche einzeln öffnen.

   WAS DIESE ANSICHT IST
   Eine priorisierte Liste des Handlungsbedarfs plus die Tagesbausteine aus
   dem Telegram-Briefing (Standort, Sonne/Mond, Wetter, Termine, Gesundheit)
   und ein Abschnitt über den Zustand der Datenquellen.

   WAS SIE NICHT IST
   - keine Kennzahlenwand,
   - kein Gesamtscore über Gesundheit, Finanzen und Technik,
   - keine Doppelung der Warnungen, die im Fachbereich ohnehin stehen —
     jede Zeile führt stattdessen per Klick dorthin.

   DATENQUELLEN (alle lesend, alle bereits vorhanden)
     GET /api/heute/umfeld                       Standort, Sonne/Mond, Wetter (neu, P2-5)
     GET /api/calendar                           Termine, 7-Tage-Fenster
     GET /api/health/alerts                      Gesundheitswarnungen mit Schweregrad
     GET /api/health?days=2                      Werte der letzten Nacht
     GET /api/fleet/vehicles?status=active       TÜV-Fristen
     GET /api/dashboard/status                   Dienste, Token, Backup
     GET /api/sharepoint/sync-status             Alter des Dokumentenindex
     GET /api/instagram/media                    Alter des Medienbestands
     GET /api/banking/accounts                   Alter der Salden
     GET /api/assets/properties                  Objekte
     GET /api/assets/properties/:code/nk-readiness?year=
     GET /api/assets/properties/:code/nk-period-obligations

   Es gibt KEINEN sammelnden Endpunkt und KEINEN neuen Datenspeicher. Fällt
   eine Quelle aus, erscheint genau ihr Block als „nicht abrufbar" — die
   übrigen bleiben nutzbar (Promise.allSettled).

   NICHT UMGESETZT, BEWUSST
   „Änderungen seit letztem Besuch" braucht eine neue Speicherung (es gibt
   weder eine Tabelle noch einen Mechanismus für Besuche oder Deltas). Nach
   Spec §5 ist das getrennt auszuweisen und vom Owner zu entscheiden; der
   Abschnitt „Offene Punkte" sagt das ausdrücklich.

   Abhängigkeiten: `esc`, `fmtDate`, `fmtDT`, `apiFetch`, `stamp`, `showTab`
   aus dem Inline-Skript in index.html; `datenstand.js` (P1-1); `zeit.js`
   (P1-5) für die Terminzeiten.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Fristen ab hier als dringend behandeln. 30 Tage reichen für einen
   TÜV-Termin; darunter wird es knapp. */
const HEUTE_FRIST_DRINGEND_TAGE = 30;
const HEUTE_FRIST_VORGEMERKT_TAGE = 90;

/* Vier Dringlichkeitsstufen. Die Reihenfolge der Liste ergibt sich aus
   (Stufe, Resttage) — also nach Wichtigkeit und Fälligkeit, nicht nach
   Bereich (Spec §5). */
const HEUTE_STUFEN = {
  1: { label: 'Kritisch',   klasse: 'hu-kritisch' },
  2: { label: 'Dringend',   klasse: 'hu-dringend' },
  3: { label: 'Offen',      klasse: 'hu-offen' },
  4: { label: 'Vorgemerkt', klasse: 'hu-vorgemerkt' },
};

/* ── Hilfsfunktionen ──────────────────────────────────────────────────────── */

/* Resttage bis zu einem Datum (YYYY-MM-DD), gerechnet in Kalendertagen
   Europe/Berlin. Negative Werte = überfällig. */
function heuteRestTage(datum) {
  if (!datum) return null;
  const heute = zeitTagInZone(new Date(), ZEIT_ZONE);
  const ziel = String(datum).slice(0, 10);
  return zeitTageDifferenz(heute, ziel);
}

/* Kompakte Tagesangabe für die Terminliste: "Di 06.10.".
   zeit.js hat nur die lange Form (zeitTagLang) — die sprengt schmal die
   Zeile. */
function heuteTagKurz(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || ''));
  if (!m) return 'Datum unklar';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const wochentag = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'short' }).format(d);
  return wochentag + ' ' + m[3] + '.' + m[2] + '.';
}

function heuteRestText(tage) {
  if (tage === null) return 'ohne Datum';
  if (tage < 0) return 'seit ' + Math.abs(tage) + (Math.abs(tage) === 1 ? ' Tag' : ' Tagen') + ' überfällig';
  if (tage === 0) return 'heute fällig';
  if (tage === 1) return 'morgen fällig';
  return 'in ' + tage + ' Tagen';
}

/* Sprung in einen Fachbereich samt Deeplink-Parametern.
   showTab() räumt die Bereichsparameter auf, wenn es selbst den
   Verlaufseintrag schreibt — deshalb wird die Adresse hier gesetzt und
   showTab() mit { verlauf: false } aufgerufen. */
function heuteSprung(tab, parameter) {
  const url = new URL(window.location.href);
  for (const p of BEREICHSPARAMETER) url.searchParams.delete(p);
  url.searchParams.set('tab', tab);
  url.searchParams.delete('token');
  for (const [k, v] of Object.entries(parameter || {})) {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  history.pushState({ tab }, '', url.pathname + (url.search || ''));
  showTab(tab, { verlauf: false });
}

/* Die Sprungziele der Handlungszeilen. Als Datenstruktur statt als
   eingebautes onclick, damit die Zeile an einer Stelle gerendert wird. */
let _heuteZiele = [];

function heuteZielKlick(index) {
  const z = _heuteZiele[index];
  if (z) heuteSprung(z.tab, z.parameter);
}

/* ── Handlungsbedarf sammeln ──────────────────────────────────────────────── */

function heutePostenGesundheit(alerts) {
  if (!Array.isArray(alerts)) return [];
  return alerts
    .filter(a => a && (a.severity === 'critical' || a.severity === 'warning'))
    .map(a => ({
      stufe: a.severity === 'critical' ? 1 : 2,
      tage: null,
      symbol: a.severity === 'critical' ? '🔴' : '⚠️',
      bereich: 'Gesundheit',
      titel: a.message || 'Gesundheitswarnung',
      zusatz: a.severity === 'critical' ? 'Kritische Abweichung' : 'Abweichung über mehrere Tage',
      ziel: { tab: 'health', parameter: {} },
      zielText: 'Gesundheit öffnen',
    }));
}

function heutePostenFahrzeuge(fahrzeuge) {
  if (!Array.isArray(fahrzeuge)) return [];
  const posten = [];
  for (const f of fahrzeuge) {
    const frist = f.tuevNextDueDate || f.tuevDate || null;
    if (!frist) {
      posten.push({
        stufe: 3, tage: null, symbol: '❔', bereich: 'Fuhrpark',
        titel: (f.name || f.vehicleCode) + ': keine TÜV-Frist erfasst',
        zusatz: 'Ohne Frist ist keine Aussage über die Fälligkeit möglich.',
        ziel: { tab: 'fleet', parameter: { fleet_code: f.vehicleCode, fleet_subtab: 'tuev' } },
        zielText: 'Fahrzeug öffnen',
      });
      continue;
    }
    const tage = heuteRestTage(frist);
    const stufe = tage === null ? 3
      : tage < 0 ? 1
      : tage <= HEUTE_FRIST_DRINGEND_TAGE ? 2
      : tage <= HEUTE_FRIST_VORGEMERKT_TAGE ? 3
      : 4;
    posten.push({
      stufe, tage,
      symbol: tage !== null && tage < 0 ? '🔴' : '🚗',
      bereich: 'Fuhrpark',
      titel: 'TÜV ' + (f.name || f.vehicleCode) + ': ' + fmtDate(frist),
      zusatz: heuteRestText(tage) + (f.plate ? ' · ' + f.plate : ''),
      ziel: { tab: 'fleet', parameter: { fleet_code: f.vehicleCode, fleet_subtab: 'tuev' } },
      zielText: 'Fahrzeug öffnen',
    });
  }
  return posten;
}

function heutePostenNebenkosten(readiness, jahr) {
  const posten = [];
  for (const r of readiness) {
    if (!r || !r.daten) continue;
    const d = r.daten;
    const blocker = Number(d.blocking_count || 0);
    if (!blocker) continue;
    posten.push({
      stufe: 3, tage: null, symbol: '🏠', bereich: 'Nebenkosten',
      titel: 'Nebenkosten ' + jahr + ' — ' + r.name + ': ' + blocker
        + (blocker === 1 ? ' blockierender Befund' : ' blockierende Befunde'),
      zusatz: 'Die Abrechnung kann erst nach Klärung berechnet werden.'
        + (d.warning_count
            ? ' Zusätzlich ' + d.warning_count + (d.warning_count === 1 ? ' Warnung.' : ' Warnungen.')
            : ''),
      /* A4: Objekt UND Jahr mitgeben — sonst landet der Sprung auf den
         Vorgabewerten des Nebenkosten-Speichers. */
      ziel: { tab: 'assets', parameter: { assets_subtab: 'nebenkosten', assets_prop: r.code, assets_year: jahr } },
      zielText: 'Nebenkosten öffnen',
    });
  }
  return posten;
}

/* ── Rendern ──────────────────────────────────────────────────────────────── */

function heuteAbschnitt(titel, inhalt, kopfZusatz) {
  return '<section class="card card-pad heute-block">'
    + '<div class="heute-kopf"><h2 class="heute-titel">' + esc(titel) + '</h2>'
    + (kopfZusatz ? '<span class="heute-kopf-zusatz">' + kopfZusatz + '</span>' : '')
    + '</div>' + inhalt + '</section>';
}

function heuteHandlungsliste(posten) {
  if (!posten.length) {
    return zustandBlock('keine_daten',
      'Aus den abgerufenen Quellen ergibt sich heute kein Handlungsbedarf. '
      + 'Das gilt nur für die unten genannten Quellen — nicht für Bereiche ohne Datengrundlage.');
  }
  posten.sort((a, b) => (a.stufe - b.stufe)
    || ((a.tage === null ? 99999 : a.tage) - (b.tage === null ? 99999 : b.tage)));

  _heuteZiele = posten.map(p => p.ziel);

  const zeile = (p, i) => {
    const stufe = HEUTE_STUFEN[p.stufe] || HEUTE_STUFEN[3];
    return '<li class="hu-zeile ' + stufe.klasse + '">'
      + '<button type="button" class="hu-knopf" onclick="heuteZielKlick(' + i + ')">'
      + '<span class="hu-symbol" aria-hidden="true">' + p.symbol + '</span>'
      + '<span class="hu-text">'
      + '<span class="hu-titel">' + esc(p.titel) + '</span>'
      + '<span class="hu-zusatz">' + esc(stufe.label + ' · ' + p.bereich + ' · ' + p.zusatz) + '</span>'
      + '</span>'
      + '<span class="hu-ziel">' + esc(p.zielText) + ' →</span>'
      + '</button></li>';
  };

  /* Fristen jenseits von 90 Tagen stehen in einem eingeklappten Block.
     Sie gehören in die Übersicht — als Daueranzeige würden sie aber die
     heute wichtigen Zeilen zuschütten (Spec §5: keine Kennzahlenwand). */
  const jetzt = [];
  const spaeter = [];
  posten.forEach((p, i) => (p.stufe >= 4 ? spaeter : jetzt).push(zeile(p, i)));

  return '<ul class="hu-liste">' + jetzt.join('') + '</ul>'
    + (spaeter.length
        ? '<details class="hu-spaeter"><summary>' + esc(spaeter.length
            + (spaeter.length === 1 ? ' weitere Frist' : ' weitere Fristen')
            + ' später als ' + HEUTE_FRIST_VORGEMERKT_TAGE + ' Tage')
          + '</summary><ul class="hu-liste">' + spaeter.join('') + '</ul></details>'
        : '');
}

function heuteUmfeldBlock(u) {
  if (!u) {
    return zustandBlock('fehler', 'Standort, Sonne/Mond und Wetter sind nicht abrufbar.');
  }
  const ort = u.ort || {};
  const a = u.astro;
  const w = u.wetter;

  let astroHtml;
  if (!a) {
    astroHtml = '<div class="heute-zeile-fehler">' + esc('Sonnen- und Mondzeiten nicht berechenbar'
      + (u.astro_fehler ? ': ' + u.astro_fehler : '.')) + '</div>';
  } else {
    const tagLaenge = a.tageslaenge_min != null
      ? Math.floor(a.tageslaenge_min / 60) + ' h ' + String(a.tageslaenge_min % 60).padStart(2, '0') + ' min'
      : null;
    const mondZeiten = [
      a.mondaufgang ? 'Aufgang ' + a.mondaufgang : null,
      a.monduntergang ? 'Untergang ' + a.monduntergang : null,
    ].filter(Boolean).join(' · ') || 'heute nicht über dem Horizont';
    astroHtml = '<div class="heute-astro">'
      + '<div class="heute-astro-zeile"><span aria-hidden="true">☀️</span> '
      + esc('Aufgang ' + (a.sonnenaufgang || '–') + ' · Untergang ' + (a.sonnenuntergang || '–')
        + (tagLaenge ? ' · Tageslänge ' + tagLaenge : '')) + '</div>'
      + '<div class="heute-astro-zeile"><span aria-hidden="true">' + a.mond_symbol + '</span> '
      + esc(a.mond_phase + ' (' + a.mond_beleuchtung + ' % beleuchtet) · ' + mondZeiten) + '</div>'
      + '</div>';
  }

  let wetterHtml;
  if (!w) {
    wetterHtml = zustandBlock('fehler', 'Wetter nicht abrufbar'
      + (u.wetter_fehler ? ': ' + u.wetter_fehler : '.') + ' Quelle: Open-Meteo.');
  } else {
    const tagName = ['Heute', 'Morgen', 'Übermorgen'];
    const tage = (w.tage || []).map((t, i) => '<div class="heute-wetter-tag">'
      + '<div class="heute-wetter-tag-kopf">' + esc(tagName[i] || fmtDate(t.datum)) + '</div>'
      + '<div class="heute-wetter-tag-wert">' + esc(
        (t.min != null && t.max != null ? t.min + '–' + t.max + ' °C' : 'keine Angabe'))
      + '</div>'
      + '<div class="heute-wetter-tag-sub">' + esc(t.text
        + (t.regen_mm != null ? ' · Regen ' + t.regen_mm.toLocaleString('de-DE') + ' mm' : '')
        + (t.wind != null ? ' · Wind ' + t.wind + ' km/h' : '')
        + (t.uv != null ? ' · UV ' + t.uv.toLocaleString('de-DE') : '')) + '</div>'
      + '</div>').join('');
    wetterHtml = '<div class="heute-wetter">'
      + '<div class="heute-wetter-jetzt">'
      + '<span class="heute-wetter-grad">' + esc(w.jetzt_grad != null ? w.jetzt_grad + ' °C' : '–') + '</span>'
      + '<span class="heute-wetter-text">' + esc(w.jetzt_text
        + (w.jetzt_wind != null ? ' · Wind ' + w.jetzt_wind + ' km/h' : '')) + '</span>'
      + '<span class="heute-wetter-sub">' + esc(
        (w.druck_hpa != null ? 'Luftdruck ' + w.druck_hpa + ' hPa (' + w.druck_trend + ')' : '')
        + (w.regen_ab ? ' · Niederschlag ab ' + w.regen_ab : '')) + '</span>'
      + '</div>'
      + '<div class="heute-wetter-tage">' + tage + '</div>'
      + '</div>';
  }

  const ortText = (ort.label || 'Standort unbekannt')
    + (ort.quelle === 'location_events' && ort.stand
        ? ' · Standortmeldung ' + fmtDT(ort.stand) + ' (' + altersText(ort.stand) + ')'
        : ' · Vorgabewert, keine Standortmeldung');

  return astroHtml
    + '<div class="heute-ort">' + esc('📍 ' + ortText) + '</div>'
    + wetterHtml;
}

function heuteTermine(events) {
  if (!Array.isArray(events)) {
    return zustandBlock('fehler', 'Der Kalender ist nicht abrufbar. Es fehlen Termine — die Liste ist nicht leer.');
  }
  if (!events.length) {
    return zustandBlock('keine_daten', 'Im Fenster der nächsten sieben Tage steht kein Termin.');
  }
  const sortiert = events.slice().sort((a, b) => {
    const za = kalenderZeitraum(a), zb = kalenderZeitraum(b);
    return String(za.tagesSchluessel || '').localeCompare(String(zb.tagesSchluessel || ''))
      || String(za.zeitText || '').localeCompare(String(zb.zeitText || ''));
  }).slice(0, 6);

  const zeilen = sortiert.map(ev => {
    const z = kalenderZeitraum(ev);
    const tag = heuteTagKurz(z.tagesSchluessel);
    const zeit = z.ganztags ? 'ganztägig' + (z.mehrtaegig ? ' ' + z.spanneText : '') : z.zeitText;
    return '<li class="heute-termin">'
      + '<span class="heute-termin-zeit">' + esc(tag + ' · ' + zeit) + '</span>'
      + '<span class="heute-termin-titel">' + esc(ev.subject || '(kein Titel)') + '</span>'
      + (z.unplausibel ? '<span class="heute-termin-warn">⚠️ Zeitangabe unplausibel</span>' : '')
      + '</li>';
  }).join('');

  return '<ul class="heute-termine">' + zeilen + '</ul>'
    + '<div class="heute-mehr"><button type="button" class="btn" onclick="heuteSprung(\'calendar\', {})">'
    + 'Kalender öffnen' + (events.length > sortiert.length
      ? ' (' + events.length + ' Termine im Fenster)' : '') + '</button></div>';
}

function heuteGesundheit(entries) {
  if (!Array.isArray(entries)) {
    return zustandBlock('fehler', 'Die Gesundheitsdaten sind nicht abrufbar.');
  }
  const heuteTag = zeitTagInZone(new Date(), ZEIT_ZONE);
  const letzterWert = (typ) => entries.find(e => e.type === typ) || null;

  const werte = [
    (() => {
      const s = letzterWert('sleep');
      if (!s) return null;
      const tag = zeitTagInZone(new Date(s.timestamp), ZEIT_ZONE);
      const stunden = Math.floor(Number(s.value));
      const minuten = Math.round((Number(s.value) - stunden) * 60);
      return {
        label: 'Schlaf letzte Nacht',
        wert: tag === heuteTag ? stunden + ' h ' + String(minuten).padStart(2, '0') + ' min' : '—',
        sub: tag === heuteTag ? 'Oura · ' + fmtDate(s.timestamp)
          : 'keine Messung für heute (letzte: ' + fmtDate(s.timestamp) + ')',
      };
    })(),
    (() => {
      const r = letzterWert('readiness');
      if (!r) return null;
      return { label: 'Readiness', wert: Number(r.value) + ' / 100',
        sub: 'Oura · ' + fmtDate(r.timestamp) };
    })(),
    (() => {
      const h = letzterWert('hrv');
      if (!h) return null;
      return { label: 'HRV', wert: Number(h.value) + ' ms', sub: 'Oura · ' + fmtDate(h.timestamp) };
    })(),
    (() => {
      const g = letzterWert('weight');
      if (!g) return null;
      return { label: 'Gewicht', wert: Number(g.value).toLocaleString('de-DE') + ' kg',
        sub: 'Withings · ' + fmtDate(g.timestamp) };
    })(),
  ].filter(Boolean);

  if (!werte.length) {
    return zustandBlock('keine_daten', 'Für die letzten zwei Tage liegt kein Messwert vor.');
  }

  return '<div class="heute-werte">' + werte.map(w => '<div class="heute-wert">'
    + '<div class="heute-wert-lbl">' + esc(w.label) + '</div>'
    + '<div class="heute-wert-val">' + esc(w.wert) + '</div>'
    + '<div class="heute-wert-sub">' + esc(w.sub) + '</div>'
    + '</div>').join('') + '</div>'
    + '<div class="heute-mehr"><button type="button" class="btn" onclick="heuteSprung(\'health\', {})">'
    + 'Gesundheit öffnen</button></div>';
}

/* A7 (Phase 3): Die Statusquelle mischt live geprüfte und gespeicherte
   Zustände. Diese Zeile trennt beides, nennt den ältesten gespeicherten
   Prüfzeitpunkt und unterscheidet Abrufzeit (wann wurde die Statusquelle
   gefragt) von Prüfzeitpunkt (wann wurde der Dienst zuletzt wirklich
   geprüft). */
function heuteQuelleSystemstatus(status) {
  if (!status) {
    return { quelle: 'Systemstatus (Core)', zustand: 'getrennt', stand: null,
      abgleich: null, standLabel: 'Abrufzeit', abgleichLabel: 'ältester Prüfzeitpunkt',
      hinweis: 'Statusquelle nicht erreichbar.' };
  }
  const dienste = status.services || [];
  const live = dienste.filter(d => d.source === 'live');
  const gespeichert = dienste.filter(d => d.source !== 'live');
  const pruefzeiten = gespeichert.map(d => d.checked_at).filter(Boolean).sort();
  const aeltester = pruefzeiten[0] || null;
  const nichtOben = dienste.filter(d => d.status !== 'up').length;

  const teile = [];
  teile.push(live.length + (live.length === 1 ? ' Dienst live geprüft' : ' Dienste live geprüft'));
  if (gespeichert.length) {
    teile.push(gespeichert.length
      + (gespeichert.length === 1 ? ' gespeicherter Zustand' : ' gespeicherte Zustände')
      + (aeltester ? ' (ältester vom ' + fmtDate(aeltester) + ')' : ''));
  }
  let satz = teile.join(', ') + '.';
  if (nichtOben) {
    satz += ' ' + nichtOben + (nichtOben === 1 ? ' Dienst' : ' Dienste')
      + ' nicht auf „läuft“.';
  }
  if (gespeichert.length) {
    satz += ' Ein gespeicherter Zustand ist nicht nachgeprüft — er sagt nur, '
      + 'was zuletzt eingetragen wurde.';
  }

  return {
    quelle: 'Systemstatus (Core)',
    /* Nicht „aktuell“, solange gespeicherte Zustände dabei sind. */
    zustand: status._stale ? 'degradiert'
      : gespeichert.length ? 'degradiert'
      : 'aktuell',
    live: false,
    stand: status.timestamp || null,
    abgleich: aeltester,
    standLabel: 'Abrufzeit',
    abgleichLabel: 'ältester Prüfzeitpunkt',
    hinweis: satz,
  };
}

/* Datenquellen mit Stand und Alter. Veraltete stehen oben — das ist der
   Baustein aus P1-1, hier über alle Bereiche zusammengezogen. */
function heuteQuellen(quellen) {
  const rang = { getrennt: 0, unbekannt: 1, veraltet: 2, degradiert: 3, aktuell: 4 };
  const bewertet = quellen.map(q => {
    const code = q.zustand || (q.live ? 'aktuell' : datenstandZustand(q.stand, q.schwelleTage));
    return { ...q, _code: code };
  }).sort((a, b) => (rang[a._code] ?? 9) - (rang[b._code] ?? 9));

  const auffaellig = bewertet.filter(q => q._code !== 'aktuell' && q._code !== 'erreichbar').length;
  const liste = '<div class="ds-liste heute-quellen">'
    + bewertet.map(datenstandBadge).join('') + '</div>';
  const zusammenfassung = auffaellig
    ? '<div class="heute-quellen-fazit">' + esc(auffaellig + ' von ' + bewertet.length
        + ' Quellen sind veraltet, unbekannt oder nicht erreichbar. Die darauf beruhenden '
        + 'Anzeigen sind entsprechend alt — das ist kein Fehler der Anzeige.') + '</div>'
    : '';
  return zusammenfassung + liste;
}

function heuteOffenePunkte(punkte) {
  return '<ul class="heute-offen">' + punkte.map(p => '<li>'
    + '<span class="heute-offen-titel">' + esc(p.titel) + '</span>'
    + '<span class="heute-offen-text">' + esc(p.text) + '</span>'
    + '</li>').join('') + '</ul>';
}

/* ── Laden ────────────────────────────────────────────────────────────────── */

async function loadHeute() {
  const c = document.getElementById('content');
  const wert = (r) => (r.status === 'fulfilled' ? r.value : null);

  const [rUmfeld, rKalender, rAlerts, rHealth, rFahrzeuge, rStatus, rSp, rInsta, rKonten, rObjekte]
    = await Promise.allSettled([
      apiFetch('/api/heute/umfeld'),
      apiFetch('/api/calendar'),
      apiFetch('/api/health/alerts'),
      apiFetch('/api/health?days=3'),
      apiFetch('/api/fleet/vehicles?status=active'),
      apiFetch('/api/dashboard/status'),
      apiFetch('/api/sharepoint/sync-status'),
      apiFetch('/api/instagram/media'),
      apiFetch('/api/banking/accounts'),
      apiFetch('/api/assets/properties'),
    ]);

  const umfeld = wert(rUmfeld);
  const kalender = wert(rKalender);
  const alerts = wert(rAlerts);
  const health = wert(rHealth);
  const fahrzeuge = wert(rFahrzeuge);
  const status = wert(rStatus);
  const spSync = wert(rSp);
  const insta = wert(rInsta);
  const konten = wert(rKonten);
  const objekte = wert(rObjekte);

  /* Nebenkosten: das letzte abgeschlossene Jahr ist das, das abgerechnet
     werden muss. Pro Objekt ein lesender Abruf. */
  const nkJahr = new Date().getFullYear() - 1;
  let readiness = [];
  let pflichtenGesamt = null;
  if (Array.isArray(objekte) && objekte.length) {
    const ergebnisse = await Promise.allSettled(objekte.map(o =>
      apiFetch('/api/assets/properties/' + encodeURIComponent(o.code) + '/nk-readiness?year=' + nkJahr)
        .then(d => ({ code: o.code, name: o.name || o.code, daten: d }))));
    readiness = ergebnisse.map(r => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean);

    const pflichten = await Promise.allSettled(objekte.map(o =>
      apiFetch('/api/assets/properties/' + encodeURIComponent(o.code) + '/nk-period-obligations')));
    const gelungen = pflichten.filter(p => p.status === 'fulfilled');
    pflichtenGesamt = gelungen.length
      ? gelungen.reduce((n, p) => n + (Array.isArray(p.value) ? p.value.length : 0), 0)
      : null;
  }

  /* ── Handlungsbedarf ── */
  const posten = [
    ...heutePostenGesundheit(alerts),
    ...heutePostenFahrzeuge(fahrzeuge),
    ...heutePostenNebenkosten(readiness, nkJahr),
  ];

  /* ── Datenquellen ── */
  const letzterKontoAbgleich = Array.isArray(konten)
    ? (konten.map(k => k.lastSyncAt).filter(Boolean).sort().slice(-1)[0] || null)
    : null;
  const letzteHealthMessung = Array.isArray(health) && health.length ? health[0].timestamp : null;

  const quellen = [
    { quelle: 'Kalender (Microsoft 365)',
      zustand: Array.isArray(kalender) ? 'aktuell' : 'getrennt',
      live: Array.isArray(kalender), stand: new Date().toISOString(),
      hinweis: Array.isArray(kalender)
        ? kalender.length + (kalender.length === 1 ? ' Termin' : ' Termine') + ' im 7-Tage-Fenster.'
        : 'Abruf fehlgeschlagen.' },
    { quelle: 'Gesundheit (Oura, Withings)', stand: letzteHealthMessung, abgleich: letzteHealthMessung,
      schwelleTage: 2,
      zustand: Array.isArray(health) ? undefined : 'getrennt',
      hinweis: 'Automatischer Abgleich ist abgeschaltet (Owner-Entscheidung Nr. 1).' },
    { quelle: 'Bankkonten (FinTS)', stand: letzterKontoAbgleich, abgleich: letzterKontoAbgleich,
      zustand: Array.isArray(konten) ? undefined : 'getrennt',
      /* A2 (Phase 3): Der Owner hielt den Verbindungsaufbau vom 05.10.2026 für
         einen Abgleich. Die Zeile sagt jetzt, welcher Zeitpunkt hier steht. */
      hinweis: 'Stand des letzten ABGLEICHS, nicht des letzten Verbindungsaufbaus. '
        + 'Ein Abgleich wird nicht aus dem Dashboard ausgelöst; der Bereich Banking '
        + 'nennt beide Zeitpunkte.' },
    { quelle: 'SharePoint-Dokumentenindex',
      stand: spSync ? (spSync.last_success_at || spSync.last_run?.finished_at || null) : null,
      abgleich: spSync ? (spSync.last_success_at || null) : null,
      zustand: spSync ? undefined : 'getrennt',
      hinweis: spSync && spSync.active_files != null
        ? Number(spSync.active_files).toLocaleString('de-DE') + ' Dateien im Index.' : undefined },
    { quelle: 'Instagram-Medien', stand: insta ? (insta.datenstand || insta.fetched_at || null) : null,
      abgleich: insta ? (insta.datenstand || insta.fetched_at || null) : null,
      zustand: insta ? undefined : 'getrennt',
      hinweis: 'Abgleich nur manuell per /instasync im Telegram-Bot.' },
    /* A7 (Phase 3): Hier stand „Live-Abruf · 6 Dienste laufen“. Von den sechs
       Diensten werden aber nur zwei live geprüft (Postgres, IB Gateway); für
       Core, Dashboard, Trading und n8n liefert die Statusquelle gespeicherte
       Zustände aus Mai und Juli. Ein gespeicherter Zustand ist keine Aussage
       über jetzt und darf nicht grün erscheinen. */
    heuteQuelleSystemstatus(status),
    { quelle: 'Fuhrpark (Fristen)', live: Array.isArray(fahrzeuge),
      zustand: Array.isArray(fahrzeuge) ? 'aktuell' : 'getrennt',
      stand: new Date().toISOString(),
      hinweis: Array.isArray(fahrzeuge) ? fahrzeuge.length + ' aktive Fahrzeuge.' : 'Abruf fehlgeschlagen.' },
    { quelle: 'Standort und Wetter', live: !!(umfeld && umfeld.wetter),
      zustand: umfeld ? (umfeld.wetter ? 'aktuell' : 'degradiert') : 'getrennt',
      stand: umfeld && umfeld.wetter ? umfeld.wetter.abgerufen : null,
      hinweis: umfeld && umfeld.wetter ? 'Open-Meteo, zwischengespeichert für 10 Minuten.'
        : 'Wetterabruf fehlgeschlagen.' },
  ];

  /* ── Offene Punkte: ausdrücklich benannt, nicht als Erfolg verbucht ── */
  const offen = [
    { titel: '§556-Pflichten',
      text: pflichtenGesamt === null
        ? 'Nicht abrufbar — der Stand ist unbekannt.'
        : pflichtenGesamt === 0
          ? 'Nicht eingerichtet. Es ist keine einzige Pflicht erfasst — das ist kein „keine Pflichten", '
            + 'sondern eine nicht in Betrieb genommene Funktion.'
          : pflichtenGesamt + ' Pflichten erfasst.' },
    { titel: 'Änderungen seit dem letzten Besuch',
      text: 'Nicht umgesetzt. Es gibt weder eine Tabelle noch einen Mechanismus, der Besuche '
        + 'festhält; jede Umsetzung braucht eine neue Speicherung. Entscheidung liegt beim Owner.' },
    { titel: 'Automatischer Abgleich',
      text: 'Abgeschaltet (Owner-Entscheidung Nr. 1). Banking, SharePoint und Instagram werden '
        + 'nicht selbsttätig aktualisiert; das Alter der Daten steht oben.' },
    { titel: 'Offene Vorgänge',
      text: status && status.workflows
        ? 'Die Vorgangstabelle enthält ' + (status.workflows.pending || 0)
          + ' Einträge. Das ist keine Aussage über den Zustand von n8n — siehe Bereich Agents.'
        : 'Nicht abrufbar.' },
  ];

  const jetzt = new Date();
  const datumLang = new Intl.DateTimeFormat('de-DE', {
    timeZone: ZEIT_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(jetzt);

  c.innerHTML =
    '<div class="heute-datum"><span aria-hidden="true">📅</span> ' + esc(datumLang)
      + ' · ' + esc(zeitUhr(jetzt)) + ' Uhr</div>'
    + heuteAbschnitt('Handlungsbedarf', heuteHandlungsliste(posten),
        posten.length
          ? esc(posten.filter(p => p.stufe < 4).length + ' offen · '
              + posten.filter(p => p.stufe >= 4).length + ' vorgemerkt')
          : '')
    + heuteAbschnitt('Tag und Wetter', heuteUmfeldBlock(umfeld))
    + heuteAbschnitt('Nächste Termine', heuteTermine(kalender))
    + heuteAbschnitt('Gesundheit', heuteGesundheit(health))
    + heuteAbschnitt('Datenquellen', heuteQuellen(quellen))
    + heuteAbschnitt('Offene Punkte', heuteOffenePunkte(offen));

  stamp();
  /* Die Datenstand-Leiste bleibt in dieser Ansicht leer: der Abschnitt
     „Datenquellen" sagt dasselbe vollständiger. Zwei Darstellungen derselben
     Angabe auf einer Seite sind Rauschen (vgl. P2-3, Kalender). */
  setDatenstand([]);
}
