# Designsystem „Horizont" – Executive Dashboard

Stand: 05.11.2026, Checkpoint 1 (Spec-Dashboard-Design-v2). Verbindliche Quelle
für Farben, Schrift, Abstände und Bausteine ist `public/css/design.css`; dieses
Dokument erklärt sie, es ersetzt sie nicht.

## Grundsätze

- Hell, mobil zuerst. Seitengrund Sand (`--bg`), Karten weiß, Schrift Navy.
- `design.css` ist das **erste** Stylesheet. Der Inline-Style in `index.html`
  folgt danach und gewinnt bei gleicher Spezifität – dort stehen nur noch
  Altbestand-Regeln der Fachbereiche, die in CP2 abgelöst werden.
- Keine Rohfarben außerhalb von `design.css`. Die alten Variablennamen
  (`--yellow`, `--fg`, `--card`, `--r` …) sind Aliase und verschwinden in CP2.
- CSP bleibt streng: `font-src 'self'`, keine fremden Hosts, kein `unsafe-eval`.
  Schrift und Icons liegen lokal unter `public/vendor/`.

## Farben (Tokens)

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | #F6F3EC | Seitengrund |
| `--surface` | #FFFFFF | Karten, Dialoge, Kopfzeile |
| `--surface-2` | #EDE7DA | Fläche in einer Karte |
| `--surface-3` | #F6F3EC | Kachel in weißer Karte |
| `--border` / `--border-soft` / `--border-strong` | #E4DDD0 / #EFEAE0 / #8A7F70 | Rahmen, Trenner, Formularrahmen |
| `--text` / `--text-soft` / `--muted` | #1D2B45 / #4B5568 / #6F6A62 | Schrift; `--muted` nur auf `--surface`/`--surface-3` |
| `--accent` | #3B70B5 | Aktion, aktiver Zustand; als Text nur auf `--surface`/`--surface-3` |
| `--accent-dark` | #2A5590 | Hover, gedrückt, Links auf `--bg`/`--surface-2` |
| `--accent-weak` / `--on-accent` | #E6EFF9 / #FFFFFF | Tönung, Schrift auf Akzent |
| `--navy` / `--on-navy` / `--on-navy-soft` | #1D2B45 / #FFFFFF / #B9C6DA | Anker-Karte, aktive Pille |
| `--sand` | #C9B08E | Rahmen der Zweitschaltfläche |
| `--green*` | #2E7D4F / #E5F3EA / #1F6B40 | in Ordnung |
| `--gold*` | #C8923A / #FBF1DC / #8A5E12 | fällig |
| `--red*` | #B9402F / #FBE9E6 / #9C3324 | überfällig, Fehler |
| `--sun` / `--sun-core` / `--sun-glanz` | #E8B45A / #F6D27A / #FFF4CC | Tagesbogen: Sonne, Sonnenbahn (CP1-9) |
| `--moon` / `--moon-dark` / `--moon-licht` | #7F97BE / #2E4166 / #FFFBEF | Tagesbogen: Mondbahn, Mondscheibe, Sichel |
| `--sky-top` / `--sky-bottom` | #DCE9F7 / #FBF1DC | Tagesbogen: Himmelsverlauf tags |
| `--night-top` / `--night-bottom` | #1D2B45 / #2E4166 | Tagesbogen: Himmelsverlauf nachts |

**Abweichungen von der Spec-Tabelle (begründet):**

- `--accent` ist #3B70B5 statt #3C72B8. Mit dem Spec-Wert erreicht das erlaubte
  Paar `--accent` auf `--surface-3` nur 4,42:1 (Soll 4,5). Der neue Wert ergibt
  4,54:1 und ist optisch nicht zu unterscheiden.
- `--gold` wird weder als Text noch als Statuspunkt verwendet: auf `--gold-weak`
  2,45:1, auf Weiß 2,75:1 (Soll für Statuspunkte 3:1). Punkte und Ränder für
  „fällig" nehmen `--on-gold-weak`. `--gold` bleibt Fläche und Schmuck.

## Erlaubte Kontrastpaare (§1.6)

Text ≥ 4,5:1, Icons/Rahmen/Statuspunkte ≥ 3:1. Geprüft wird programmatisch mit
`node test/e2e/kontrast-pruefen.mjs` (liest die Werte aus `design.css`):

- `--text`, `--text-soft` auf `--surface`, `--surface-2`, `--surface-3`, `--bg`
- `--muted`, `--accent` auf `--surface`, `--surface-3`
- `--accent-dark` auf `--bg`, `--surface-2`, `--accent-weak`
- `--on-accent` auf `--accent`; `--on-navy`, `--on-navy-soft` auf `--navy`
- `--on-green-weak` / `--on-gold-weak` / `--on-red-weak` auf der jeweiligen `-weak`
- `--border-strong`, Statuspunkte auf ihrem Hintergrund (3:1)
- Tagesbogen (CP1-9): `--text`, `--text-soft`, `--muted` auf `--surface` und
  `--sky-bottom` (Legende tags); `--on-navy`, `--on-navy-soft` auf `--night-top`
  und `--night-bottom` (nachts); `--text-soft` auf `--sky-top` (Wochentag mobil)

