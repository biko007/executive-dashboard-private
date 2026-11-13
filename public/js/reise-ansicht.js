/* ── Reisen-Tab: Reisekarte im neuen Aufbau ────────────────────────────────
   Owner-Auftrag 01.11.2026: in fünf Sekunden sehen, was als Nächstes ansteht;
   Details erst auf Klick. CP2-0 (13.11.2026, „fast überfrachtet, doppelt"):
   entlastet, nichts geht verloren — alles bleibt aufklappbar. Reihenfolge:
     1 Kopf (Titel, Status „Aktiv" + „{n} offen", Zeitraum, „Tag 6 von 19 ·
       heute Victoria", Bearbeiten + Menü „…")
     2 Als Nächstes (höchstens drei kommende Fristen, „{n} überfällig ▸",
       „Alle Fristen" gegliedert in Überfällig / Kommend / Vergangen / Erledigt)
     3 Reiseverlauf (vergangene Tage zu einer Zeile gefaltet, heute markiert)
     4 Buchungen als Listenzeilen, Details auf Klick
     5 Dokumente, Einreise, Kontakte, Miles & More, Offen, Flugkette — je eine
       eingeklappte Zeile mit Zähler
     6 Erledigt & Hinweise (alle Chips der Reisedatei), eingeklappt
   Mobil einspaltig in dieser Reihenfolge, ab 1024 px zwei Spalten 7 : 5
   (css/reise.css). Keine Emojis: Icons aus dem Lucide-Sprite (reiseIcon).

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

/* Icon aus dem Sprite als HTML (für die Zeichenketten-Bausteine). */
function reiseIcon(name, klasse) {
  return `<svg class="ic ${klasse || 'ic-16'}" aria-hidden="true"><use href="/dashboard/vendor/icons.svg#${name}"></use></svg>`;
}

/* Aktionsmenü „…": schließt bei Klick außerhalb und mit Esc (wie „Mehr" in
   der Hauptnavigation); ein gewählter Eintrag schließt es ebenfalls. */
document.addEventListener('click', e => {
  document.querySelectorAll('details.reise-mehr[open]').forEach(m => {
    if (!m.contains(e.target) || e.target.closest('.reise-mehr-eintrag')) m.open = false;
  });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('details.reise-mehr[open]').forEach(m => {
    m.open = false;
    const s = m.querySelector('summary');
    if (s) s.focus();
  });
});

/* §1 Kopf. `thumb` ist das 64-px-Vorschaubild (CP1-5). Die Ortezeile
   (t.destination) entfällt — sie wiederholt den Titel; die Warnchips
   entfallen — sie wiederholen „Als Nächstes" und stehen unter „Erledigt &
   Hinweise". */
function reiseKopfHtml(t, reise, heute, badge, thumb, offen) {
  const zeitraum = reiseZeitraumText(t.start_date, t.end_date);
  const countdown = reiseCountdown(t.start_date, t.end_date, heute);
  const station = countdown.art === 'waehrend'
    ? reiseAktuelleStation(reiseTagesleiste(reise, t.start_date, t.end_date, heute).zeilen, heute) : '';
  const tagZeile = countdown.text
    ? `<div class="reise-tagzeile"><span class="reise-countdown ${countdown.art}">${esc(countdown.text)}</span>${station ? ` · heute ${esc(station)}` : ''}</div>`
    : '';
  const offenChip = countdown.art === 'nachher' ? ''
    : `<span class="chip ${offen ? 'chip-warn' : 'chip-ok'} reise-offen-chip"><span>${offen ? esc(offen) + ' offen' : 'nichts offen'}</span></span>`;
  const id = esc(t.id);
  return `<div class="reise-kopf">
    <div class="reise-kopf-zeile">${thumb || ''}<div class="reise-kopf-text">
    <h3 class="reise-titel">${esc(t.name)}</h3>
    <div class="reise-zeitraum">${reiseIcon('calendar')}<span>${esc(zeitraum)}</span></div>
    ${tagZeile}
    </div></div>
    <div class="reise-aktionszeile"><div class="reise-status">${badge}${offenChip}</div>
    <div class="reise-knoepfe">
      <button class="btn btn-primary" onclick="editTrip('${id}')">${reiseIcon('pencil')}Bearbeiten</button>
      <details class="nav-mehr reise-mehr">
        <summary class="btn btn-ghost" aria-label="Weitere Aktionen" title="Weitere Aktionen">${reiseIcon('ellipsis', 'ic-18')}</summary>
        <div class="nav-mehr-liste card reise-mehr-liste">
          <button type="button" class="nav-mehr-eintrag reise-mehr-eintrag" onclick="syncAllSegCal('${id}')" title="Alle Segmente mit Kalender synchronisieren">${reiseIcon('refresh-cw')}<span>Mit Kalender abgleichen</span></button>
          <button type="button" class="nav-mehr-eintrag reise-mehr-eintrag" onclick="linkDocModal('trip','${id}','loadTripsRefresh')" title="Dokument mit der Reise verknüpfen">${reiseIcon('paperclip')}<span>Verknüpfen</span></button>
          <button type="button" class="nav-mehr-eintrag reise-mehr-eintrag btn-danger" onclick="deleteTrip('${id}')">${reiseIcon('trash-2')}<span>Löschen</span></button>
        </div>
      </details>
    </div></div>
  </div>`;
}

