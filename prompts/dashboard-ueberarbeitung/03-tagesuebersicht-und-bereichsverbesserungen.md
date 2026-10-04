# 03 — Phase 2: Tagesübersicht und Bereichsverbesserungen

Beginnt nach **CHECKPOINT 1**. Reihenfolge innerhalb von Phase 2 siehe `00-masterplan.md` §4.
Alle Datei- und Zeilenangaben sind am Stand `735d5b8` geprüft.

---

## P2-5 — Tagesübersicht (Spec §5) — Aufwand L

### Problem
Es gibt keine bereichsübergreifende Startansicht. Die Anwendung startet im Health-Bereich
(`public/index.html:288`: `showTab(urlTab || 'health')`). Der Owner muss 13 Bereiche einzeln
öffnen, um zu sehen, was heute wichtig ist.

### Welche Daten tatsächlich verfügbar sind (lesend geprüft, 04.10.2026)

| Mindestinhalt nach Spec §5 | Verfügbare Quelle | Belegte Lage |
|---|---|---|
| Nächste relevante Termine | `GET /api/calendar` — Graph `calendarView`, **feste 7-Tage-Spanne** (`server.mjs:1262-1263`) | 4 Termine im Fenster. Zeitzonen- und Mehrtagesbehandlung kommt aus P1-5 |
| Priorisierter Handlungsbedarf (Gesundheit) | `GET /api/health/alerts` (`server.mjs:1172-1181`) | liefert echte, bereits deutsche Meldungen mit Schweregrad, z. B. `critical` „Schlaf letzte Nacht nur 4.0h", `warning` „Schlaf unter 6h an 5 von 7 Tagen" |
| Fristen (TÜV) | `GET /api/fleet/vehicles?status=active` → Feld `tuevNextDueDate` | 7 Fahrzeuge; **nächste Frist: Tesla Model 3 am 28.10.2026 (24 Tage)**, danach 2027-04-30 (zwei Fahrzeuge) |
| Ausgefallene oder veraltete Datenquellen | Datenstand-Baustein aus **P1-1** + `GET /api/dashboard/status` | Banking 29.06.2026, SharePoint 16.05.2026, Instagram-Medien 11.05.2026; IB-Gateway-Zustand nach P1-1 korrekt |
| Nebenkosten-Handlungsbedarf | `GET /api/assets/properties/:code/nk-readiness?year=` | kein Objekt ist bereit; Blockerzahlen je Objekt siehe `01-…` P1-6 |
| Direkte Navigation zur Detailansicht | `showTab()` + Deeplink-Parameter | vorhanden |

**Nicht verfügbar — nicht erfinden:**
- `nk_period_obligations` (§556-Pflichten) ist **leer** (0 Zeilen). Der Bereich darf nicht
  „keine Pflichten" meldet, sondern muss „nicht eingerichtet" sagen (Spec §4 G).
- `banking_sync_reminders` ist **leer** (0 Zeilen).
- `workflows` ist **leer** (0 Zeilen) → „Workflows pending: 0" ist keine Aussage über n8n.
- **„Änderungen seit letztem Besuch" hat keine Datengrundlage.** Es gibt keine Tabelle und keinen
  Mechanismus, der Besuche oder Deltas festhält. Umsetzung erfordert **neue Speicherung** —
  nach Spec §5 separat auszuweisen und vom Owner zu entscheiden. Vorschlag für die kleinste
  Variante: Zeitstempel des letzten Besuchs im `localStorage` des Browsers (kein Serverzustand,
  keine neue Tabelle) und Vergleich gegen die vorhandenen `updated_at`-Spalten. Das deckt nicht
  alle Bereiche ab — ehrlicher Umfang, nicht mehr.

### Erwartetes Verhalten
- Startansicht nach dem Anmelden; die 13 Fachbereiche bleiben über die Navigation erreichbar
  und werden nicht ersetzt.