Andere Kombinationen sind nicht vorgesehen.

## Schrift

Manrope (SIL OFL 1.1, Lizenz `public/vendor/fonts/manrope/LICENSE-OFL.txt`),
woff2 400/500/600/700/800 aus `@fontsource/manrope` 5.3.0 (Teilmenge latin),
`font-display: swap`. Körper 15 px, Zeilenhöhe 1,5; Zahlen `tabular-nums`.
Skala `--fs-11 … --fs-34`. Nichts unter 11 px, Kennzahlen nie unter 18 px.

## Abstände, Radien, Container

`--sp-1…8` = 4/8/12/16/20/24/32/40 px. Seitenrand `--seitenrand` 16 / 24 / 32 px
(< 640 / ≥ 640 / ≥ 1024). `main` max. 1200 px, zentriert; Kopfzeile und
Navigationszeile richten ihren Inhalt an derselben Spalte aus.
Radien: Karte 16, innen 12, Chip 999, Eingabe 10, Navy-Karte 18.

## Icons

Lucide 1.69.0 (ISC, `public/vendor/LICENSE-lucide.txt`) als Sprite
`public/vendor/icons.svg`, gebaut aus `lucide-static` (npm pack).
Nutzung: `<svg class="ic" aria-hidden="true"><use href="/dashboard/vendor/icons.svg#calendar"></use></svg>`.
Icon-Schaltflächen tragen `aria-label`.

Satz CP1 (Spec §1.4): home, log-out, chevron-right, chevron-down, calendar, sun,
moon, heart-pulse, activity, footprints, car, building, plane, wallet, bell,
check, alert-triangle, refresh-cw, external-link, file-text, pencil, trash-2,
paperclip, plus, search, x. **Ergänzt** um briefcase, camera, book-open,
trending-up, plug — damit jeder der 14 Bereiche ein eigenes, eindeutiges Symbol
hat (Private Equity, Instagram, Wiki, Trading, Status).
CP1-7: **ergänzt** um mail, list-checks, info, clock für die Briefing-Abschnitte; CP1-8 um cloud (Wetter).
CP2-0: **ergänzt** um ellipsis (Menü „…“; Lucide-Name für more-horizontal), bed, ticket, map, clipboard-copy, link, phone, folder, id-card, award für die Reisen-Karte.
CP2-0b: **ergänzt** um map-pin (Reisen-Seite v3).

## Bausteine (`design.css`)

`.btn` (44 px, Pille, 700) mit `-primary`, `-secondary`, `-ghost`, `-icon`,
`-danger`; `.chip` (`-ok`, `-warn`, `-err`, `-info`, `-neutral`) und `.chip-row`;
`.card`, `.card-navy`, `.card-head`; `.tile`, `.tiles-2`, `.tiles-3`;
`.list-row` (48 px Zeitspalte, `.ohne-zeit`); `.segment`; `.field`, `.input`,
`.select`, `.textarea`, `.field-label/-help/-error`; `.modal`; `.toast`;
`.table`; `.skeleton`; `.thumb`.

Altbestand bis CP2: Ein alleinstehendes `.btn-ghost` (ohne `.btn`) behält seine
alte umrandete Form; `.card` hat in den Fachbereichen weiter `padding: 0`
(Innenabstand über `.card-pad`); `.modal` und die drei Toast-Umsetzungen werden
erst in CP2 auf die Bausteine umgestellt.

## Kopfzeile und Navigation

- Kopfzeile 64 px, **Navy** (`--navy`), klebend, auf allen Tabs (CP1-5,
  Owner-Entscheidung Option 2): Marke als weißes Quadrat mit Navy-Icon
  (14,15:1; ein Akzent-Quadrat mit weißem Icon hätte 5,03:1 und höbe sich nur
  mit 2,81:1 vom Navy ab), „Executive Dashboard" weiß 15/800 (unter 360 px
  „Dashboard"), „Stand HH:MM" in `--on-navy-soft` (schmal ausgeblendet),
  Abmelden-Icon weiß mit Rand `--kopf-rand` = rgba(255,255,255,.40) (3,55:1;
  der Spec-Wert .25 ergäbe 2,23:1). Fokusring in der Kopfzeile weiß.
- Auf Heute mobil liegt die Kopfzeile nicht mehr über dem Bildband; das Band
  beginnt darunter. Die Pillenzeile bleibt hell.
- Navigationszeile als eigene Zeile, Pillen 44 px, aus `DASHBOARD_TABS`
  (`index.html`) gebaut von `public/js/nav.js` – ohne Alpine.
- Unter 1024 px scrollt die Leiste waagerecht; ein Sentinel mit
  `IntersectionObserver` schaltet Verlauf + Chevron am rechten Rand. Dasselbe
  Muster bekommen `.assets-subtabs` und `.insta-subtabs`.