/* Eine Fristzeile für „Als Nächstes" (mit Notiz zum Aufklappen). */
function reiseNaechstZeile(f) {
  const kopf = `<span class="naechst-tag">${esc(reiseTagKurz(f.faellig))}</span>
      <span class="naechst-titel">${esc(f.titel)}</span>
      <span class="naechst-rest">${esc(f.rest)}</span>`;
  return f.notiz
    ? `<details class="naechst ${f.ton}"><summary>${kopf}</summary><div class="naechst-notiz">${esc(f.notiz)}</div></details>`
    : `<div class="naechst ${f.ton} ohne-notiz">${kopf}</div>`;
}

/* „Alle Fristen" gegliedert. Je Frist Datum, Titel, Notiz und Lage — wie die
   bisherige Fristenliste, nur nach Einstufung getrennt. */
function reiseFristenGegliedertHtml(g) {
  const gruppe = (titel, liste, klasse) => liste.length ? `<div class="frist-gruppe ${klasse}">
      <div class="frist-gruppe-titel">${esc(titel)} <span class="reise-zaehler">${liste.length}</span></div>
      ${liste.map(f => `<div class="frist ${f.einstufung === 'ueberfaellig' ? 'faellig' : f.einstufung === 'kommend' && f.ton === 'gelb' ? 'nah' : f.einstufung === 'kommend' ? '' : 'erledigt'}">
        <span class="frist-tag">${esc(reiseTagKurz(f.faellig) || '–')}</span>
        <span class="frist-text">${esc(f.titel)}${f.notiz ? ` <span class="frist-notiz">— ${esc(f.notiz)}</span>` : ''}</span>
        <span class="frist-rest">${esc(f.rest)}</span></div>`).join('')}</div>` : '';
  return gruppe('Überfällig', g.ueberfaellig, 'ueberfaellig') + gruppe('Kommend', g.kommend, 'kommend')
    + gruppe('Vergangen', g.vergangen, 'vergangen') + gruppe('Erledigt', g.erledigt, 'erledigt');
}

/* §2 Als Nächstes: höchstens drei kommende Fristen; überfällige mit Bezug in
   der Zukunft als eine aufklappbare Zeile; vergangene nur unter „Alle Fristen". */
function reiseNaechstesHtml(t, reise, heute, g) {
  const kommend = g.kommend.slice(0, 3).map(reiseNaechstZeile).join('');
  const ueber = g.ueberfaellig.length
    ? `<details class="reise-ueberfaellig" data-merken="${esc(t.id)}:ueberfaellig"${reiseKlappGemerkt(t.id + ':ueberfaellig') ? ' open' : ''}>
        <summary><span class="ueberfaellig-text">${esc(g.ueberfaellig.length)} überfällig</span></summary>
        <div class="reise-ueberfaellig-liste">${g.ueberfaellig.map(reiseNaechstZeile).join('')}</div></details>`
    : '';
  const alleZahl = g.ueberfaellig.length + g.kommend.length + g.vergangen.length;
  const alle = (reise.fristen || []).length
    ? reiseKlapp(t.id, 'fristen', 'Alle Fristen', alleZahl, reiseFristenGegliedertHtml(g))
    : '';
  if (!kommend && !ueber && !alle) return '';
  return `<section class="reise-block reise-naechst"><h4 class="reise-h">${reiseIcon('clock')}Als Nächstes</h4>
    <div class="reise-naechst-kommend">${kommend || '<div class="reise-leer">Keine kommende Frist.</div>'}</div>${ueber}${alle}</section>`;
}

