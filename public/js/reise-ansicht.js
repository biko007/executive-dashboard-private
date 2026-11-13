/* ── Reisen-Tab: Reiseseite „Heute zuerst" (CP2-0b, Prototyp v3) ──────────
   Owner-Freigabe 13.11.2026 05:08 MEZ („Freigabe Reisen v3"). Befund nach
   CP2-0: „sieht immer noch grauselig aus, Links im Tagesprogramm nicht
   anklickbar". Vorlage: ~/bikosoc-spec/reisen-v3-prototyp.html. Aufbau
   (mobil in dieser Reihenfolge, ab 1024 px zwei Spalten 7 : 5):
     1 Kopfkarte: Bild, Titel „erste → letzte Station", Zeitraum · Tag · Anlässe,
       Chips „Aktiv" + „{n} überfällig", Menü „…"; darunter das Stationenband
     2 Navy-Karte „Die nächsten 36 Stunden"      3 „Zu erledigen" (Checkliste)
     4 „Reiseplan" je Tag mit Aktions-Chips       5 „Buchungen" gruppiert, Summe
     6 „Unterlagen und Kontakte" als Chip-Reiter (Links standardmäßig offen)
     7 Fuß: „Erledigt und Hinweise ({n})"
   Die Regeln (Stationen, Fenster, Zuordnung der Chips, Summen) stehen in
   reise-ableitung.js und sind dort getestet.

   Aufbau per DOM: Texte per textContent, Links per createElement('a') mit
   geprüfter Adresse (reiseSichereUrl). Nur die bisherigen Blöcke aus
   index.html (Dokumente, Einreise, Miles & More, Flugkette, Offene Punkte,
   Notiz, Vorschaubild) kommen als dort mit esc() gebaute Zeichenkette in
   ihren Reiter — ihr Inhalt ist unverändert.

   Gilt nur für Reisen mit Reiseblock (Import des Reiseassistenten). Im
   Dashboard angelegte Reisen behalten die bisherige Karte. */

/* Auf-/Zu-Zustand und gewählter Reiter je Reise, im Browser gemerkt. Der
   Zugriff auf localStorage kann werfen (privates Fenster, gesperrte
   Website-Daten) — dann gilt einfach der Ausgangszustand. */
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

function reiseWertGemerkt(schluessel) {
  try { return localStorage.getItem(REISE_KLAPP_PRAEFIX + schluessel) || ''; } catch { return ''; }
}

function reiseWertMerken(schluessel, wert) {
  try { localStorage.setItem(REISE_KLAPP_PRAEFIX + schluessel, wert); } catch { /* Komfort */ }
}

/* „toggle" steigt nicht auf; deshalb in der Einfangphase am Dokument. */
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d && d.matches && d.matches('details[data-merken]')) reiseKlappMerken(d.dataset.merken, d.open);
}, true);

/* Icon aus dem Sprite als HTML — für die Zeichenketten-Bausteine in
   index.html (reiseDokumente, reiseFluege …). */
function reiseIcon(name, klasse) {
  return `<svg class="ic ${klasse || 'ic-16'}" aria-hidden="true"><use href="/dashboard/vendor/icons.svg#${name}"></use></svg>`;
}

/* ── DOM-Bausteine ─────────────────────────────────────────────────────── */
const RV_SVG = 'http://www.w3.org/2000/svg';

/* Element mit Klasse und Kindern; Zeichenketten werden Textknoten. */
function rvEl(tag, klasse, ...kinder) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  for (const k of kinder) {
    if (k == null || k === false || k === '') continue;
    e.append(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
  }
  return e;
}

function rvIcon(name, klasse) {
  const svg = document.createElementNS(RV_SVG, 'svg');
  svg.setAttribute('class', `ic ${klasse || 'ic-16'}`);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(RV_SVG, 'use');
  use.setAttribute('href', `/dashboard/vendor/icons.svg#${name}`);
  svg.append(use);
  return svg;
}

/* Nur für die bisherigen Blöcke aus index.html: dort mit esc() gebaut. */
function rvAltblock(klasse, html) {
  const d = rvEl('div', klasse);
  d.innerHTML = html;
  return d;
}

/* Ein Link-Chip. Adresse geprüft (http/https/tel); ohne gültige Adresse kein
   Chip — kein toter Chip. Webseiten öffnen in neuem Tab mit ↗; tel: ohne
   neuen Tab (ein leerer Tab für den Anruf wäre nur störend). */
function rvLinkChip(text, url, titel) {
  const sicher = reiseSichereUrl(url);
  if (!sicher) return null;
  const a = rvEl('a', 'chip chip-act');
  a.href = sicher;
  if (sicher.startsWith('tel:')) {
    a.append(rvIcon('phone', 'ic-12'), rvEl('span', '', text));
  } else {
    a.target = '_blank';
    a.rel = 'noopener';
    a.append(rvEl('span', '', text), rvIcon('external-link', 'ic-12'));
  }
  if (titel) a.title = titel;
  return a;
}