- Ab 1024 px: Bereiche 1–8 direkt, 9–14 in „Mehr ▾" (`<details class="nav-mehr">`,
  `NAV_DIREKT = 8`). Klick außerhalb und Esc schließen. Liegt der aktive Bereich
  in „Mehr", trägt die Summary dessen Namen.
- Routing bleibt allein bei `showTab()`; die Kennungen in `?tab=` sind unverändert.

## Kartenhöhen (CP1-5)

In allen Rastern stehen die Karten einer Zeile gleich hoch, Inhalt oben,
Kartenkopf-Aktion oben rechts: `.tiles-2`, `.tiles-3`, `.entity-grid`,
`.summary-grid` (`align-items: stretch`, Kinder `height: 100%`) und das
Heute-Raster.

**Heute-Raster seit CP1-8** (keine Wetter-Karte und keine Wetter-Kachel mehr, das
Wetter steht im Briefing):

| Breite | Zeile 1 | Zeile 2 | Zeile 3 |
|---|---|---|---|
| ≥ 1024 px | Handlungsbedarf · Termine · Gesundheit (gleich hoch) | Briefing über alle drei Spalten | Datenquellen (2 Spalten) · Offene Punkte |
| 640–1023 px | Handlungsbedarf · Termine | Gesundheit (volle Breite), dann Briefing | Datenquellen · Offene Punkte |
| < 640 px | eine Spalte; Kachel „Nächster Termin“ über die volle Breite | | |

Datenquellen und Offene Punkte stehen mit `align-self: start` in ihrer
natürlichen Höhe: Gestreckt hätte die kürzere Karte eine leere Fläche.
`/api/heute/umfeld` wird weiter abgerufen, für den Datenquellen-Chip „Wetter“.

Gesundheit-Tab (Minimalfassung bis CP2, `gesundheitKachelnOrdnen` in
`index.html`): Kacheln ohne Wert entfallen; Wert 22/800 ohne Umbruch;
Erklärtext 12 px `--muted`, auf 3 Zeilen gekürzt, „mehr" klappt auf;
Spaltenzahl ab 640 px so, dass keine Kachel allein in der letzten Zeile
steht (bis 4 eine Zeile, sonst zwei gleich lange).

## Vorschaubild (CP1-5)

`.thumb` 64×64, Radius 12, `object-fit: cover`. Erste Anwendung: Reisekarte —
links neben dem Titel statt des früheren 120/180-px-Bildstreifens
(`reiseThumbHtml` in `index.html`, gleiches Markup und gleicher Upload wie
`entityImgHtml`). Ohne Foto ein `--surface-2`-Quadrat mit Icon `plane`.
Fuhrpark und Immobilien folgen in CP2.

## Briefing auf der Tagesübersicht (CP1-7, vollständig seit CP1-8)

Das Dashboard zeigt das Morgen- und Abendbriefing **gegliedert und vollständig**,
nicht als Telegram-Text. Der Telegram-Text selbst bleibt unverändert.

- **Quelle:** `/api/briefing?tage=7` liefert nur den gespeicherten Telegram-Text
  (`textHtml`). `heuteBriefingGliedern()` in `tagesuebersicht.js` zerlegt ihn nach
  seinen Marken: `<b>…</b>` = Abschnitt, `•`/`-` = Eintrag, eingerückte Zeile =
  eigener Eintrag (mit `→` = Zusatz zum vorigen), `Fr 06.11.` = Tageskopf.
- **Vollständigkeit ist Regel:** Jede Zeile des Originals steht in der Karte, in
  ihrer Reihenfolge. Es entfallen nur Emojis und Trennzeichen, die das Layout
  ersetzt (Doppelpunkt, Gedankenstrich, Komma nach „Jetzt“, Klammern um die
  Dauer). Kein Aufklappen, kein `line-clamp`, keine Auslassungspunkte, auf allen
  Breiten. `briefing-panel.test.mjs` prüft das gegen 13 echte Briefings.
- **Kopf:** Statuschip („Zugestellt 07:00 · Telegram“ `.chip-ok`, „Noch nicht
  zugestellt“ `.chip-neutral`), darunter seit CP1-9 der Tagesbogen (siehe dort);
  als Rückfall eine Zeile 13 px `--muted` mit allen Angaben: Datum mit Uhrzeit ·
  Ort · Sonne Aufgang/Untergang · Mondphase · Mond Aufgang/Untergang.
- **Wetter** (erster Abschnitt): Icon `sun` (sonnig, klar, heiter) oder `cloud`;
  „Jetzt“ mit Wert 22/800 und Zustand 14 px; je eine Zeile Heute / Morgen /
  Überm. (Bezeichnung links, Temperaturspanne fett, Wind · Regen · UV als
  Untertitel); Hinweise wie „Regen ab 19:00“ und die Druckzeile 13 px `--muted`
  an ihrer Stelle. Werte unverändert aus dem Text.