/* Eine Verlaufszeile (Inhalt wie bisher, Icons statt Emojis). */
function reiseVerlaufZeile(z) {
  const ort = z.ort
    ? `<div class="tl-ort${z.fortgeschrieben ? ' fortgeschrieben' : ''}">${esc(z.ort)}${z.fortgeschrieben ? ' <span>(fortgeschrieben)</span>' : ''}</div>`
    : '';
  const fluege = z.fluege.map(f => `<div class="tl-zeile">${reiseIcon('plane', 'ic-14')}${esc(f.text)}</div>`).join('');
  const hotel = (z.hotels || []).map(h => {
    const was = h.art === 'checkin' ? 'Check-in ' : h.art === 'checkout' ? 'Check-out ' : '';
    return `<div class="tl-zeile">${reiseIcon('bed', 'ic-14')}${esc(was)}${esc(h.label)}${h.zeit ? ' · ' + esc(h.zeit) : ''}</div>`;
  }).join('');
  const termine = z.termine.map(tm => {
    const zeit = [tm.zeit_von && 'ab ' + tm.zeit_von, tm.zeit_bis && 'bis ' + tm.zeit_bis].filter(Boolean).join(', ');
    return `<div class="tl-zeile${tm.quelle === 'frist' ? ' tl-frist' : ''}">${reiseIcon(tm.quelle === 'frist' ? 'clock' : 'ticket', 'ic-14')}${esc(tm.label)}${zeit ? ' · ' + esc(zeit) : ''}</div>`;
  }).join('');
  return `<li class="tl-tag${z.heute ? ' heute' : ''}${z.ruhig ? ' ruhig' : ''}">
      <div class="tl-datum">${esc(reiseZeilenDatum(z))}${z.heute ? '<span class="tl-heute">heute</span>' : ''}</div>
      <div class="tl-inhalt">${ort}${fluege}${hotel}${termine}</div></li>`;
}

/* §3 Reiseverlauf: während der Reise sind die vergangenen Tage zu einer
   Zeile gefaltet; heute und die kommenden Tage stehen offen. */
function reiseVerlaufHtml(t, reise, heute) {
  const { zeilen } = reiseTagesleiste(reise, t.start_date, t.end_date, heute);
  if (!zeilen.length) return '';
  const aktiv = t.start_date <= heute && heute <= t.end_date;
  const f = aktiv ? reiseVerlaufFalten(zeilen, heute) : { vergangen: [], rest: zeilen, text: '' };
  const gefaltet = f.vergangen.length
    ? `<details class="tl-vergangen" data-merken="${esc(t.id)}:verlauf-vergangen"${reiseKlappGemerkt(t.id + ':verlauf-vergangen') ? ' open' : ''}>
        <summary><span>${esc(f.text)}</span></summary><ol class="tl">${f.vergangen.map(reiseVerlaufZeile).join('')}</ol></details>`
    : '';
  return `<section class="reise-block"><h4 class="reise-h">${reiseIcon('map')}Reiseverlauf</h4>
    ${gefaltet}<ol class="tl">${f.rest.map(reiseVerlaufZeile).join('')}</ol></section>`;
}

/* Ein Statuswort der Buchung. In v11 steht bei der SWISS-Buchung „Senator"
   im Feld status — das ist der Vielfliegerstatus, kein Buchungsstand. Nur
   bekannte Buchungszustände gelten als Stand; alles andere steht beim
   Aufklappen unter „Vielflieger". */
const REISE_BUCHUNGSSTAND = /^(bestätigt|bezahlt|gebucht|ausgestellt|reserviert|offen|storniert|warteliste|vorschlag)/i;
const REISE_ART_ICON = { flug: 'plane', hotel: 'bed', termin: 'ticket', sonstiges: 'file-text' };
const REISE_ART_NAME = { flug: 'Flug', hotel: 'Hotel', termin: 'Termin', sonstiges: 'Sonstiges' };