/* Aktions-Chip aus reiseAktionenFuer. „Buchung" springt zur Buchung und
   klappt sie auf (Klick-Handler unten). */
function rvAktionChip(aktion) {
  if (aktion.art === 'buchung') {
    const b = rvEl('button', 'chip chip-act', rvEl('span', '', aktion.text));
    b.type = 'button';
    b.dataset.buchungSprung = String(aktion.buchung);
    return b;
  }
  const titel = aktion.art === 'link' ? aktion.titel : aktion.art === 'karte' ? 'Auf der Karte zeigen' : '';
  return rvLinkChip(aktion.text, aktion.url, titel);
}

function rvAktionen(ereignis, reise, apiLinks, klasse) {
  const chips = reiseAktionenFuer(ereignis, reise, apiLinks).map(rvAktionChip).filter(Boolean);
  return chips.length ? rvEl('span', klasse || 'rv-akt', ...chips) : null;
}

/* Sprung „Buchung": die Zeile, die diese Buchung (oder ihren Programmpunkt)
   enthält, aufklappen und in die Mitte holen. */
document.addEventListener('click', e => {
  const knopf = e.target.closest && e.target.closest('[data-buchung-sprung]');
  if (!knopf) return;
  const karte = knopf.closest('.reise-v3');
  const zeile = karte && karte.querySelector(`details[data-buchung-indizes~="${Number(knopf.dataset.buchungSprung)}"]`);
  if (!zeile) return;
  // auch die umgebende, mobil zugeklappte Buchungskarte öffnen
  for (let p = zeile; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
  const ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  zeile.scrollIntoView({ block: 'center', behavior: ruhig ? 'auto' : 'smooth' });
  const s = zeile.querySelector('summary');
  if (s) s.focus({ preventScroll: true });
});

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

/* ── 1 Kopfkarte mit Stationenband ─────────────────────────────────────── */
function rvMenue(t) {
  const eintrag = (icon, text, aktion, gefahr) => {
    const b = rvEl('button', `nav-mehr-eintrag reise-mehr-eintrag${gefahr ? ' btn-danger' : ''}`, rvIcon(icon), rvEl('span', '', text));
    b.type = 'button';
    b.addEventListener('click', aktion);
    return b;
  };
  const summary = rvEl('summary', 'btn btn-icon btn-secondary', rvIcon('ellipsis', 'ic-18'));
  summary.setAttribute('aria-label', 'Weitere Aktionen');
  summary.title = 'Weitere Aktionen';
  /* Löschen fragt in deleteTrip() weiterhin nach. */
  return rvEl('details', 'nav-mehr reise-mehr', summary,
    rvEl('div', 'nav-mehr-liste card reise-mehr-liste',
      eintrag('pencil', 'Bearbeiten', () => editTrip(t.id)),
      eintrag('refresh-cw', 'Mit Kalender abgleichen', () => syncAllSegCal(t.id)),
      eintrag('paperclip', 'Verknüpfen', () => linkDocModal('trip', t.id, 'loadTripsRefresh')),
      eintrag('trash-2', 'Löschen', () => deleteTrip(t.id), true)));
}

function rvKopf(t, k) {
  const { heute, stationen, g } = k;
  const status = t.start_date <= heute && heute <= t.end_date ? ['Aktiv', 'chip-ok']
    : t.start_date > heute ? ['Geplant', 'chip-info'] : ['Vergangen', 'chip-neutral'];
  const offenChip = status[0] === 'Vergangen' ? null
    : g.ueberfaellig.length ? rvEl('span', 'chip chip-warn', rvEl('span', '', `${g.ueberfaellig.length} überfällig`))
    : g.offen ? rvEl('span', 'chip chip-neutral', rvEl('span', '', `${g.offen} offen`))
    : rvEl('span', 'chip chip-ok', rvEl('span', '', 'nichts offen'));
  const countdown = reiseCountdown(t.start_date, t.end_date, heute);
  const anlaesse = reiseAnlaesse(t.name).map(a => a.anlass).join(', ');
  const sub = [reiseZeitraumKurz(t.start_date, t.end_date), countdown.art === 'unbekannt' ? '' : countdown.text, anlaesse].filter(Boolean).join(' · ');
  const titel = rvEl('h2', 'rv-titel', reiseTitelAusStationen(stationen, t.name));
  titel.title = t.name;

  const kopf = rvEl('div', 'rv-kopf',
    rvAltblock('rv-thumb', k.teile.bild || ''),
    rvEl('div', 'rv-kopf-text', titel, rvEl('div', 'rv-sub', sub)),
    rvEl('div', 'rv-kopf-aktionen', rvEl('span', `chip ${status[1]}`, rvEl('span', '', status[0])), offenChip, rvMenue(t)));

  const karte = rvEl('section', 'rv-karte rv-kopfkarte', kopf);
  if (stationen.length > 1) {
    const ol = rvEl('ol', '');
    for (const s of stationen) {
      const li = rvEl('li', s.zustand === 'vorbei' ? 'vorbei' : s.zustand === 'jetzt' ? 'jetzt' : '',
        rvEl('b', '', s.ort), rvEl('small', '', s.spanne + (s.zustand === 'jetzt' ? ' · heute' : '')));
      if (s.zustand === 'jetzt') li.setAttribute('aria-current', 'location');
      ol.append(li);
    }
    const band = rvEl('div', 'rv-band', ol);
    band.setAttribute('role', 'group');
    band.setAttribute('aria-label', 'Stationen der Reise');
    band.tabIndex = 0;
    karte.append(band);
  }
  return karte;
}

/* ── 2 Die nächsten 36 Stunden ─────────────────────────────────────────── */
function rvJetzt(t, reise, k) {
  const { jetzt, stationen } = k;
  const station = (stationen.find(s => s.zustand === 'jetzt') || {}).ort || '';
  const uhr = Number.isFinite(jetzt.minuten)
    ? `${String(Math.floor(jetzt.minuten / 60)).padStart(2, '0')}:${String(jetzt.minuten % 60).padStart(2, '0')}` : '';
  const wann = [reiseTagKurz(jetzt.tag), uhr].filter(Boolean).join(', ');
  const ueb = rvEl('div', 'rv-ueb', rvEl('h2', '', 'Die nächsten 36 Stunden'),
    rvEl('span', '', [station, wann && `${wann} ${jetzt.quelle === 'ortszeit' ? 'Ortszeit' : 'Berliner Zeit'}`].filter(Boolean).join(' · ')));
  const liste = reiseNaechste36(k.ereignisse, reise, jetzt.tag, jetzt.minuten);
  const ul = rvEl('ul', '');
  if (!liste.length) ul.append(rvEl('li', 'rv-leer', 'Nichts Dringendes in den nächsten 36 Stunden'));
  for (const e of liste) {
    const zeit = (e.zeitArt === 'bis' ? 'bis ' : '') + e.zeit;
    const unter = [e.unter, e.bisZeit && `bis ${e.bisZeit}`].filter(Boolean).join(' · ');
    ul.append(rvEl('li', '',
      rvEl('div', 'rv-z', e.wann, rvEl('small', '', zeit)),
      rvEl('div', 'rv-t', rvEl('span', 'rv-t-titel', e.titel), unter ? rvEl('small', '', unter) : null,
        rvAktionen(e, reise, k.apiLinks))));
  }
  return rvEl('section', 'rv-jetzt' + (liste.length ? '' : ' leer'), ueb, ul);
}

/* ── 3 Zu erledigen ────────────────────────────────────────────────────── */
function rvFristZeile(f) {
  const tag = rvEl('span', 'rv-frist-tag', reiseTagKurz(f.faellig) || '–');
  const text = rvEl('span', 'rv-frist-text', f.titel || '', f.notiz ? rvEl('small', '', f.notiz) : null);
  const rest = rvEl('span', `rv-frist-rest${f.einstufung === 'ueberfaellig' ? ' rot' : ''}`, f.rest || '');
  return rvEl('li', '', tag, text, rest);
}

function rvFristGruppen(gruppen) {
  const d = rvEl('div', 'rv-fristen');
  for (const [titel, liste] of gruppen) {
    if (!liste.length) continue;
    d.append(rvEl('div', 'rv-frist-gruppe', rvEl('h3', '', titel, rvEl('span', 'rv-zahl', String(liste.length))),
      rvEl('ul', '', ...liste.map(rvFristZeile))));
  }
  return d;
}

/* Ein Chip-Knopf, der einen Bereich auf- und zuklappt (Zustand gemerkt). */
function rvKlappKnopf(text, bereich, merken) {
  const knopf = rvEl('button', 'chip rv-klapp-knopf', rvEl('span', '', text), rvIcon('chevron-right', 'ic-12'));
  knopf.type = 'button';
  const setze = offen => {
    bereich.hidden = !offen;
    knopf.setAttribute('aria-expanded', String(offen));
    knopf.classList.toggle('offen', offen);
  };
  setze(reiseKlappGemerkt(merken));
  knopf.addEventListener('click', () => {
    const offen = bereich.hidden;
    setze(offen);
    reiseKlappMerken(merken, offen);
  });
  return knopf;
}

function rvZuErledigen(t, reise, k) {
  const { g, heute } = k;
  const liste = reiseZuErledigen(g, heute);
  const ul = rvEl('ul', 'rv-todo');
  if (!liste.length) ul.append(rvEl('li', 'rv-leer', 'Nichts offen.'));
  for (const f of liste) {
    /* Kein Erledigt-Mechanismus ohne Schreibzugriff auf die Reisedatei —
       das Kästchen ist reine Anzeige (CP2-0b, Reisedaten nur lesen). */
    const box = rvEl('span', 'rv-box');
    box.setAttribute('aria-hidden', 'true');
    const text = rvEl('span', 'rv-todo-text', f.titel || '');
    text.title = f.titel || '';
    ul.append(rvEl('li', '', box, text,
      rvEl('span', `rv-todo-frist${f.einstufung === 'ueberfaellig' ? ' rot' : ''}`, f.bis)));
  }
  const karte = rvEl('section', 'rv-karte rv-zu-erledigen', rvEl('h2', 'rv-h2', 'Zu erledigen'), ul);
  const alleZahl = g.ueberfaellig.length + g.kommend.length + g.vergangen.length;
  const fuss = rvEl('div', 'rv-todo-fuss');
  const bereiche = [];
  if (alleZahl) {
    const b = rvFristGruppen([['Überfällig', g.ueberfaellig], ['Kommend', g.kommend], ['Vergangen', g.vergangen]]);
    fuss.append(rvKlappKnopf(`Alle ${alleZahl} Fristen`, b, `${t.id}:fristen`));
    bereiche.push(b);
  }
  if (g.erledigt.length) {
    const b = rvFristGruppen([['Erledigt', g.erledigt]]);
    fuss.append(rvKlappKnopf(`Erledigt ${g.erledigt.length}`, b, `${t.id}:fristen-erledigt`));
    bereiche.push(b);
  }
  if (bereiche.length) karte.append(fuss, ...bereiche);
  return karte;
}

/* ── 4 Reiseplan ───────────────────────────────────────────────────────── */
function rvPlanTag(d, reise, k) {
  const datum = d.von === d.bis
    ? rvEl('div', 'rv-d', reiseSpanneKurz(d.von, d.bis), d.heute ? rvEl('small', '', 'heute') : null)
    : rvEl('div', 'rv-d', reiseSpanneKurz(d.von, d.bis),
      rvEl('small', '', `${reiseTagKurz(d.von).slice(0, 2)}–${reiseTagKurz(d.bis).slice(0, 2)}`));
  const inhalt = rvEl('div', 'rv-tag-inhalt');
  if (d.ort) {
    const ort = rvEl('div', `rv-o${d.wechsel ? ' weg' : ''}`);
    if (d.wechsel) {
      const [a, ...rest] = d.ort.split(/\s*→\s*/);
      ort.append(a, rvIcon('plane', 'ic-14'), rest.join(' → '));
      ort.setAttribute('aria-label', d.ort);
    } else ort.append(d.ort);
    inhalt.append(ort);
  }
  /* Zeit links in fester Spalte, Titel und Chips rechts im Fluss — so
     bricht nur der Titel um, nicht die ganze Zeile. „bis 00:25" steht im
     Titel der Frist, die Spalte zeigt die Uhrzeit. */
  for (const e of d.ereignisse) {
    const titel = [e.titel, e.bisZeit && `bis ${e.bisZeit}`, d.tage > 1 && e.art === 'termin' && `${d.tage} Tage`].filter(Boolean).join(' · ');
    inhalt.append(rvEl('div', 'rv-ev', rvEl('span', 'rv-zeit', e.zeit || '—'),
      rvEl('div', 'rv-ev-text', rvEl('span', 'rv-ev-titel', titel), rvAktionen(e, reise, k.apiLinks))));
  }
  if (d.unterkunft) {
    inhalt.append(rvEl('div', 'rv-hotel-band', rvIcon('bed', 'ic-14'), `${d.unterkunft.text} · ${d.unterkunft.spanne}`));
  }
  for (const o of d.offen) {
    inhalt.append(rvEl('div', 'rv-ev rv-offen', rvEl('span', 'rv-zeit', ''),
      rvEl('div', 'rv-ev-text', rvEl('span', 'rv-ev-titel', o), rvEl('span', 'rv-akt', rvEl('span', 'chip chip-warn', rvEl('span', '', 'Aufgabe'))))));
  }
  const li = rvEl('li', d.heute ? 'heute' : '', datum, inhalt);
  if (d.heute) li.setAttribute('aria-current', 'date');
  return li;
}

function rvReiseplan(t, reise, k) {
  const plan = k.plan;
  const ol = rvEl('ol', 'rv-plan');
  if (plan.vergangen.length) {
    const merken = `${t.id}:verlauf-vergangen`;
    const summary = rvEl('summary', '', rvEl('span', 'rv-d', plan.spanneVergangen), rvEl('span', 'rv-kurz', plan.kurz),
      rvIcon('chevron-right', 'ic-14 rv-pfeil'));
    const details = rvEl('details', '', summary, rvEl('ol', 'rv-plan rv-plan-innen', ...plan.vergangen.map(d => rvPlanTag(d, reise, k))));
    details.dataset.merken = merken;
    details.open = reiseKlappGemerkt(merken);
    ol.append(rvEl('li', 'rv-gefaltet', details));
  }
  /* Mobil stehen heute und die nächsten vier Tage offen, die übrigen als
     eine Zeile zum Aufklappen (Höhe der Seite ≤ CP2-0); am Desktop ist sie
     offen und ihre Kopfzeile ausgeblendet. */
  const ab = reiseIstTag(k.heute) && k.heute > t.start_date ? k.heute : t.start_date;
  const grenze = reiseTagPlus(ab, 4);
  const nah = plan.rest.filter(d => d.von <= grenze);
  const spaeter = plan.rest.filter(d => d.von > grenze);
  for (const d of nah) ol.append(rvPlanTag(d, reise, k));
  if (spaeter.length) {
    const von = spaeter[0].von, bis = spaeter[spaeter.length - 1].bis;
    const orte = [...new Set(spaeter.map(d => String(d.ort || '').split(/\s*→\s*/).pop()).filter(Boolean))];
    const n = reiseTageZwischen(von, bis) + 1;
    const merken = `${t.id}:plan-spaeter`;
    const summary = rvEl('summary', '', rvEl('span', 'rv-d', reiseSpanneKurz(von, bis)),
      rvEl('span', 'rv-kurz', [orte.length > 1 ? `${orte[0]} → ${orte[orte.length - 1]}` : orte[0], `${n} Tage`].filter(Boolean).join(' · ')),
      rvIcon('chevron-right', 'ic-14 rv-pfeil'));
    const details = rvEl('details', '', summary, rvEl('ol', 'rv-plan rv-plan-innen', ...spaeter.map(d => rvPlanTag(d, reise, k))));
    details.dataset.merken = merken;
    details.open = reiseKlappGemerkt(merken) || (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
    ol.append(rvEl('li', 'rv-gefaltet rv-spaeter', details));
  }
  return rvEl('section', 'rv-karte rv-reiseplan', rvEl('h2', 'rv-h2', 'Reiseplan'), ol);
}

/* ── 5 Buchungen ───────────────────────────────────────────────────────── */
/* Bekannte Buchungszustände (sonst steht das Wort unter „Vielflieger"; v11
   trägt bei SWISS „Senator" im Feld status). */
const REISE_BUCHUNGSSTAND = /^(bestätigt|bezahlt|gebucht|ausgestellt|reserviert|offen|storniert|warteliste|vorschlag)/i;

function rvKopie(wert, name) {
  const b = rvEl('button', 'btn btn-ghost kpi-kopie', rvIcon('clipboard-copy'));
  b.type = 'button';
  b.dataset.kopie = wert;
  b.dataset.kopieName = name;
  b.setAttribute('aria-label', `${name} kopieren`);
  b.title = `${name} kopieren`;
  return b;
}

function rvDetailZeile(label, wert, ...extra) {
  return rvEl('div', 'dok-zeile', label ? rvEl('b', '', label + ':') : null, wert ? ' ' + wert : null, ...extra);
}

/* Titel der Zeile: Anbieter, Gedankenstriche als „·", ohne „(von … gebucht)". */
function rvBuchungTitel(b) {
  return String(b.anbieter || 'Buchung').replace(/\s*\(von\s+[^)]*gebucht\)/i, '').replace(/\s+[–—]\s+/g, ' · ');
}

function rvBuchungChipText(b, art) {
  if (art === 'flug') return 'Verwalten';
  if (art === 'hotel') return 'Hotel';
  return reiseLinkText(b.anbieter, false);
}

function rvBuchungZeile(zeile, t, reise) {
  const b = zeile.buchung;
  const buchungen = reise.buchungen || [];
  const stand = b.status && REISE_BUCHUNGSSTAND.test(b.status) ? b.status : '';
  const vielflieger = [b.vielflieger, stand ? '' : b.status].filter(Boolean).join(' · ');
  const statusChip = reiseBuchungStatusChip(b);
  const datum = reiseBuchungZeilenDatum(zeile, reise, t.start_date, t.end_date);
  const person = reiseBuchungVon(b);

  const me = rvEl('div', 'rv-me');
  const teil = (...x) => { if (me.childNodes.length) me.append(rvEl('span', 'rv-trenner', '·')); me.append(...x); };
  if (b.code) teil(rvEl('code', '', b.code));
  if (datum) teil(rvEl('span', '', datum));
  if (person) teil(rvEl('span', '', `von ${person}`));
  if (statusChip) me.append(rvEl('span', `chip ${statusChip.klasse}`, rvEl('span', '', statusChip.text)));
  const chip = rvLinkChip(rvBuchungChipText(b, zeile.art), b.verwalten_url, 'Buchung beim Anbieter öffnen');
  if (chip) me.append(chip);

  const titel = rvEl('div', 'rv-ti', rvBuchungTitel(b));
  titel.title = b.anbieter || '';
  const summary = rvEl('summary', 'rv-row', titel, me,
    rvEl('div', 'rv-be num', b.preis != null ? reiseBetrag(b.preis, b.waehrung) : '—'));

  const details = rvEl('div', 'buchung-details',
    b.code && rvDetailZeile('Buchungscode', '', rvEl('span', 'buchung-code', b.code), ' ', rvKopie(b.code, 'Buchungscode')),
    stand && rvDetailZeile('Stand', stand),
    b.ausgestellt && rvDetailZeile('Ausgestellt', fmtDate(b.ausgestellt)),
    b.tarif && rvDetailZeile('Tarif', b.tarif),
    b.ticket && rvDetailZeile('Ticket', b.ticket, ' ', rvKopie(b.ticket, 'Ticketnummer')),
    vielflieger && rvDetailZeile('Vielflieger', vielflieger),
    b.ausgestellt_ueber && rvDetailZeile('Ausgestellt über', b.ausgestellt_ueber),
    b.notiz && rvDetailZeile('', b.notiz));
  /* Programmpunkte derselben Buchung (QCon Tag 1–3, Trainings, AGI Tag 1/2)
     mit ihrem eigenen Link. */
  if (zeile.teile.length) {
    const ul = rvEl('ul', 'rv-teile');
    for (const i of zeile.teile) {
      const p = buchungen[i];
      const wann = [reiseIstTag(p.von) ? reiseTagKurz(p.von) : '', [p.zeit_von, p.zeit_bis].filter(Boolean).join('–')].filter(Boolean).join(' ');
      ul.append(rvEl('li', '', rvEl('span', 'rv-teil-wann', wann), rvEl('span', 'rv-teil-titel', rvBuchungTitel(p)),
        rvLinkChip(reiseLinkText(p.anbieter, false), p.verwalten_url, p.anbieter)));
    }
    details.append(rvEl('div', 'rv-teile-kopf', 'Programmpunkte'), ul);
  }
  const knopf = rvLinkChip('Buchung verwalten', b.verwalten_url, '');
  if (knopf) { knopf.classList.add('dok-knopf'); details.append(knopf); }

  const el = rvEl('details', 'rv-buchung', summary, details);
  el.dataset.buchungIndizes = [zeile.index, ...zeile.teile].join(' ');
  return el;
}

function rvBuchungen(t, reise) {
  const gruppen = reiseBuchungsgruppen(reise, t.start_date, t.end_date);
  if (!gruppen.length) return null;
  const zahl = gruppen.reduce((n, g) => n + g.zeilen.length, 0);
  const summen = reiseSummen(reise.buchungen);
  const summenText = summen.map(s => reiseBetrag(s.betrag, s.waehrung)).join(' · ');
  /* Mobil zugeklappt (Kopfzeile mit Summe), am Desktop offen: am Telefon
     sind Buchungen Nachschlagestoff — „Heute zuerst" und Höhe ≤ CP2-0. Der
     Sprung „Buchung" klappt die Karte mit auf. */
  const summary = rvEl('summary', 'rv-buchungen-kopf',
    rvEl('h2', 'rv-h2', 'Buchungen ', rvEl('span', 'rv-zahl-text', String(zahl))),
    summenText ? rvEl('span', 'rv-summe-kurz', summenText) : null, rvIcon('chevron-right', 'ic-14 rv-pfeil'));
  const klapp = rvEl('details', 'rv-buchungen-klapp', summary);
  const merken = `${t.id}:buchungen`;
  klapp.dataset.merken = merken;
  klapp.open = reiseKlappGemerkt(merken) || (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
  for (const g of gruppen) {
    klapp.append(rvEl('div', 'rv-grp', rvEl('h3', '', rvIcon(g.icon, 'ic-14'), g.titel), ...g.zeilen.map(z => rvBuchungZeile(z, t, reise))));
  }
  if (summen.length) {
    const werte = rvEl('span', 'rv-summe-werte');
    summen.forEach((s, i) => { if (i) werte.append(' · '); werte.append(rvEl('b', '', reiseBetrag(s.betrag, s.waehrung))); });
    klapp.append(rvEl('div', 'rv-summe', rvEl('span', '', 'Summe'), werte));
  }
  return rvEl('section', 'rv-karte rv-buchungen', klapp);
}

/* ── 6 Unterlagen und Kontakte (Chip-Reiter) ───────────────────────────── */
function rvErsterSatz(text) {
  return String(text || '').split(/(?<=\.)\s/)[0];
}

/* Lange Listen zeigen mobil die ersten fünf Einträge und darunter „Alle {n}
   {was}" (Höhe der Seite); am Desktop blendet CSS Knopf und Kürzung aus. */
const RV_KURZLISTE = 5;
function rvKurzliste(ul, n, was) {
  if (n <= RV_KURZLISTE + 1) return ul;
  ul.classList.add('rv-gekuerzt');
  const knopf = rvEl('button', 'chip rv-klapp-knopf rv-alle', rvEl('span', '', `Alle ${n} ${was}`), rvIcon('chevron-right', 'ic-12'));
  knopf.type = 'button';
  knopf.setAttribute('aria-expanded', 'false');
  knopf.addEventListener('click', () => {
    const offen = ul.classList.toggle('rv-gekuerzt') === false;
    knopf.setAttribute('aria-expanded', String(offen));
    knopf.classList.toggle('offen', offen);
  });
  return rvEl('div', '', ul, knopf);
}

function rvLinkListe(links) {
  return rvKurzliste(rvEl('ul', 'rv-links', ...links.map(l => rvEl('li', '',
    rvEl('div', 'rv-ti', l.titel, l.notiz ? rvEl('small', '', rvErsterSatz(l.notiz)) : null),
    rvLinkChip('Öffnen', l.url, l.titel)))), links.length, 'Links');
}

function rvKontaktListe(kontakte) {
  return rvKurzliste(rvEl('ul', 'rv-links', ...kontakte.map(k => {
    const akt = rvEl('span', 'rv-akt',
      k.telefon ? rvLinkChip('Anrufen', reiseTelUrl(k.telefon), k.telefon) : null,
      k.url ? rvLinkChip('Öffnen', k.url, k.name) : null);
    return rvEl('li', '', rvEl('div', 'rv-ti', k.name, k.notiz ? rvEl('small', '', rvErsterSatz(k.notiz)) : null), akt);
  })), kontakte.length, 'Kontakte');
}

function rvUnterlagen(t, reise, k) {
  const teile = k.teile;
  const { links, kontakte } = reiseLinksUndKontakte(reise.kontakte);
  const apiLinks = (k.apiLinks || []).map(l => ({ titel: l.label || l.spName || l.localName || '', url: reiseSichereUrl(l.spWebUrl), notiz: '' }))
    .filter(l => l.url && l.titel);
  const alleLinks = [...links, ...apiLinks];
  const dokHtml = [reiseDokumente(reise, k.heute), teile.docsSection, teile.linksSection].filter(Boolean).join('');
  const notizHtml = reiseFuss(reise) + (teile.metaText ? `<div class="reise-fuss">${teile.metaText}</div>` : '');
  const reiter = [
    ['links', 'Links', alleLinks.length, alleLinks.length ? () => rvLinkListe(alleLinks) : null],
    ['kontakte', 'Kontakte', kontakte.length, kontakte.length ? () => rvKontaktListe(kontakte) : null],
    ['dokumente', 'Dokumente', (reise.dokumente || []).length + (teile.weitereDokumente || 0), dokHtml ? () => rvAltblock('rv-alt', dokHtml) : null],
    ['einreise', 'Einreise', (reise.einreise || []).length, () => { const h = reiseEinreise(reise); return h ? rvAltblock('rv-alt', h) : null; }],
    ['meilen', 'Miles & More', reise.meilen ? (reise.meilen.segmente || []).length : null, () => { const h = reiseMeilen(reise); return h ? rvAltblock('rv-alt', h) : null; }],
    ['flugkette', 'Flugkette', (reise.fluege || []).length, () => { const h = reiseFluege(t, reise); return h ? rvAltblock('rv-alt', h) : null; }],
    ['offen', 'Offene Punkte', (reise.offen || []).length, () => { const h = reiseOffen(reise); return h ? rvAltblock('rv-alt', h) : null; }],
    ['segmente', 'Segmente', (t.segments || []).length, teile.segs ? () => rvAltblock('rv-alt', teile.segs) : null],
    ['notiz', 'Notiz', null, notizHtml ? () => rvAltblock('rv-alt', notizHtml) : null],
  ].map(([id, titel, zahl, bau]) => ({ id, titel, zahl, inhalt: bau ? bau() : null })).filter(r => r.inhalt);
  if (!reiter.length) return null;

  const leiste = rvEl('div', 'rv-reiter');
  leiste.setAttribute('role', 'tablist');
  leiste.setAttribute('aria-label', 'Unterlagen und Kontakte');
  const karte = rvEl('section', 'rv-karte rv-unterlagen', rvEl('h2', 'rv-h2', 'Unterlagen und Kontakte'), leiste);
  const merken = `${t.id}:reiter`;
  const gewaehlt = reiter.some(r => r.id === reiseWertGemerkt(merken)) ? reiseWertGemerkt(merken) : reiter[0].id;
  const knoepfe = [];
  const flaechen = [];
  const zeige = id => {
    knoepfe.forEach(b => { const an = b.dataset.reiter === id; b.classList.toggle('on', an); b.setAttribute('aria-selected', String(an)); b.tabIndex = an ? 0 : -1; });
    flaechen.forEach(f => { f.hidden = f.dataset.reiter !== id; });
  };
  reiter.forEach(r => {
    const knopfId = `rv-reiter-${t.id}-${r.id}`.replace(/[^A-Za-z0-9_-]/g, '-');
    const b = rvEl('button', '', r.titel, r.zahl != null ? rvEl('b', '', String(r.zahl)) : null);
    b.type = 'button';
    b.id = knopfId;
    b.dataset.reiter = r.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', knopfId + '-inhalt');
    b.addEventListener('click', () => { zeige(r.id); reiseWertMerken(merken, r.id); });
    knoepfe.push(b);
    leiste.append(b);
    const f = rvEl('div', 'rv-reiter-inhalt', r.inhalt);
    f.id = knopfId + '-inhalt';
    f.dataset.reiter = r.id;
    f.setAttribute('role', 'tabpanel');
    f.setAttribute('aria-labelledby', knopfId);
    flaechen.push(f);
    karte.append(f);
  });
  /* Pfeiltasten wechseln den Reiter (Tablist-Muster). */
  leiste.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = knoepfe.findIndex(b => b.classList.contains('on'));
    const n = knoepfe[(i + (e.key === 'ArrowRight' ? 1 : knoepfe.length - 1)) % knoepfe.length];
    n.click();
    n.focus();
  });
  zeige(gewaehlt);
  return karte;
}