- **Abschnitt:** Titel 13/700 gesperrt `--muted` mit Lucide-Icon 16 px in
  `--accent`; Einträge als `.list-row` (Titel 15/600, Untertitel 12 `--muted`),
  die umbrechen. Termine mit Zeitspalte (96 px) unter ihrem Tageskopf. Reiner
  Text: 14 px. Höchstens 68ch je Zeile, Ziffern tabellarisch.
- **Ton:** 🔴 → Punkt `--red`, ⚠️ → Punkt `--on-gold-weak`, rechts in der Zeile.
- **Fallback:** Unbekanntes Format → vollständiger Text als Absätze, ungekürzt.

| Abschnitt (Titel enthält) | Icon |
|---|---|
| Posteingang | `mail` |
| Kalender, Termine | `calendar` |
| cc-Aufträge, Aufgaben, Handlungsbedarf | `list-checks` |
| Banking, Finanzen | `wallet` |
| Trading | `trending-up` |
| Reisen | `plane` |
| NK-Fristen, Immobilien | `building` |
| Fuhrpark | `car` |
| Gesundheit | `heart-pulse` |
| Fristen | `clock` |
| Wetter | `sun` / `cloud` (nach Zustand) |
| alles andere („Sonstiges“) | `info` |

## Tagesbogen (CP1-9)

Der Kopf des Morgenbriefings ist ein **Tagesbogen** nach dem Owner-Prototyp
(`/Austausch/dashboard-design/tagesbogen-prototyp.html`, CSS-Block „Tagesbogen v2“
1:1 in `tagesuebersicht.css`, Selektoren unter `.tb`).

- **Eingaben** (alle aus der geparsten Kopfzeile, `heuteTagesbogenLesen()`):
  Wochentag, Datum, Zustellzeit, Ort, Sonnenauf- und -untergang, Mondauf- und
  -untergang, Mondphase als Text und Beleuchtung in %. „zunehmend/abnehmend“
  folgt aus dem Phasentext (Abnehmend…, Letztes Viertel / Zunehmend…, Erstes
  Viertel; Voll- und Neumond ohne Richtung). Berechnet werden nur die
  Tageslichtdauer („9 h 44 min Tageslicht“), die Bahnen und „jetzt“ (Minuten seit
  Mitternacht in Europe/Berlin, `heuteJetztMinuten()`; in Tests als Parameter).
- **Geometrie** (`heuteTagesbogenGeometrie()`): Zeitfenster frühester Aufgang
  − 30 min bis spätester Untergang + 30 min auf x 20…580, Horizont y 118,
  Sonnenbahn 104 hoch, Mondbahn 66. Der gezeichnete Teil der Bahn reicht bis
  „jetzt“. Mondsichel `heuteTagesbogenMondPfad()` wie im Prototyp; dessen
  innere Ellipse ist auf r − 3 begrenzt, unter etwa 12 % und über etwa 88 %
  sieht die Sichel deshalb gleich aus.
- **Zustände:** Tag = Sonne über dem Horizont (Aufgang ≤ jetzt ≤ Untergang):
  heller Verlauf, Sonne sichtbar, Chip „jetzt HH:MM“ unter der Sonne. Nacht =
  sonst: Klasse `nacht`, Navy-Verlauf, Sterne, keine Sonne, Chip „Nacht · HH:MM“
  unter dem Mond (wenn er oben ist) oder mittig. Der Mond ist sichtbar, solange
  er über dem Horizont steht.
- **Mobil (< 900 px):** einspaltig, Legende untereinander und umbrechend. Der
  Wochentag steht dort tags in `--text-soft` statt `--muted` (oben auf
  `--sky-top` hätte `--muted` nur 4,49:1).
- **Bewegung:** Bahn zeichnet sich in 1,6 s, Sonne und Mond gleiten vom
  Aufgangspunkt an ihren Platz, Glühen und Sternfunkeln; bei
  `prefers-reduced-motion` alles ohne Animation.
- **Fallback:** Fehlen Datum mit Uhrzeit, Ort oder Sonnenzeiten, oder steht eine
  unbekannte Zeile im Kopf, bleibt die bisherige Textzeile (`.hb-kopf`) mit allen
  Angaben — so beim Abendbriefing, dessen Kopf nur das Datum trägt. Fehlt nur der
  Mond, erscheint der Bogen ohne Mondbahn und ohne Mondlegende. Lassen sich die
  Mondzeiten nicht als ein Bogen innerhalb des Tages zeichnen (Aufgang fehlt,
  oder Aufgang nach dem Untergang), entfällt nur die Mondbahn; die Legende nennt
  „Aufgang …/Untergang …“ wörtlich. Ein Fehler beim Bauen fällt auf die Textzeile
  zurück und blockiert nichts.
- **Sicherheit:** Texte nur per `textContent`/Textknoten, SVG per
  `createElementNS`, kein Alpine, keine fremden Hosts, CSP unverändert.
