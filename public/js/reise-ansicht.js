/* ── Reisen-Tab: Reisekarte im neuen Aufbau ────────────────────────────────
   Owner-Auftrag 01.11.2026: in fünf Sekunden sehen, was als Nächstes ansteht;
   Details erst auf Klick. Reihenfolge verbindlich:
     1 Kopfzeile (Titel, Zeitraum, Countdown, höchstens drei Warnchips)
     2 Als Nächstes (drei offene Fristen, „Alle Fristen" einklappbar)
     3 Reiseverlauf als Tagesleiste
     4 Buchungen als kompakte Karten
     5 Dokumente, Einreise, Kontakte, Miles & More, Offen, Flugkette — je eine
       eingeklappte Zeile mit Zähler
   Mobil einspaltig in dieser Reihenfolge, ab 1024 px zwei Spalten
   (css/reise.css).

   Die Ableitungen stehen in reise-ableitung.js, die Inhalte der Abschnitte in
   5 sind die bisherigen Blöcke aus index.html (reiseDokumente, reiseFluege …)
   — sie werden nur eingeklappt, nicht neu gebaut.

   Gilt nur für Reisen mit Reiseblock (Import des Reiseassistenten). Im
   Dashboard angelegte Reisen behalten die bisherige Karte. */

/* Auf-/Zu-Zustand je Abschnitt, per Reise-ID im Browser gemerkt. Der Zugriff
   auf localStorage kann werfen (privates Fenster, gesperrte Website-Daten) —
   dann ist einfach alles zu, wie beim ersten Aufruf. */
const REISE_KLAPP_PRAEFIX = 'reise-klapp:';

function reiseKlappGemerkt(schluessel) {
  try { return localStorage.getItem(REISE_KLAPP_PRAEFIX + schluessel) === '1'; } catch { return false; }
}

function reiseKlappMerken(schluessel, offen) {
  try {
    if (offen) localStorage.setItem(REISE_KLAPP_PRAEFIX + schluessel, '1');
    else localStorage.removeItem(REISE_KLAPP_PRAEFIX + schluessel);
  } catch { /* Merken ist Komfort, kein Fehlerfall */ }
}

/* „toggle" steigt nicht auf; deshalb in der Einfangphase am Dokument. */
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d && d.matches && d.matches('details[data-merken]')) reiseKlappMerken(d.dataset.merken, d.open);
}, true);

/* Ein einklappbarer Abschnitt: eine Zeile mit Titel und Zähler. Ohne Inhalt
   entfällt der Abschnitt ganz. */
function reiseKlapp(reiseId, schluessel, titel, zaehler, inhalt) {
  if (!inhalt) return '';
  const merken = `${reiseId}:${schluessel}`;
  return `<details class="reise-klapp" data-merken="${esc(merken)}"${reiseKlappGemerkt(merken) ? ' open' : ''}>
    <summary><span class="reise-klapp-titel">${titel}</span>${zaehler != null ? `<span class="reise-zaehler">${esc(zaehler)}</span>` : ''}</summary>
    <div class="reise-klapp-inhalt">${inhalt}</div></details>`;
}

function reiseChip(ch) {
  return `<span class="badge ${REISE_TON[ch.ton] || 'badge-muted'}">${esc(ch.text)}</span>`;
}

/* §1 Kopfzeile */
function reiseKopfHtml(t, reise, heute, badge, knoepfe) {
  const zeitraum = reiseZeitraumText(t.start_date, t.end_date);
  const countdown = reiseCountdown(t.start_date, t.end_date, heute);
  const { sichtbar, rest } = reiseChipAuswahl(reise.chips);
  const weitere = rest.length
    ? reiseKlapp(t.id, 'hinweise', 'Erledigt &amp; Hinweise', rest.length,
      `<div class="reise-chips">${rest.map(reiseChip).join('')}</div>`)
    : '';
  return `<div class="reise-kopf">
    <h3 class="reise-titel">${esc(t.name)} ${badge}</h3>
    <div class="reise-zeitraum">\u{1F4C5} ${esc(zeitraum)}${countdown.text
      ? ` · <span class="reise-countdown ${countdown.art}">${esc(countdown.text)}</span>` : ''}</div>
    ${t.destination ? `<div class="reise-ziel">\u{1F4CD} ${esc(t.destination)}${t.country_code ? ` (${esc(t.country_code)})` : ''}</div>` : ''}
    ${sichtbar.length ? `<div class="reise-chips">${sichtbar.map(reiseChip).join('')}</div>` : ''}
    ${weitere}
    <div class="reise-knoepfe">${knoepfe}</div>
  </div>`;
}