/* §4 Buchungen als Listenzeilen. Zeile 1: Anbieter (gekürzt) und Betrag;
   Zeile 2: Code · Datum · Art. Ein Statuschip nur bei Abweichung vom
   Normalfall (reiseBuchungStatusChip). Klick öffnet die bisherigen Details. */
function reiseBuchungenHtml(t, reise) {
  const buchungen = reise.buchungen || [];
  if (!buchungen.length) return '';
  const zeilen = buchungen.map(b => {
    const stand = b.status && REISE_BUCHUNGSSTAND.test(b.status) ? b.status : '';
    const vielflieger = [b.vielflieger, stand ? '' : b.status].filter(Boolean).join(' · ');
    const chip = reiseBuchungStatusChip(b);
    const art = reiseBuchungArt(b, t.start_date, t.end_date);
    const datum = reiseBuchungDatum(b, t.start_date, t.end_date);
    const kopie = (wert, name) => `<button class="btn btn-ghost kpi-kopie" data-kopie="${esc(wert)}"
      data-kopie-name="${esc(name)}" aria-label="${esc(name)} kopieren" title="${esc(name)} kopieren">${reiseIcon('clipboard-copy')}</button>`;
    const zeile2 = [
      b.code ? `<span class="buchung-code">${esc(b.code)}</span>` : '',
      datum ? `<span>${esc(datum)}</span>` : '',
      `<span class="buchung-art" role="img" aria-label="${esc(REISE_ART_NAME[art])}" title="${esc(REISE_ART_NAME[art])}">${reiseIcon(REISE_ART_ICON[art], 'ic-14')}</span>`,
    ].filter(Boolean).join('<span class="buchung-trenner">·</span>');
    const details = [
      b.code && `<div class="dok-zeile"><b>Buchungscode:</b> <span class="buchung-code">${esc(b.code)}</span> ${kopie(b.code, 'Buchungscode')}</div>`,
      stand && `<div class="dok-zeile"><b>Stand:</b> ${esc(stand)}</div>`,
      b.ausgestellt && `<div class="dok-zeile"><b>Ausgestellt:</b> ${esc(fmtDate(b.ausgestellt))}</div>`,
      b.tarif && `<div class="dok-zeile"><b>Tarif:</b> ${esc(b.tarif)}</div>`,
      b.ticket && `<div class="dok-zeile"><b>Ticket:</b> ${esc(b.ticket)} ${kopie(b.ticket, 'Ticketnummer')}</div>`,
      vielflieger && `<div class="dok-zeile"><b>Vielflieger:</b> ${esc(vielflieger)}</div>`,
      b.ausgestellt_ueber && `<div class="dok-zeile"><b>Ausgestellt über:</b> ${esc(b.ausgestellt_ueber)}</div>`,
      b.notiz && `<div class="dok-zeile">${esc(b.notiz)}</div>`,
      /* Nur http(s): esc() hält eine javascript:-Adresse nicht auf (Review 02.11.2026) */
      /^https?:\/\//i.test(b.verwalten_url || '') && `<a class="btn btn-ghost dok-knopf" href="${esc(b.verwalten_url)}" target="_blank" rel="noopener">${reiseIcon('link')}Buchung verwalten</a>`,
    ].filter(Boolean).join('');
    return `<details class="buchung">
      <summary class="buchung-kopf">
        <span class="buchung-zeile1"><span class="buchung-anbieter" title="${esc(b.anbieter || '')}">${esc(b.anbieter || 'Buchung')}</span>
          ${chip ? `<span class="chip ${chip.klasse}"><span>${esc(chip.text)}</span></span>` : ''}
          ${b.preis != null ? `<span class="num buchung-preis">${esc(reiseBetrag(b.preis, b.waehrung))}</span>` : ''}</span>
        <span class="buchung-zeile2">${zeile2}</span>
      </summary>
      ${details ? `<div class="buchung-details">${details}</div>` : ''}
    </details>`;
  }).join('');
  return `<section class="reise-block"><h4 class="reise-h">${reiseIcon('ticket')}Buchungen <span class="reise-zaehler">${buchungen.length}</span></h4>
    <div class="buchungen">${zeilen}</div></section>`;
}