- **Abendbriefing (CP1-10):** Sein Kopf trägt nur „Abendbriefing — <Datum>“.
  `heuteTagesbogenAbend()` nimmt Ort, Sonne, Mond, Phase und Prozent aus dem
  Morgenbriefing mit **demselben Datum im Kopf**, die Zustellzeit aus den
  Metadaten des Abendbriefings (`gesendetAt`, sonst `erzeugtAt`, wie der
  Zustellchip). Ohne passendes Morgenbriefing bleibt die Textzeile. Das Wort
  „Abendbriefing“ steht nicht im Bogen; das gewählte Segment „Abend“ zeigt es.
- **Mond über Mitternacht (CP1-10):** Ist der Untergang früher als der Aufgang
  (der Mond ist um Mitternacht oben und geht abends wieder auf), gilt nur an
  diesem Tag ein eigenes Fenster: 00:00 bis Mondaufgang + 30 min (mindestens
  Sonnenuntergang + 30 min, höchstens 24:00). Gezeichnet werden zwei Bögen
  gleicher Dauer ((Untergang − Aufgang) mod 24 h): der von gestern (Aufgang −
  24 h bis Untergang) und der von heute (ab Aufgang), beschnitten per
  `clipPath` `#tbMondFenster` auf x 20…580. Die Scheibe steht auf dem Bogen,
  in dem „jetzt“ liegt, sonst keine Scheibe. Die Legende nennt „Aufgang –
  Untergang“, auch wenn der Untergang am Folgetag liegt. Die Sonnenbahn wird
  im längeren Fenster schmaler. Normaltage sind unverändert (Test: Prüfsummen
  des Bogens 06.11.). Mit nur einer Mondzeit bleibt es bei „keine Bahn,
  Zeit wörtlich“.
- **Jetzt-Chip am Rand (CP1-10):** `left: clamp(60px, var(--x), 100% − 60px)`,
  damit er nicht halb abgeschnitten wird; die Bogenposition `--x` bleibt.
- **Ortszeit des Briefing-Orts (CP1-11):** Trägt das Briefing-Objekt aus
  `/api/briefing` `zeitzone` (IANA, z. B. `America/Winnipeg`) und `utcOffsetMin`,
  rechnet „jetzt“ (Chip, Sonnen- und Mondposition, Tag/Nacht, Mond oben) in dieser
  Zone (`heuteJetztMinuten(datum, zone)`); ein Abendbriefing ohne eigene Zone erbt
  die des Morgenbriefings desselben Tages (`heuteBriefingZone()`). Fehlt das Feld,
  ist die Zone unbekannt oder geht sie zur Zeit wie Berlin, bleibt alles wie bisher
  in Europe/Berlin. Bei abweichender Zone (`heuteTagesbogenOrtszeit()`):
  Ortszeile „Winnipeg · Ortszeit MEZ −7 h · 9 h 26 min Tageslicht“ (Abstand aus
  `utcOffsetMin`, sonst aus Intl, gegen den aktuellen Berliner Offset; MEZ/MESZ),
  Chip „jetzt 09:40 · Ortszeit“ bzw. „Nacht · 21:10 · Ortszeit“ (Zusatz in
  10,5 px, Klasse `mit-zone`, Randbegrenzung 90 px). Der Kopfzusatz
  „(Ortszeit, MEZ −7 h)“ wird beim Lesen vom Ortsnamen getrennt (`ortZusatz`) und
  nur einmal gezeigt; ohne Zonenfeld steht er so in der Ortszeile, „jetzt“ in
  Berlin. Der Parser liest neben der Langform auch „Sonne 07:30–16:56“,
  „Neumond 0 %“ und „Mond 08:26–16:36“. Die Geometrie hängt nur von den Zeiten
  im Kopf ab, nicht von der Zone; der 06.11. ist bitgleich (Prüfsummen).
- **Ortszeit robust, Rückfall sichtbar (CP1-12):** Liegt `utcOffsetMin` vor,
  ist „jetzt“ = UTC-Minuten + `utcOffsetMin` (`heuteMinutenAusOffset()`), ohne
  Zeitzonendaten des Browsers; Intl mit `zeitzone` nur, wenn der Abstand fehlt.
  Grund: ICU-tz 2026a (Node 22 und Chromium im Test) kennt die dauerhafte UTC−5
  von Manitoba seit 01.11.2026 nicht und liefert für Winnipeg −6 h (13:30Z →
  07:30 statt 08:30); der Agent liest den Abstand aus tzdata. Abstandstext wie
  der Kopfzusatz des Agenten („MEZ −6 h“, „MEZ +4,5 h“).
  Trägt das Briefing keine Zone und ist der Ort im Kopf nicht der Heimatort
  „Tuttlingen“ (`heuteTagesbogenBerlinHinweis()`), steht in der Ortszeile
  „Winnipeg · Zeiten in Berliner Zeit · …“ (bei Kopfzusatz „(Ortszeit, …)“ bleibt
  dieser) und im Chip „jetzt 18:40 · Berlin“. Am Heimatort und bei einer Zone mit
  Berliner Abstand kein Zusatz. Weicht die Zone ab, heißt die Zustellzeit
  „Zugestellt 07:00 Berlin · Telegram“ (Zustellchip) und „Montag · 07:00 Uhr
  Berlin“ (Bogenkopf). Sonnen- und Mondzeiten werden nie umgerechnet; sie stehen
  so im Bogen, wie der Kopf sie nennt.