/* §2 Als Nächstes */
function reiseNaechstesHtml(t, reise, heute) {
  const fristen = reise.fristen || [];
  const naechste = reiseNaechsteFristen(fristen, heute, 3);
  const zeilen = naechste.map(f => {
    const kopf = `<span class="naechst-tag">${esc(reiseTagKurz(f.faellig))}</span>
      <span class="naechst-titel">${esc(f.titel)}</span>
      <span class="naechst-rest">${esc(f.rest)}</span>`;
    return f.notiz
      ? `<details class="naechst ${f.ton}"><summary>${kopf}</summary><div class="naechst-notiz">${esc(f.notiz)}</div></details>`
      : `<div class="naechst ${f.ton} ohne-notiz">${kopf}</div>`;
  }).join('');
  const alle = fristen.length
    ? reiseKlapp(t.id, 'fristen', 'Alle Fristen', fristen.length, reiseFristen(reise, heute))
    : '';
  if (!zeilen && !alle) return '';
  return `<section class="reise-block"><h4 class="reise-h">⏰ Als Nächstes</h4>
    ${zeilen || '<div class="reise-leer">Keine offene Frist.</div>'}${alle}</section>`;
}

/* §3 Reiseverlauf */
function reiseVerlaufHtml(t, reise, heute) {
  const { zeilen } = reiseTagesleiste(reise, t.start_date, t.end_date, heute);
  if (!zeilen.length) return '';
  const eintraege = zeilen.map(z => {
    const ort = z.ort
      ? `<div class="tl-ort${z.fortgeschrieben ? ' fortgeschrieben' : ''}">${esc(z.ort)}${z.fortgeschrieben ? ' <span>(fortgeschrieben)</span>' : ''}</div>`
      : '';
    const fluege = z.fluege.map(f => `<div class="tl-zeile">✈️ ${esc(f.text)}</div>`).join('');
    const hotel = (z.hotels || []).map(h => {
      const was = h.art === 'checkin' ? 'Check-in ' : h.art === 'checkout' ? 'Check-out ' : '';
      return `<div class="tl-zeile">\u{1F3E8} ${esc(was)}${esc(h.label)}${h.zeit ? ' · ' + esc(h.zeit) : ''}</div>`;
    }).join('');
    const termine = z.termine.map(tm => {
      const zeit = [tm.zeit_von && 'ab ' + tm.zeit_von, tm.zeit_bis && 'bis ' + tm.zeit_bis].filter(Boolean).join(', ');
      return `<div class="tl-zeile${tm.quelle === 'frist' ? ' tl-frist' : ''}">\u{1F4CC} ${esc(tm.label)}${zeit ? ' · ' + esc(zeit) : ''}</div>`;
    }).join('');
    return `<li class="tl-tag${z.heute ? ' heute' : ''}${z.ruhig ? ' ruhig' : ''}">
      <div class="tl-datum">${esc(reiseZeilenDatum(z))}${z.heute ? ' <span class="badge badge-blue">heute</span>' : ''}</div>
      <div class="tl-inhalt">${ort}${fluege}${hotel}${termine}</div></li>`;
  }).join('');
  return `<section class="reise-block"><h4 class="reise-h">\u{1F5FA}️ Reiseverlauf</h4>
    <ol class="tl">${eintraege}</ol></section>`;
}

/* Ein Statuswort der Buchung. In v11 steht bei der SWISS-Buchung „Senator"
   im Feld status — das ist der Vielfliegerstatus, kein Buchungsstand. Nur
   bekannte Buchungszustände erscheinen deshalb als Abzeichen; alles andere
   steht beim Aufklappen unter „Vielflieger". */
const REISE_BUCHUNGSSTAND = /^(bestätigt|bezahlt|gebucht|ausgestellt|reserviert|offen|storniert|warteliste)/i;