/* ── 7 Erledigt und Hinweise ───────────────────────────────────────────── */
const REISE_CHIP_TON = { green: 'chip-ok', amber: 'chip-warn', red: 'chip-err', blue: 'chip-info' };

function rvErledigt(t, reise) {
  const chips = (Array.isArray(reise.chips) ? reise.chips : []).filter(c => c && c.text);
  if (!chips.length) return null;
  const merken = `${t.id}:hinweise`;
  const d = rvEl('details', 'rv-erledigt',
    rvEl('summary', '', rvEl('span', '', `Erledigt und Hinweise (${chips.length})`), rvIcon('chevron-right', 'ic-14 rv-pfeil')),
    rvEl('div', 'rv-erledigt-chips', ...chips.map(c => rvEl('span', `chip ${REISE_CHIP_TON[c.ton] || ''}`, rvEl('span', '', c.text)))));
  d.dataset.merken = merken;
  d.open = reiseKlappGemerkt(merken);
  return d;
}

/* ── Gesamte Seite einer Reise ─────────────────────────────────────────── */
/* `teile` bringt mit, was renderTripCard in index.html ohnehin baut:
   Vorschaubild, alte Segmentliste, verknüpfte Dokumente, Angaben der
   Dashboard-Reise, „heute" und „jetzt" in Ortszeit, die Links der Reise aus
   /api/links. */