## Reisen-Seite v3 „Heute zuerst“ (CP2-0b)

Ersetzt für Reisen mit Reiseblock die Reisen-Karte aus CP2-0 (Abschnitt
darunter gilt für deren Regeln weiter: Fristeinstufung, „heute“ in Ortszeit,
Statuschip der Buchung). Vorlage: Owner-Prototyp
`~/bikosoc-spec/reisen-v3-prototyp.html` (Dropbox
`/Austausch/dashboard-design/reisen-v3-prototyp.html`), übernommen in
Aufbau, Abständen, Farben und Schrift; Farben nur als Tokens aus `design.css`,
Platzhalterzeichen des Prototyps (⌂ ⋯ ↗ ▸) als Sprite-Icons (bed, ellipsis,
external-link, chevron-right). Aufbau per DOM in `public/js/reise-ansicht.js`
(Texte per `textContent`, Links per `createElement('a')` mit geprüfter Adresse
`reiseSichereUrl`: nur http(s) und `tel:` aus Ziffern); Regeln in
`public/js/reise-ableitung.js`, Tests mit `test/fixtures/reise-261107-winnipeg-v20-voll.json`.
Klassen mit Präfix `rv-`. Die alte `.trip-card` (Reisen ohne Reiseblock) ist unverändert.

- **Kopfkarte:** Vorschaubild 56/64 px; Titel = erste → letzte Station
  (`reiseTitelAusStationen`; Zürich/Tuttlingen am Anfang/Ende zählen nicht);
  Untertitel „07.–25.11.2026 · Tag 6 von 19 · {Anlässe}“ (Anlässe aus den
  Klammern des Reisenamens, `reiseAnlaesse`). Rechts Chip Status
  (`-ok` Aktiv, `-info` Geplant, `-neutral` Vergangen) und „{n} überfällig“
  (`-warn`), sonst „{n} offen“ (`-neutral`) bzw. „nichts offen“ (`-ok`); Menü „…“
  mit Bearbeiten, Mit Kalender abgleichen, Verknüpfen, Löschen (Bestätigung
  unverändert). Kein eigener Bearbeiten-Knopf mehr.
- **Stationenband** (das eine besondere Element): Stationen = Orte des
  Verlaufs, Folgetage am selben Ort = ein Aufenthalt; ein Reisetag „A → B“
  gehört zu beiden, bei Nachtflug beginnt B erst am Ankunftstag
  (`reiseStationen`). Linie `--sand`, vergangene Punkte gefüllt, aktuelle
  Station `--sun-core` mit Schein `--sun` (wie die Sonne im Tagesbogen),
  kommende leer. Aktuell = letzte Station, deren Spanne heute enthält (an
  Reisetagen das Ziel). Schrift `--text-soft` statt `--muted` des Prototyps
  (`--muted` auf `--sky-top` nur 4,36:1). Mobil seitlich scrollend, beim Laden
  per `scrollIntoView({inline:'center'})` zur aktuellen Station, ohne
  Animation bei `prefers-reduced-motion`.
- **Die nächsten 36 Stunden** (Navy, `--shadow-lift`): Ereignisse des
  Verlaufs (`reiseEreignisse`: Abflug/Ankunft, Check-in/-out, Buchungstermine,
  Termin-Fristen; eine Frist, die einen Flug desselben Tages nennt, entfällt)
  und Aufgaben mit Uhrzeit im Titel, Zeitpunkt in [jetzt, jetzt + 36 h] in
  Ortszeit, höchstens vier, chronologisch (`reiseNaechste36`). Kopf
  „{Station} · Do 12.11., 20:00 Ortszeit“ (`reiseJetztOrt` aus `utcOffsetMin`,
  sonst „Berliner Zeit“). Untertitel `--on-navy-soft`. Leer: „Nichts
  Dringendes in den nächsten 36 Stunden“. Entfällt bei vergangenen Reisen.
- **Zu erledigen:** offene Aufgaben (Termin-Fristen stehen im 36-h-Fenster),
  überfällige zuerst, höchstens fünf (`reiseZuErledigen`); rechts „überfällig“
  (`--on-red-weak`), „bis Fr“ (≤ 6 Tage), sonst „bis So 15.“. Das Kästchen ist
  Anzeige — ohne Schreibzugriff auf die Reisedatei gibt es keinen
  Erledigt-Mechanismus. Fuß: „Alle {n} Fristen“ (gegliedert wie CP2-0) und
  „Erledigt {n}“ als Chip-Knöpfe. Mobil Aufgabentext höchstens zwei Zeilen.