- Reihenfolge nach Wichtigkeit und Fälligkeit, nicht nach Bereich.
- **Keine Kennzahlensammlung.** Keine Doppelung von Warnungen, die im Fachbereich ohnehin stehen.
- **Kein Fantasie-Gesamtscore** über Gesundheit, Finanzen oder Technik.
- Nur tatsächlich verfügbare Daten. Leere Bereiche werden erklärt („§556-Pflichten:
  nicht eingerichtet") oder platzsparend dargestellt — nicht als Erfolg.
- Jede Zeile führt per Klick in die zuständige Detailansicht.
- Veraltete Datenquellen erscheinen als eigener Abschnitt mit Datum und Alter (Baustein aus P1-1).

### Dateien und Komponenten
- **Neu:** `public/js/tagesuebersicht.js` — Laden, Priorisieren, Rendern
- `public/index.html:239-251` — neue erste Navigationsschaltfläche
- `public/index.html:337-346` — `showTab()`-Zuordnung und Standardbereich
- `public/index.html:288` — Standard von `'health'` auf `'heute'` ändern
- `public/js/datenstand.js` (aus P1-1) — Wiederverwendung
- `public/js/zeit.js` (aus P1-5) — Wiederverwendung
- `server.mjs` — **optional** ein sammelnder Endpunkt `GET /api/heute`, der die bereits
  vorhandenen Quellen serverseitig bündelt. Entscheidung im Paket: nur bauen, wenn die Zahl der
  Einzelabrufe im Browser tatsächlich störend ist. Kein neuer Datenspeicher.

### Änderungsumfang
Eine neue Ansicht und ihre Einbindung. **Keine** Änderung an den Fachbereichen, keine neue
Tabelle, kein neuer Dienst, keine zusätzliche Infrastruktur.

### Abnahme
- [ ] Die Tagesübersicht ist die Startansicht; `?tab=health` und alle anderen Deeplinks
      funktionieren weiter.
- [ ] Die TÜV-Frist Tesla Model 3 (28.10.2026) erscheint und ist nach Fälligkeit vor den
      Fristen von 2027/2028 einsortiert.
- [ ] Die beiden Gesundheitswarnungen erscheinen, die kritische vor der Warnung.
- [ ] Die drei veralteten Quellen (Banking, SharePoint, Instagram) erscheinen mit Datum und Alter.
- [ ] §556-Pflichten erscheinen als „nicht eingerichtet", nicht als „keine Pflichten".
- [ ] Kein Gesamtscore, keine reine Kennzahlenwand.
- [ ] Jede Zeile führt in die richtige Detailansicht.
- [ ] Bei 390 px vollständig lesbar, kein Überlauf.
- [ ] Fällt eine Quelle aus, erscheint sie als „nicht abrufbar", nicht als leer-in-Ordnung.

### Tests
- `npm run build` → Exit 0.
- Abgleich der angezeigten Einträge gegen die Rohantworten von `/api/calendar`,
  `/api/health/alerts`, `/api/fleet/vehicles`, `/api/dashboard/status`.
- Browser bei 390 px und 1440 px.
- Regression: alle 13 Fachbereiche weiterhin direkt erreichbar (Spec §7).

### Live-Auswirkung
Nur lesende Abrufe bereits vorhandener Endpunkte. Bei Umsetzung ohne `/api/heute` genügt ein
Browser-Reload; mit neuem Endpunkt ist ein Dienst-Restart nötig.

---

## P2-6 — Wiki-Suchausschnitte (Befund I) — Aufwand S

### Problem und Reproduktion
Beobachtung: Suche „Pflanzliste" fand Seiten, die Ausschnitte zeigten wörtlich
`<b>Pflanzliste</b>` und rohe Markdown-Linksyntax.

**Reproduziert.** Tatsächliche Antwort von `GET /api/wiki/search?q=Pflanzliste` (04.10.2026):

```
{"hits":[{"slug":"pflanzliste-neuhausen","title":"Pflanzliste Neuhausen","category":"Haus Neuhausen",
  "hitType":"page","filename":null,
  "snippet":"<b>Pflanzliste</b>: 1. Mespilus Germanica [https://www.mein-schoener-garten.de/…](https://www.mein-schoener-garten.de/…) 1. Deutzia Rosalind …",
  "rank":0.076}, …]}
```

Zwei Ursachen, die zusammenwirken:

1. **Der Core liefert Hervorhebungs-Markup.** `src/modules/wiki/store.ts:236-237` und `:245-246`:
   ```sql
   ts_headline('german'::regconfig, p.body_md, q.tsq,
               'MaxWords=40, MinWords=15, ShortWord=3, MaxFragments=2') AS snippet
   ```
   `ts_headline` setzt standardmäßig `<b>`/`</b>` und arbeitet auf dem **rohen Markdown**
   (`body_md`) — daher auch die Linksyntax `[Text](URL)` im Ausschnitt.
2. **Das Frontend escaped alles.** `public/js/wiki.js:380`:
   ```js
   <div class="wiki-snippet">${esc(h.snippet)}</div>
   ```
   Richtig und sicher, aber dadurch erscheinen die `<b>`-Tags als Text.

Das Escaping darf **nicht** einfach entfernt werden — Spec §4 I verlangt ausdrücklich
„keine unsichere ungefilterte HTML-Ausgabe".

### Klassifikation
Reproduzierter Funktionsfehler (Darstellung), Ursache vollständig belegt.

### Erwartetes Verhalten
- Saubere Suchausschnitte mit korrekter Hervorhebung des Suchbegriffs.
- Keine Formatierungsreste: kein `<b>`-Text, keine Markdown-Linksyntax, keine Tabellen-Pipes.
- Keine ungefilterte HTML-Ausgabe.
- Struktur bleibt erhalten: Kategorien, Quellenstand, Anhänge, Revisionen, Rücknavigation
  (Spec §7).

### Dateien und Komponenten
- `public/js/wiki.js:380` — Ausschnitt-Darstellung; weitere Trefferfelder `:376-379`
- `public/css/wiki.css` — Klasse `.wiki-snippet`, neue Klasse für die Hervorhebung
- `src/modules/wiki/store.ts:232-263` — **optional**; nur anfassen, wenn die Frontend-Lösung
  nicht reicht

**Lösungsweg (Dashboard-seitig, bevorzugt):** Den Ausschnitt in drei Schritten verarbeiten:
1. Markdown-Linksyntax auf die Beschriftung reduzieren (`[Text](URL)` → `Text`), Listenmarker
   und Tabellen-Pipes entfernen.
2. Den Text **vollständig escapen**.
3. **Danach** die bekannten, vom Core erzeugten Marker `&lt;b&gt;` / `&lt;/b&gt;` durch
   `<mark>` / `</mark>` ersetzen. Da nach Schritt 2 kein beliebiges HTML mehr vorhanden sein
   kann, ist nur diese eine Ersetzung erlaubt — kein Freibrief für Seiteninhalte.

Alternative, falls saubere Trennung gewünscht ist: im Core
`StartSel=\x02, StopSel=\x03` setzen (Steuerzeichen, die nicht im Seiteninhalt vorkommen)
und im Dashboard darauf prüfen. Das ändert aber den Core-Vertrag und ist nur die zweite Wahl.

### Änderungsumfang
Eine JS-Datei, eine CSS-Klasse. Keine Änderung an Wiki-Inhalten, Revisionen oder Anhängen.

### Abnahme
- [ ] Suche „Pflanzliste" zeigt den Begriff hervorgehoben, nicht als `<b>Pflanzliste</b>`.
- [ ] Im Ausschnitt der Seite „Home" erscheint keine Markdown-Linksyntax
      (`[WLAN](/dashboard/wiki/wlan)` → `WLAN`).
- [ ] Ein Suchbegriff, der in einem Anhang-Treffer vorkommt (`hitType: "attachment"`), wird
      ebenso korrekt dargestellt.
- [ ] Ein konstruierter Ausschnitt mit `<script>` oder `<img onerror=…>` im Seitentext wird
      **nicht** als HTML ausgeführt (Prüfung an einer Testseite, die danach gelöscht wird —
      oder rein lesend gegen eine bestehende Seite mit Sonderzeichen).
- [ ] Kategorien, Quellenstand, Anhänge, Revisionen und Rücknavigation unverändert vorhanden.

### Tests
- `npm run build` → Exit 0.
- `curl -s "http://127.0.0.1:18800/api/wiki/search?q=Pflanzliste"` — Rohantwort gegen die
  Darstellung abgleichen.
- Browser: drei verschiedene Suchbegriffe, einer ohne Treffer.
- Regression: Seitenansicht, Bearbeiten, Anhang-Vorschau, Revisionsvergleich unverändert.

### Live-Auswirkung
Nur Darstellung. Browser-Reload genügt. Keine Wiki-Mutation zu Testzwecken, außer einer
eigens angelegten und wieder gelöschten Testseite.

---

## P2-7 — Instagram: Planung und Rohmaterial (Befund J) — Aufwand M

**Vorbedingung:** Owner-Entscheidung Nr. 2 (Masterplan §5) bestimmt den Umfang.

### Problem und Reproduktion

**(a) „→ insta-001" im Content-Plan reagiert nicht.**
`public/index.html:2322`:
```js
<td style="color:var(--muted);font-size:12px">${item.draftId ? '→ ' + esc(item.draftId) : '–'}</td>
```
Reiner Text, kein Link, kein `onclick`. Zusätzlich kommen die Einträge aus
`_INSTA_MOCK.calendar` (`:2121-2127`) — die dort genannten Entwürfe `insta-001`/`insta-002`
existieren im echten Entwurfsbestand (`GET /api/instagram/drafts`) **nicht**. Selbst ein
korrekter Link würde ins Leere führen.

**(b) Unvollständige Datumsangaben.** Überschrift „Content-Kalender — KW 10–11" ist ein festes
Textliteral (`:2312`); die Tagesangaben in `_INSTA_MOCK.calendar` lauten „Mo 03.03" usw. — ohne Jahr.

**(c) Die Schaltfläche „+ Neuen Plan generieren"** (`:2313`) hat **kein** `onclick` → tote Schaltfläche.
Ebenso „↻ Sync" im Kopf (`:2204`).

**(d) Rohmaterialliste unbrauchbar lang.**
`GET /api/instagram/raw` liefert **887 Sessions**. `_instaLoadRaw()` (`public/index.html:2491-2540`)
rendert **alle** als Karten — ohne Suche, ohne Filter, ohne Begrenzung, ohne Vorschaubilder.
Angezeigt wird je Karte nur die technische Session-Kennung (z. B. `jb-0310-64bv`), das
Erstellungsdatum und die Dateizahl. Die Kennungen entstehen in
`server.mjs:864-880` (`generateRawSessionId`) und folgen **nicht** der Projektkonvention
`YYMMDD-<subject>-<ort>` aus `CLAUDE.md`.

### Klassifikation
(a) reproduzierter Funktionsfehler; (b)(c) Darstellungs-/Bedienfehler;
(d) gewünschte Produktverbesserung.

### Erwartetes Verhalten
- Content-Plan-Einträge sind mit vorhandenen Entwürfen verknüpft und führen per Klick dorthin.
- Fehlt eine Verknüpfung, wird das erklärt („kein Entwurf hinterlegt"), nicht als toter Verweis
  dargestellt.
- Alle Datumsangaben vollständig mit Jahr, deutsches Format; Kalenderwochen mit Jahr.
- Tote Schaltflächen sind entweder funktionsfähig oder entfernt bzw. verständlich deaktiviert.
- Rohmaterial ist über Titel, Vorschaubild, Datum, Medientyp und Status erschließbar.
- Suche und Filter vorhanden; Ergebnisanzeige begrenzt (Seitenweise oder „mehr laden").
- Keine Scans, keine Generierungen, keine Veröffentlichungen zu Testzwecken.

### Dateien und Komponenten
- `public/index.html` — `_INSTA_MOCK` `:2105-2134`, Content-Plan `:2309-2326`,
  Kopf mit „↻ Sync" `:2194-2206`, Raw-Material `:2428-2431` und `_instaLoadRaw()` `:2491-2540`
- `server.mjs` — `/api/instagram/raw` `:893-913` (Begrenzung und Suchparameter ergänzen),
  `/api/instagram/drafts` `:659-685`, Session-Kennungen `:864-880`
- Entwurfsbestand als Verknüpfungsziel: `_instaDraftEdit()` existiert bereits

### Änderungsumfang
Instagram-Bereich im Frontend plus zwei lesende Erweiterungen in `server.mjs` (Begrenzung,
Suche). **Nicht** hier: Änderung der Session-Kennungsvergabe (das würde bestehende Daten
betreffen), kein Meta-API-Abruf, keine Veröffentlichung.

### Abnahme
- [ ] Jeder Content-Plan-Eintrag mit Entwurfsverweis öffnet den richtigen Entwurf.
- [ ] Ein Eintrag ohne Entwurf erklärt das ausdrücklich.
- [ ] Alle Datumsangaben enthalten das Jahr.
- [ ] Keine Schaltfläche ohne Wirkung.
- [ ] Rohmaterial: Suche nach einem bekannten Dateinamen findet die Session.
- [ ] Rohmaterial: Filter nach Medientyp und Status wirken.
- [ ] Beim ersten Aufruf werden höchstens 25 Sessions geladen, weitere auf Anforderung.
- [ ] Vorschaubilder erscheinen, wo Bilddateien vorhanden sind.
- [ ] Kein Scan, keine Generierung, keine Veröffentlichung ausgelöst (Gegenprobe:
      `insta_drafts` und die Session-Dateien unverändert).

### Tests
- `npm run build` → Exit 0.
- `curl -s "http://127.0.0.1:18800/api/instagram/raw?limit=25"` → 25 Einträge.
- Browser bei 390 px und 1440 px.
- Regression: Live-Feed, Drafts, Forensic unverändert; Medien-Proxy funktioniert weiter.

### Live-Auswirkung
Lesend. Browser-Reload plus Dienst-Restart wegen `server.mjs`.

---

## P2-8 — Begriffe, Zahlen-/Datumsformate, Barrierefreiheit (Befund M) — Aufwand M

### Problem und Reproduktion (jeweils am Code belegt)

**(a) Reise-Kennungen manuell.** `public/index.html:594-595` verlangt eine Eingabe
„ID (Slug, z.B. tokyo-2026-05)"; `createTrip()` `:623` und `server.mjs:1016` machen sie zur
Pflicht. Die Projektkonvention in `CLAUDE.md` schreibt automatisch erzeugte Kennungen
`YYMMDD-trip-<ort>` vor. Nebenbefund: `createTrip()` springt nach dem Anlegen auf
`showTab('health')` (`:632`) statt in den Reisebereich.

**(b) Deutsch und Englisch gemischt.**

| Anzeige | Stelle |
|---|---|
| Rohwert `residential_permanent` in der Spalte „Typ" | `public/js/assets-vertraege.js:101` — `esc(l.lease_type \|\| '–')`; Übersetzungen existieren nur in den Auswahlfeldern (`:221-222`) |
| „Runs & Statements" | `public/js/assets-nebenkosten.js:95`, `:132` |
| „Noch keine Runs für diese Property/Jahr" | `public/js/assets-nebenkosten.js:466` |
| „NK-Readiness", „NK-Readiness Uebersicht" | `public/js/assets-status.js:52`, `:73` |
| „📁 Raw Material" | `public/index.html:2339` |
| „Obligations", „Audit Viewer" | `public/js/assets-status.js:53-54` |
| Umlaut-Ersatzschreibweisen („Uebersicht", „Zukuenftig", „Zaehler", „TUeV", „Aenderungen") | durchgängig in `assets-*.js`, `fleet-*.js` |

**(c) HRV und Readiness unerklärt.** `public/index.html:828-845` zeigt
„💓 HRV 42 ms" und „🎯 Readiness 78" ohne Skala, Quelle oder Bedeutung. Die Daten kommen
aus Oura (`health_logs.source = 'oura'`, Stand 03.10.2026) — die Quelle wird nicht genannt.
Die Farbschwellen für Readiness (85/70) stehen fest im Code (`:843`) ohne Erläuterung.

**(d) Zahlen- und Datumsformate.** Überwiegend korrekt (`fmtDate`/`fmtDT`/`fmtTime` mit
`de-DE` und `Europe/Berlin`, `index.html:359-361`; `Intl.NumberFormat('de-DE')` im Fuhrpark).
Lücken: `index.html:1676` `f.lastModifiedDateTime.slice(0,10)` (ISO-Datum, wird in P1-4 behoben),
`fmtUsd` und `fmtEur` setzen das Währungszeichen hinter die Zahl ohne geschütztes Leerzeichen
(`:2024`, `:2947`). Die **Zeitzone wird nirgends benannt**, obwohl Spec §4 M sie verlangt.

**(e) Zustände nicht unterschieden.** Es gibt genau zwei Zustandsklassen:
`.spinner` und `.empty` (`index.html:80-81`). „Keine Daten", „keine Treffer",
„nicht eingerichtet", „Laden fehlgeschlagen" und „Daten veraltet" sind nicht unterscheidbar.
Beispiele für die Folge: der Fuhrpark-Archivfilter meldet dasselbe wie ein leerer Bestand
(Befund C); `nk_period_obligations` ist leer und würde als „keine Pflichten" erscheinen
statt als „nicht eingerichtet". Die Klassen entstehen in P2-4; hier werden sie **angewendet**.

**(f) Icon-Schaltflächen ohne zugängliche Namen.** `grep -c "aria-label"` über alle zwölf
Frontend-Dateien → **0**. Umsetzung in P2-4; hier die Durchsicht aller Bereiche.

**(g) Kopfzeile „Hans Dampf".** Hartcodiert in `public/index.html:233` und im Meta-Tag `:10`.
`CLAUDE.md` bezeichnet das System als „Hans_Dampf" — das spricht für Absicht. **Nicht
eigenmächtig ersetzen** (Spec §4 M, Owner-Entscheidung Nr. 6).

### Klassifikation
(a)–(f) gewünschte Produktverbesserung; (g) Owner-Entscheidung.

### Erwartetes Verhalten
- Reise-Kennungen werden nach Konvention automatisch erzeugt; technische Kennungen sind keine
  Pflichteingabe. Ein Feld für eine abweichende Kennung darf optional bleiben.
- Durchgängig deutsche Beschriftungen; Rohwerte aus der Datenbank werden übersetzt, nie
  unübersetzt ausgegeben. Echte Umlaute statt „ae/oe/ue".
- HRV und Readiness werden erklärt: Skala, Quelle (Oura), Bedeutung der Schwellen.
- Zahlen und Datumsangaben im deutschen Format; die Zeitzone wird dort genannt, wo Uhrzeiten
  stehen.
- Die fünf Zustände sind in allen Bereichen unterschieden.
- Icon-Schaltflächen haben zugängliche Namen.

### Dateien und Komponenten
- `public/index.html` — `newTrip()` `:591-613`, `createTrip()` `:615-633`,
  HRV/Readiness `:828-845`, `fmtEur` `:2024`, `fmtUsd` `:2947`, Raw-Material-Beschriftung `:2339`
- `server.mjs` — `POST /api/trips` `:1013-1020` (Kennung serverseitig erzeugen, wenn nicht
  mitgeliefert); `slugifyFleet`/`makeReadableFleetId` `:1708-1718` als vorhandenes Muster
- `public/js/assets-vertraege.js:101`, `:221-222`; `assets-nebenkosten.js:95`, `:132`, `:466`;
  `assets-status.js:52-54`, `:73`; alle Umlaut-Ersatzschreibweisen in `assets-*.js`, `fleet-*.js`
- **Neu:** `public/js/begriffe.js` — gemeinsame Übersetzungstabelle für Datenbank-Rohwerte
  (`lease_type`, `property_type`, `billing_mode`, `status`, `role`, `meter_type`, Dokumenttypen)

### Änderungsumfang
Beschriftungen, Formate, eine Übersetzungstabelle, automatische Reise-Kennung.
Keine Änderung an Datenwerten in der Datenbank, keine Umbenennung bestehender Kennungen.

### Abnahme
- [ ] Eine neue Reise lässt sich ohne Eingabe einer Kennung anlegen; die erzeugte Kennung folgt
      `YYMMDD-trip-<ort>`. Nach dem Anlegen landet man im Reisebereich.
- [ ] Bestehende Reisen behalten ihre Kennungen unverändert.
- [ ] In der Mietvertragstabelle steht „Wohnung unbefristet" statt `residential_permanent`.
- [ ] Kein englischer Oberflächentext mehr in Assets und Fuhrpark; Stichprobe von
      zehn Beschriftungen.
- [ ] Keine Umlaut-Ersatzschreibweise mehr in sichtbarem Text.
- [ ] HRV- und Readiness-Kacheln nennen Skala, Quelle und Bedeutung der Schwellen.
- [ ] Jede Uhrzeitanzeige nennt oder zeigt die Zeitzone.
- [ ] Die fünf Zustände sind in mindestens fünf verschiedenen Bereichen korrekt unterschieden.
- [ ] „Hans Dampf" **unverändert**, solange keine Owner-Entscheidung vorliegt.

### Tests
- `npm run build` → Exit 0.
- `grep -rnE "residential|temporary|Runs & Statements|Property/Jahr|Raw Material|Uebersicht|Zukuenftig|Zaehler" public/js public/index.html`
  → nur noch Treffer in Werten/Kommentaren, nicht in sichtbarem Text.
- Browser-Durchgang durch alle 13 Bereiche.
- Regression: Reise mit vorgegebener Kennung weiterhin anlegbar (Rückwärtskompatibilität des
  Endpunkts).

### Live-Auswirkung
Reise-Anlage schreibt eine Datei unter `artifacts/personal/travel/`. Testreise nach der
Prüfung löschen. Dienst-Restart wegen `server.mjs`.

---

## P2-9 — Banking-Übersicht (Befund K) — Aufwand S

### Problem und Reproduktion
Beobachtung: Konten erscheinen als IBAN und Saldo; Kontozweck, letzter Abruf, Gesamtsaldo und
Umsatzdetails sind nicht erkennbar; Klick auf den Saldo führt zu keiner Detailansicht.

**Reproduziert. Die Daten liegen vor und werden nur nicht angezeigt.**
`GET /api/banking/accounts` (lesend, 04.10.2026) liefert je Konto:
`id, institutionId, iban, accountNumber, accountType, displayName, ownerName, currency,
currentBalance, lastSyncAt, status, createdAt, updatedAt`.

Tatsächlicher Bestand: **12 Konten, davon 2 aktiv**, alle in **EUR**:

| Konto | Status | Saldo | Letzter Abruf |
|---|---|---|---|
| …4295 | aktiv | 16.609,02 € | 29.06.2026 |
| …9268 | aktiv | 1.359,71 € | 29.06.2026 |
| 10 weitere | archiviert | — | — |

`accountType` und `ownerName` sind bei **allen** Konten `null`; `displayName` enthält
jeweils nur die IBAN (Rückfallwert). Ein Kontozweck ist also **nicht in den Daten vorhanden** —
er kann nicht angezeigt werden, ohne ihn zu erfinden.

Anzeige heute: `public/js/banking-connect.js:238-247` zeigt `formatIban(acct.iban)` und
`formatBalance(acct.currentBalance, acct.currency)`. Nicht angezeigt: `lastSyncAt`,
`status`, Summe, Institutsname-Zuordnung über `accountsForInst()`.
Zusätzlich ruft `loadBanking()` (`public/index.html:2908`) **kein** `stamp()` auf — der
Seitenkopf bleibt im Banking-Bereich leer.

Umsätze: Tabelle `banking_transactions` existiert. Ob ein lesender Endpunkt dafür vorhanden ist,
ist **nicht verifiziert** — `GET /api/banking/connections` antwortet mit `Not Found`, die
Core-Routen sind `/api/banking` und `/api/banking/connect`. Vor der Planung einer Umsatzansicht
ist der verfügbare Lesezugriff zu ermitteln.

### Klassifikation
Gewünschte Produktverbesserung; Datenlage vollständig belegt.

### Erwartetes Verhalten
- Je Konto: IBAN, Währung, Status, Saldo und **Datenstand des Saldos** mit Alter.
- Eine Summe über die aktiven Konten — **nur**, weil alle Konten EUR führen. Die Summe nennt
  die Währung ausdrücklich. Sollten später Konten in anderer Währung auftreten, wird je Währung
  getrennt summiert; **niemals unkommentiert addiert**.
- Archivierte Konten sind von aktiven getrennt und standardmäßig eingeklappt.
- Ein Kontoname wird angezeigt, wenn `displayName` vom IBAN abweicht — sonst die IBAN.
  **Keine erfundene Bezeichnung.**
- Der veraltete Datenstand (29.06.2026) ist als solcher gekennzeichnet (Baustein aus P1-1).
- Umsatzansicht nur planen, wenn ein lesender Zugriff tatsächlich existiert; andernfalls als
  offenen Punkt dokumentieren.

### Dateien und Komponenten
- `public/js/banking-connect.js` — `bankingOverviewHtml()` `:190-260`, Kontozeile `:238-247`,
  `accountsForInst()`, `formatBalance()`, `formatIban()`
- `public/index.html:2908-2942` — `loadBanking()`; `stamp()`-Aufruf ergänzen
- `public/js/datenstand.js` (aus P1-1) — Wiederverwendung

### Änderungsumfang
Eine JS-Datei und ein fehlender Aufruf. **Keine** neue Bankverbindung, **keine** Transaktion,
**kein** Synchronisationslauf, keine Core-Änderung.

### Abnahme
- [ ] Beide aktiven Konten zeigen Saldo, Währung „EUR", Status und Datenstand 29.06.2026 mit Alter.
- [ ] Die Summe der aktiven Konten beträgt 17.968,73 € und nennt die Währung.
- [ ] Konten ohne Saldo (`currentBalance: null`) erscheinen als „kein Saldo erfasst", nicht als 0 €.
- [ ] Die 10 archivierten Konten sind getrennt und standardmäßig eingeklappt.
- [ ] Keine erfundene Kontobezeichnung; wo nur die IBAN vorliegt, steht die IBAN.
- [ ] Der Seitenkopf zeigt im Banking-Bereich den Seitenabruf (nicht mehr leer).
- [ ] Keine neue Bankverbindung, keine Transaktion, kein Abruf ausgelöst
      (Gegenprobe: `banking_sync_runs` hat weiterhin 3 Zeilen, letzte vom 29.06.2026).

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/banking-connect.js` → Single-Root-Prüfung.
- `curl -s http://127.0.0.1:18800/api/banking/accounts` — Summe und Anzeige abgleichen.
- Browser bei 390 px und 1440 px.
- Regression: Massenarchivierung und Genehmigungsdialog unverändert; **nicht** ausführen,
  nur Dialog öffnen und abbrechen.

### Live-Auswirkung
Nur Anzeige, nur Frontend. Browser-Reload genügt.

---

## P2-10 — Agentenübersicht (Befund L) — Aufwand M

**Vorbedingung:** Owner-Entscheidung Nr. 5 (Masterplan §5).

### Problem und Reproduktion
`public/index.html:3155-3173` — `loadAgents()` erzeugt eine statische Karte mit einem einzigen
Link auf `https://app.bikobickel.de/n8n/`. Keine Daten, kein `stamp()`, kein Abruf.

### Was sicher verfügbar ist (lesend geprüft, 04.10.2026)

| Quelle | Lage |
|---|---|
| n8n-REST-API | Ein Schlüssel ist in `~/.config/openclaw/env` vorhanden und funktioniert: `GET /api/v1/workflows` → HTTP 200 |
| Workflow-Liste | **4 Workflows, alle `active: false`**: `health-withings-sync-daily` (geändert 16.05.2026), `260509-openclaw-health-check` (16.05.2026), `instagram-token-health-daily` (08.07.2026), `banking-sync-daily` (26.06.2026) |
| Ausführungen | `GET /api/v1/executions` → **0 Einträge**. Es gibt keine Laufhistorie |
| n8n-Datenbank | Für den `openclaw`-App-User **gesperrt** (`permission denied for table execution_entity`) — bewusst so, siehe `CLAUDE.md` Postgres-User-Modell. Ein `GRANT` würde die Trennung schwächen und ist nach Projekt-Overlay ausgeschlossen |
| Tabelle `workflows` in `openclaw_core` | **leer** (0 Zeilen). Die Status-Kachel „Workflows pending: 0" ist daher keine Aussage über n8n |
| Offene Freigaben | Tabelle `approval_tokens` vorhanden; Nutzung für eine Übersicht nicht geprüft |

### Klassifikation
Gewünschte Produktverbesserung. Datenlage belegt, Umsetzung hängt an der Owner-Entscheidung.

### Erwartetes Verhalten
Eine **lesende** Übersicht mit: Name, Aktiv-Zustand, letzte Änderung, letzter erfolgreicher Lauf,
Ergebnis, Fehler, nächste geplante Ausführung, offene Freigaben — jeweils nur, soweit die
Datenlage es trägt. Wo nichts vorliegt (derzeit: Laufhistorie), steht das ausdrücklich dort:
„Keine Ausführungen aufgezeichnet" — nicht „alles in Ordnung".
Der bestehende n8n-Link bleibt erhalten.
Keine neue Berechtigung, keine Ausführung, kein Schreibzugriff.

### Dateien und Komponenten
- `public/index.html:3155-3173` — `loadAgents()`
- `server.mjs` — **neu:** `GET /api/agents/workflows`, lesender Proxy auf
  `127.0.0.1:5678/api/v1/workflows` bzw. `/executions`.
  **Der n8n-Schlüssel bleibt serverseitig** und darf nie in den Browser gelangen —
  derselbe Grundsatz wie bei `CORE_SERVICE_TOKEN` (`server.mjs:76`).
- `public/js/datenstand.js` (aus P1-1) — für den Datenstand der Übersicht

### Änderungsumfang
Eine neue lesende Route und eine neue Ansicht. Kein Schreibzugriff auf n8n, kein `GRANT`,
kein neuer Dienst, keine neue Datenbank.

### Abnahme
- [ ] Alle 4 Workflows erscheinen mit Namen und Aktiv-Zustand (derzeit alle „inaktiv").
- [ ] Der inaktive Zustand ist als solcher sichtbar und nicht grün.
- [ ] „Keine Ausführungen aufgezeichnet" erscheint, weil n8n derzeit keine Historie hat.
- [ ] Der n8n-Schlüssel erscheint nirgends im HTML, in JavaScript oder in einer Netzwerkantwort
      an den Browser (Gegenprobe: Seitenquelle und Netzwerkmitschnitt durchsuchen).
- [ ] Ist n8n nicht erreichbar, erscheint „nicht abrufbar", nicht „keine Workflows".
- [ ] Der bestehende n8n-Link funktioniert weiter.
- [ ] Keine Workflow-Ausführung ausgelöst, kein Workflow aktiviert.

### Tests
- `npm run build` → Exit 0.
- `curl -s http://127.0.0.1:18800/api/agents/workflows` — 4 Einträge, kein Schlüssel in der Antwort.
- Browser bei 390 px und 1440 px.
- Regression: Status-Bereich unverändert.

### Live-Auswirkung
Lesende Abrufe gegen den lokalen n8n-Dienst. Dienst-Restart wegen `server.mjs`.

---

## P2-11 — Immobilien- und Mieterdaten: Darstellung (Befund H) — Aufwand M

**Vorbedingung:** Owner-Entscheidungen Nr. 3 und 4 (Masterplan §5) für alles, was Daten ändert.
Die **Darstellung** kann vorher gebaut werden.

### Problem und Rohdaten (aus `openclaw_core`, 04.10.2026 — nichts geändert)

**(a) Vertrag mit vergangenem Auszug steht auf „Aktiv".**

| Feld | Wert |
|---|---|
`lease_number` | `n24-w6-2024` (id 27) |
`unit_id` | 32 |
`status` | `active` |
`start_date` | 2024-05-15 |
`termination_date` | 2025-11-30 |
`actual_move_out` | **2024-11-15** |

Dieselbe Einheit 32 trägt einen zweiten aktiven Vertrag: `n24-w6-2025` (id 28),
Beginn 2025-12-01. Das ist ein nachvollziehbarer Mieterwechsel — der **Altvertrag wurde nur
nie auf `ended` gesetzt**. Auffällig außerdem: das Auszugsdatum liegt ein Jahr **vor** dem
Kündigungsdatum. Das kann ein Tippfehler sein (2024 statt 2025). **Nicht bewertet, nicht geändert.**

Von allen 17 Mietverträgen steht **jeder** auf `status = 'active'`; es gibt keine einzige Zeile
mit `ended` oder `future`. `n24-w6-2024` ist der einzige mit einem Auszugs- oder Enddatum in
der Vergangenheit.

**(b) Vier Mieterdatensätze mit identischem Namen und Kontakt.**

| `tenants.id` | `tenant_code` | Vertrag | Einheit | Rolle |
|---|---|---|---|---|
| 31 | `bickel-l19w3` | `l19-w3-2016` (id 20) | 25 | `contract_party` |
| 32 | `bickel-l19w4+` | `l19-w4+-2016` (id 21) | 26 | `contract_party` |
| 37 | `jbickel-n24w3` | `n24-w3-2024` (id 24) | 29 | `contract_party` |
| 38 | `jbickel-n24w4` | `n24-w4-2024` (id 25) | 30 | `contract_party` |

Alle vier: Anzeigename „Jürgen Bickel", identische E-Mail. Jeder Datensatz hängt an **genau
einem** Vertrag, jeweils über `lease_tenants` mit `valid_until = NULL`.

Das Datenmodell **unterstützt** mehrere Verträge pro Person: `lease_tenants` ist eine
n:m-Verknüpfung (`lease_id`, `tenant_id`, `role`, `is_primary_contact`, `valid_from`,
`valid_until`). Die vier Datensätze sind also kein Modellzwang, sondern eine Dateneingabe-Folge —
offenbar ein Mieterdatensatz je Vertrag statt einer Person mit vier Verträgen.
Zusätzlich sind die Kennungen uneinheitlich (`bickel-…` vs. `jbickel-…`).
**Duplikat oder Absicht ist nicht bestätigt.** Ob es sich um denselben Menschen handelt oder um
bewusst getrennte Vertragspartner, ist eine fachliche Frage.

### Klassifikation
Beobachtete Datenunklarheit mit fachlichem Entscheidungsbedarf. **Kein** Funktionsfehler.

### Erwartetes Verhalten
- **Keine stillschweigende Zusammenführung, keine stillschweigende Statusänderung.**
- Die Statusdefinition wird in der Oberfläche erklärt: was „Aktiv" bedeutet und in welchem
  Verhältnis es zu `termination_date` und `actual_move_out` steht.
- Mehrere Verträge pro Person werden verständlich dargestellt: in der Mieteransicht erscheinen
  alle Verträge der Person; in der Vertragsansicht alle Vertragsparteien.
- Inkonsistenzen werden **gekennzeichnet**, nicht korrigiert: ein Vertrag mit `status = active`
  und `actual_move_out` in der Vergangenheit trägt einen sichtbaren Hinweis
  („Auszug am 15.11.2024 erfasst, Status weiterhin ‚Aktiv' — Klärung offen").
- Mehrere Datensätze mit identischem Namen und Kontakt werden als möglicher Doppeleintrag
  markiert, mit Hinweis auf die Klärung — ohne Zusammenführungsvorschlag, der ausgeführt wird.
- Eine Übersicht „Klärungsbedarf" listet solche Fälle auf, verlinkt in die Detailansicht und
  sagt, dass die Entscheidung beim Owner liegt.

### Dateien und Komponenten
- `public/js/assets-vertraege.js` — Vertragstabelle `:76-114`, Vertragsdetail
  `assetsOpenLeaseDrawer()` `:196 ff.`
- `public/js/assets-stammdaten.js` — Mieterliste `:107-150`, Mieterdetail
  `assetsOpenTenantDrawer()` `:623 ff.` (hier die Verträge der Person ergänzen)
- `public/js/begriffe.js` (aus P2-8) — Statusbezeichnungen und deren Erläuterung
- Core, lesend: `GET /api/assets/leases`, `GET /api/assets/tenants`,
  `GET /api/assets/leases/:id` — prüfen, ob die Verknüpfungen bereits mitgeliefert werden;
  andernfalls ist ein lesender Zusatzabruf nötig

### Änderungsumfang
Nur Anzeige und Kennzeichnung. **Keine** Schreiboperation, **kein** Zusammenführen,
**keine** Statusänderung, **keine** Datumskorrektur. Alles Datenverändernde bleibt bis zu den
Owner-Entscheidungen 3 und 4 ausgesetzt.

### Abnahme
- [ ] Vertrag `n24-w6-2024` trägt einen sichtbaren Klärungshinweis; `status` in der Datenbank
      ist unverändert `active`.
- [ ] Die Einheit 32 zeigt beide Verträge mit ihren Zeiträumen, sodass der Mieterwechsel
      erkennbar wird.
- [ ] Die Mieteransicht „Jürgen Bickel" zeigt bei allen vier Datensätzen den jeweils zugehörigen
      Vertrag sowie den Hinweis auf mögliche Doppeleinträge.
- [ ] Die Statusbedeutung ist in der Oberfläche erklärt.
- [ ] Eine Übersicht „Klärungsbedarf" listet beide Fälle und benennt den Owner als Entscheider.
- [ ] Gegenprobe nach der Prüfung: `SELECT count(*) FROM leases WHERE status='active'` ergibt
      weiterhin 17; `SELECT count(*) FROM tenants` ergibt weiterhin 26; die vier Mieter-IDs
      31, 32, 37, 38 existieren unverändert.

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/assets-vertraege.js public/js/assets-stammdaten.js` →
  Single-Root-Prüfung.
- Browser bei 390 px und 1440 px.
- Regression: Mietersuche (Stammdaten) und Vertragsfilter (aus P1-3) unverändert funktionsfähig;
  Mieterwechsel-Assistent nicht gestartet.

### Live-Auswirkung
Nur Anzeige. Browser-Reload genügt. Keine Bestandsdatenänderung.

### Rückweg
`git checkout <tag> -- public/js/assets-vertraege.js public/js/assets-stammdaten.js`,
Browser-Reload. Da nichts geschrieben wird, ist kein Datenrückweg erforderlich.