function reiseKarteBauen(t, reise, teile) {
  const heute = teile.heute;
  const jetzt = teile.jetzt || { tag: heute, minuten: null, quelle: 'berlin' };
  const { zeilen } = reiseTagesleiste(reise, t.start_date, t.end_date, heute);
  const k = {
    teile, heute, jetzt, apiLinks: teile.apiLinks || [],
    stationen: reiseStationen(zeilen, heute),
    g: reiseFristenGliedern(reise, heute),
    ereignisse: reiseEreignisse(reise, t.start_date, t.end_date),
    plan: reisePlan(t, reise, heute),
  };
  const vorbei = t.end_date < heute;
  const wurzel = rvEl('div', 'rv-seite');
  wurzel.append(rvKopf(t, k));
  const oben = rvEl('div', 'rv-g rv-g2', vorbei ? null : rvJetzt(t, reise, k), rvZuErledigen(t, reise, k));
  const rechts = rvEl('div', 'rv-g rv-spalte', rvBuchungen(t, reise), rvUnterlagen(t, reise, k));
  const unten = rvEl('div', 'rv-g rv-g2', rvReiseplan(t, reise, k), rechts);
  wurzel.append(oben, unten);
  const fuss = rvErledigt(t, reise);
  if (fuss) wurzel.append(fuss);
  return wurzel;
}