/* §6 Erledigt & Hinweise: alle Chips der Reisedatei, eingeklappt am Ende.
   Als .chip aus dem Designsystem (Kontrast geprüft), Farbe aus `ton`. */
const REISE_CHIP_TON = { green: 'chip-ok', amber: 'chip-warn', red: 'chip-err', blue: 'chip-info' };
function reiseErledigtHtml(t, reise) {
  const chips = (Array.isArray(reise.chips) ? reise.chips : []).filter(c => c && c.text);
  if (!chips.length) return '';
  const merken = `${t.id}:hinweise`;
  return `<details class="reise-klapp reise-erledigt" data-merken="${esc(merken)}"${reiseKlappGemerkt(merken) ? ' open' : ''}>
    <summary><span class="reise-klapp-titel">Erledigt &amp; Hinweise</span><span class="reise-zaehler">${chips.length}</span></summary>
    <div class="reise-klapp-inhalt"><div class="reise-chips">${chips.map(c =>
      `<span class="chip ${REISE_CHIP_TON[c.ton] || ''}"><span>${esc(c.text)}</span></span>`).join('')}</div></div></details>`;
}

/* Gesamte Karte. `teile` bringt die Stücke mit, die renderTripCard in
   index.html ohnehin baut: Bild, Statusabzeichen, alte Segmentliste,
   verknüpfte Dokumente und die Angaben aus der Dashboard-Reise. */
function reiseKarteHtml(t, reise, teile) {
  const heute = teile.heute;
  const g = reiseFristenGliedern(reise, heute);
  const dokZahl = (reise.dokumente || []).length + (teile.weitereDokumente || 0);
  const dokInhalt = [reiseDokumente(reise, heute), teile.docsSection, teile.linksSection].filter(Boolean).join('');
  const titel = (icon, text) => reiseIcon(icon) + text;
  const abschnitte = [
    reiseKlapp(t.id, 'dokumente', titel('file-text', 'Dokumente'), dokZahl, dokInhalt),
    reiseKlapp(t.id, 'einreise', titel('id-card', 'Einreise'), (reise.einreise || []).length, reiseEinreise(reise)),
    reiseKlapp(t.id, 'kontakte', titel('phone', 'Kontakte'), (reise.kontakte || []).length, reiseKontakte(reise)),
    reiseKlapp(t.id, 'meilen', titel('award', 'Miles &amp; More'), reise.meilen ? (reise.meilen.segmente || []).length : null, reiseMeilen(reise)),
    reiseKlapp(t.id, 'offen', titel('alert-triangle', 'Offen'), (reise.offen || []).length, reiseOffen(reise)),
    reiseKlapp(t.id, 'flugkette', titel('plane', 'Flugkette mit Umstiegen'), (reise.fluege || []).length, reiseFluege(t, reise)),
    reiseKlapp(t.id, 'segmente', titel('list-checks', 'Segmente'), (t.segments || []).length, teile.segs),
  ].join('');
  /* CP2-0: Notiz der Reise, Quelle und Angaben der Dashboard-Reise standen
     offen im Fuß (am Telefon rund 180 px) — jetzt eine eingeklappte Zeile. */
  const fussInhalt = reiseFuss(reise) + (teile.metaText ? `<div class="reise-fuss">${teile.metaText}</div>` : '');
  const notiz = reiseKlapp(t.id, 'notiz', titel('info', 'Notiz &amp; Quelle'), null, fussInhalt);
  return `<div class="trip-card reise-neu" id="tc-${esc(t.id)}">
    <div class="reise-raster">
      ${reiseKopfHtml(t, reise, heute, teile.badge, teile.bild, g.offen)}
      <div class="reise-links">${reiseNaechstesHtml(t, reise, heute, g)}${reiseVerlaufHtml(t, reise, heute)}</div>
      <div class="reise-rechts">${reiseBuchungenHtml(t, reise)}
        <section class="reise-block reise-abschnitte">${abschnitte}${notiz}</section>
      </div>
      ${reiseErledigtHtml(t, reise)}
    </div>
  </div>`;
}