- **Reiseplan:** eine Zeile je Tag ab heute (Datumsspalte 62 px, heute auf
  `--gold-weak` mit „heute“), Ort fett, Ortswechsel `--accent-dark` mit
  Flugzeug-Icon; Ereignisse mit Uhrzeit (Spalte 44 px) + Titel + Aktions-Chips.
  Unterkunft „{Hotel} · {Spanne}“ (`.rv-hotel-band`) am Tag nach dem Check-in
  und an Tagen ohne Ereignis; offene Hotels/Nächte aus Aufgaben-Fristen als
  „… noch offen“ mit `.chip-warn` „Aufgabe“ (`reiseOffeneUnterkuenfte`). Tage mit
  denselben Buchungsterminen werden ein Block „21.–22.“ (`reisePlan`).
  Vergangene Tage gefaltet: „07.–11. Zürich → Winnipeg · TobaGrown · 5 Tage“.
  Mobil stehen heute + 4 Tage offen, die übrigen als eine Zeile zum Aufklappen;
  am Desktop offen ohne diese Zeile.
- **Aktions-Chips** (`.chip-act`, `--accent-weak`/`--accent-dark`, auf Navy
  14 % Weiß; ↗ = external-link bei Webseiten, phone bei `tel:`) nach
  `reiseAktionenFuer`: „Buchung“ (Flugnummer/Buchungscode einer Buchung →
  Sprung + Aufklappen, kein ↗); Link-Chip „Tagesprogramm“/„Programm“/„Tickets“/
  „Hotel“/„Website“ aus /api/links, Kontakten oder eigener Buchung, deren Titel
  ein Schlüsselwort des Ereignisses trägt — Titel mit dem Datum des Ereignisses
  haben Vorrang; ein Datum allein ordnet nichts zu; „Karte“ (Adresse aus dem
  Kontakt, bei Hotels auch Name + Stadt; `maps.apple.com/?q=`); „Anrufen“
  (`tel:`). Check-out und Ankunft ohne Chips (stehen am Check-in/Abflug). Keine
  Zuordnung → kein Chip.
- **Buchungen:** gruppiert Flüge / Unterkünfte / Tickets / Sonstiges
  (`reiseBuchungsgruppen`); Programmpunkte ohne Betrag mit dem Code einer
  Buchung mit Betrag (QCon Tag 1–3, AGI Tag 1/2) stehen in deren Details.
  Zeile: Titel (Ellipsis), darunter Code (Monospace) · Datum · „von {Person}“ ·
  Chip (Verwalten/Hotel/Programm/Tickets/Website); Betrag rechts `.num` 700.
  Fuß „Summe“ je Währung in Cent gerechnet (`reiseSummen`). Mobil ist die Karte
  zugeklappt (Kopfzeile mit Summe), am Desktop offen.
- **Unterlagen und Kontakte:** Chip-Reiter (Links, Kontakte, Dokumente,
  Einreise, Miles & More, Flugkette, Offene Punkte, Notiz; umbrechend, 40 px,
  Pfeiltasten, gewählter Reiter gemerkt), Standard „Links“. Links aus den
  Kontakten getrennt (`reiseLinksUndKontakte`): mit URL ohne Telefon/Mail →
  Links; mit Telefon/Mail → Kontakte, die URL zusätzlich unter Links. Mobil die
  ersten fünf Einträge und „Alle {n} Links“. Die übrigen Reiter zeigen die
  bisherigen Blöcke unverändert.
- **Fuß:** „Erledigt und Hinweise ({n})“ eingeklappt, „Abgeschlossene Reisen
  ({n})“ im selben Ton.
- **Raster:** unter 1024 px einspaltig in DOM-Reihenfolge, ab 1024 px zweimal
  `minmax(0,7fr) minmax(0,5fr)` (36 h | Zu erledigen; Reiseplan | Buchungen +
  Unterlagen).
- **Höhe** bei 390 px (Uhr 13.11. 04:00Z): 2907 → 2893 px.

## Reisen-Karte (CP2-0)

Gilt für Reisen mit Reiseblock (Import des Reiseassistenten); Bausteine in
`public/js/reise-ansicht.js`, Regeln in `public/js/reise-ableitung.js`
(Tests `test/reise-ableitung.test.mjs`), Stile in `public/css/reise.css`.
Owner-Befund 13.11.2026: „fast überfrachtet, doppelt“. Grundsatz: nichts geht
verloren, alles bleibt aufklappbar; keine Emojis, Icons aus dem Sprite.

- **Kopf:** Vorschaubild (mobil 48 px, ab 1024 px 64 px), Titel, Zeitraum,
  darunter „Tag 6 von 19 · heute Victoria“ (`reiseAktuelleStation`: Ort der
  letzten Verlaufszeile mit Beginn ≤ heute; an einem Reisetag mit Ortswechsel
  keine Station). Die Ortezeile (`destination`) und die Warnchips entfallen.
  Eine Zeile Status „Aktiv“ + Chip „{n} offen“ (`.chip-warn`, bei 0 `.chip-ok`
  „nichts offen“; n = überfällig + kommend) und rechts `.btn-primary`
  „Bearbeiten“ sowie das Menü „…“ (`details.nav-mehr.reise-mehr`, Summary
  `.btn-ghost`) mit „Mit Kalender abgleichen“, „Verknüpfen“, „Löschen“
  (`.btn-danger`, Bestätigung unverändert in `deleteTrip`). Schließt bei Klick
  außerhalb und mit Esc wie „Mehr“ in der Navigation.