/* §4 Buchungen */
function reiseBuchungenHtml(reise) {
  const buchungen = reise.buchungen || [];
  if (!buchungen.length) return '';
  const karten = buchungen.map(b => {
    const stand = b.status && REISE_BUCHUNGSSTAND.test(b.status) ? b.status : '';
    const vielflieger = [b.vielflieger, stand ? '' : b.status].filter(Boolean).join(' · ');
    const tonStand = /storniert|offen|warteliste/i.test(stand) ? 'badge-yellow' : 'badge-green';
    const kopie = (wert, name) => `<button class="btn btn-primary kpi-kopie" data-kopie="${esc(wert)}"
      data-kopie-name="${esc(name)}" aria-label="${esc(name)} kopieren" title="${esc(name)} kopieren">\u{1F4CB}</button>`;
    const kopfZeile2 = [
      b.code ? `<span class="buchung-code">${esc(b.code)}</span>${kopie(b.code, 'Buchungscode')}` : '',
      b.ausgestellt ? `<span>${esc(fmtDate(b.ausgestellt))}</span>` : '',
      b.preis != null ? `<span class="buchung-preis">${esc(reiseBetrag(b.preis, b.waehrung))}</span>` : '',
    ].filter(Boolean).join('<span class="buchung-trenner">·</span>');
    const details = [
      b.tarif && `<div class="dok-zeile"><b>Tarif:</b> ${esc(b.tarif)}</div>`,
      b.ticket && `<div class="dok-zeile"><b>Ticket:</b> ${esc(b.ticket)} ${kopie(b.ticket, 'Ticketnummer')}</div>`,
      vielflieger && `<div class="dok-zeile"><b>Vielflieger:</b> ${esc(vielflieger)}</div>`,
      b.ausgestellt_ueber && `<div class="dok-zeile"><b>Ausgestellt über:</b> ${esc(b.ausgestellt_ueber)}</div>`,
      b.notiz && `<div class="dok-zeile">${esc(b.notiz)}</div>`,
      /* Nur http(s): esc() hält eine javascript:-Adresse nicht auf (Review 02.11.2026) */
      /^https?:\/\//i.test(b.verwalten_url || '') && `<a class="btn btn-primary dok-knopf" href="${esc(b.verwalten_url)}" target="_blank" rel="noopener">\u{1F517} Buchung verwalten</a>`,
    ].filter(Boolean).join('');
    return `<details class="buchung">
      <summary>
        <div class="buchung-zeile1"><span class="buchung-anbieter" title="${esc(b.anbieter || '')}">${esc(b.anbieter || 'Buchung')}</span>
          ${stand ? `<span class="badge ${tonStand}">${esc(stand)}</span>` : ''}</div>
        ${kopfZeile2 ? `<div class="buchung-zeile2">${kopfZeile2}</div>` : ''}
      </summary>
      ${details ? `<div class="buchung-details">${details}</div>` : ''}
    </details>`;
  }).join('');
  return `<section class="reise-block"><h4 class="reise-h">\u{1F3AB} Buchungen <span class="reise-zaehler">${buchungen.length}</span></h4>
    <div class="buchungen">${karten}</div></section>`;
}

/* Gesamte Karte. `teile` bringt die Stücke mit, die renderTripCard in
   index.html ohnehin baut: Bild, Statusabzeichen, Knöpfe, alte Segmentliste,
   verknüpfte Dokumente und die Angaben aus der Dashboard-Reise. */
function reiseKarteHtml(t, reise, teile) {
  const heute = teile.heute;
  const dokZahl = (reise.dokumente || []).length + (teile.weitereDokumente || 0);
  const dokInhalt = [reiseDokumente(reise, heute), teile.docsSection, teile.linksSection].filter(Boolean).join('');
  const abschnitte = [
    reiseKlapp(t.id, 'dokumente', '\u{1F6C2} Dokumente', dokZahl, dokInhalt),
    reiseKlapp(t.id, 'einreise', '\u{1F6C2} Einreise', (reise.einreise || []).length, reiseEinreise(reise)),
    reiseKlapp(t.id, 'kontakte', '☎️ Kontakte', (reise.kontakte || []).length, reiseKontakte(reise)),
    reiseKlapp(t.id, 'meilen', '✈️ Miles &amp; More', reise.meilen ? (reise.meilen.segmente || []).length : null, reiseMeilen(reise)),
    reiseKlapp(t.id, 'offen', '\u{1F6A7} Offen', (reise.offen || []).length, reiseOffen(reise)),
    reiseKlapp(t.id, 'flugkette', '\u{1F6EB} Flugkette mit Umstiegen', (reise.fluege || []).length, reiseFluege(t, reise)),
    reiseKlapp(t.id, 'segmente', 'Segmente', (t.segments || []).length, teile.segs),
  ].join('');
  return `<div class="trip-card reise-neu" id="tc-${esc(t.id)}">
    ${teile.bild}
    <div class="reise-raster">
      ${reiseKopfHtml(t, reise, heute, teile.badge, teile.knoepfe)}
      <div class="reise-links">${reiseNaechstesHtml(t, reise, heute)}${reiseVerlaufHtml(t, reise, heute)}</div>
      <div class="reise-rechts">${reiseBuchungenHtml(reise)}
        <section class="reise-block reise-abschnitte">${abschnitte}</section>
        ${reiseFuss(reise)}${teile.metaText ? `<div class="reise-fuss">${teile.metaText}</div>` : ''}
      </div>
    </div>
  </div>`;
}