/* index.html baut die Reiseliste als Zeichenkette. Für Reisen mit
   Reiseblock steht dort ein leerer Platzhalter; reiseKartenEinsetzen() füllt
   ihn nach dem Einsetzen per DOM. */
const REISE_V3_WARTEND = new Map();

function reiseKarteHtml(t, reise, teile) {
  REISE_V3_WARTEND.set(String(t.id), { t, reise, teile });
  return `<div class="trip-card reise-neu reise-v3" id="tc-${esc(t.id)}" data-reise-v3="${esc(t.id)}"></div>`;
}

function reiseKartenEinsetzen(wurzel) {
  for (const platz of wurzel.querySelectorAll('[data-reise-v3]')) {
    const d = REISE_V3_WARTEND.get(platz.dataset.reiseV3);
    if (!d) continue;
    try {
      platz.replaceChildren(reiseKarteBauen(d.t, d.reise, d.teile));
    } catch (e) {
      console.error('[reisen] Reiseseite nicht aufgebaut:', e);
      platz.replaceChildren(rvEl('div', 'empty', 'Diese Reise konnte nicht dargestellt werden.'));
    }
  }
  REISE_V3_WARTEND.clear();
  /* Stationenband zur aktuellen Station rollen (mobil scrollt es seitlich);
     ohne Animation bei prefers-reduced-motion. block 'nearest': die Seite
     selbst soll dabei nicht springen. */
  const ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const li of wurzel.querySelectorAll('.rv-band li.jetzt')) {
    const band = li.closest('.rv-band');
    if (band.scrollWidth > band.clientWidth) li.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ruhig ? 'auto' : 'smooth' });
  }
}