- **„heute“** der Reise in Ortszeit: aus `utcOffsetMin` des jüngsten Briefings
  (höchstens 2 Tage alt, `reiseHeuteOrt`), sonst Europe/Berlin.
- **Fristen** (`reiseFristEinstufung`): kommend (fällig ≥ heute), überfällig
  (fällig < heute, Bezugsereignis heute oder später, oder kein Bezug
  erkennbar — im Zweifel offen), vergangen (fällig < heute und Bezug < heute;
  ein Termin ohne Bezug vergeht mit seinem Datum), erledigt. Bezug
  (`reiseFristBezug`) = spätestes Datum aus Flugnummer (fluege[]),
  Buchungscode mit Datum (buchungen[].von/bis) oder „TT.MM.“ im Titel; die
  Notiz zählt für Daten nicht (Bearbeitungsvermerke).
- **Als Nächstes:** höchstens drei kommende Fristen; Überfällige als eine rote
  Zeile „{n} überfällig ▸“; „Alle Fristen ({überfällig+kommend+vergangen})“
  eingeklappt, gegliedert Überfällig / Kommend / Vergangen / Erledigt.
  Vergangene sind nie rot.
- **Reiseverlauf:** während der Reise sind die Zeilen vor heute zu „Sa 07.–Di
  10. · 4 Stationen ▸“ gefaltet (Stationen = Verlaufszeilen, Inhalt
  unverändert); heute mit Punkt `--gold` auf `--gold-weak` und Label „heute“
  (`--on-gold-weak`); kommende Tage offen.
- **Buchungen:** Listenzeilen statt Karten. Zeile 1 Anbieter (Ellipsis) und
  Betrag `.num`, Zeile 2 Code (Monospace) · Datum · Art-Icon (plane, bed,
  ticket, file-text). Klick öffnet die Details (Code mit Kopierknopf, Stand,
  Ausgestellt, Tarif, Ticket, Vielflieger, Notiz, „Buchung verwalten“).
  Statuschip nur bei Abweichung (`reiseBuchungStatusChip`: storniert
  `.chip-err`; offen, Vorschlag, Warteliste `.chip-warn`).
- **Klappabschnitte** als eine Liste (ein Rahmen, Trennlinien): Dokumente,
  Einreise, Kontakte, Miles & More, Offen, Flugkette, Segmente, dazu neu
  „Notiz & Quelle“ (bisher offener Fuß).
- **Erledigt & Hinweise** am Ende, eingeklappt, Schrift 13: alle Chips der
  Reisedatei als `.chip` (green → `-ok`, amber → `-warn`, red → `-err`,
  blue → `-info`), Text bricht um.
- **Raster:** unter 1024 px einspaltig (Kopf → Als Nächstes → Reiseverlauf →
  Buchungen → Klappabschnitte → Erledigt & Hinweise), ab 1024 px
  `minmax(0,7fr) minmax(0,5fr)`; Erledigt & Hinweise über beide Spalten.
- **Kontrast:** `--gold`/`--yellow` und `--red` nie als Text auf den hellen
  Flächen — Fristtage gelb in `--on-gold-weak`, rot in `--on-red-weak`; die
  frühere Dämpfung erledigter Fristen per `opacity: .6` entfällt.
- **Höhe** der aktiven Reise bei 390 px (Uhr 12.11. 22:00Z): 4870 → 2907 px.

## Alpine

`public/vendor/alpine.csp.min.js` ist **Alpine 3.15.12 (CSP-Build)**. In CP1
wird Alpine nicht erweitert; Kopfzeile, Navigation und Tagesübersicht laufen
ohne Alpine.

## Bild-Herkunft

Bildband der Tagesübersicht: vorgesehen ist das LinkedIn-Banner des Owners aus
Dropbox `/Austausch/dashboard-design/` (`linkedin-banner.*`), daraus
`public/img/hero-horizont-m.jpg` (780×424) und `-d.jpg` (2400×400) plus WebP.
Quelle `linkedin-banner.png` (2048×768). Mobil: rechtsbündig ab y 360 (unter dem
Namenszug, der sonst unter der Kopfzeile läge; Spec nannte rechte 55 %) auf
780×424; Desktop: Streifen y 360–701 (Haus und Wasser, ohne
Schriftzug) auf 2400×400. Je JPG Qualität 82 und WebP 82. `HEUTE_BAND_BILD` in
`tagesuebersicht.js` schaltet auf die bildlose Fläche (`--surface-2`) zurück.
