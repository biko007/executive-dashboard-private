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
Heute-Raster. Auf Heute ab 1024 px sind Wetter und Gesundheit **zwei eigene
Rasterzellen** der rechten Spalte; die Zeilen sind `auto 1fr`. Reicht die
Höhe von Handlungsbedarf/Termine über beide, wächst nur die Gesundheitskarte
(Inhalt oben), Wetter behält seine Höhe — alle drei Spalten enden bündig.

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
