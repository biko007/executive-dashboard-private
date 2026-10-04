# 01 — Phase 1: Verlässlichkeit und Fehlerbehebung

Reihenfolge verbindlich (Spec §9). Ein Commit je Paket. Nach jedem Paket `STATUS.md` fortschreiben.

Alle Datei- und Zeilenangaben sind am Stand `735d5b8` (Tag `pre-dashboard-ueberarbeitung-20261004`)
geprüft. Zeilennummern verschieben sich mit jeder Änderung — vor dem Bearbeiten erneut suchen.

---

## P1-1 — Aktualität und Statuskonsistenz (Befunde A, B) — Aufwand L

### Problem und Reproduktion

**(a) Der „Stand"-Zeitpunkt im Seitenkopf ist der Renderzeitpunkt, nicht das Datenalter.**

`public/index.html:440-442`
```js
function stamp() {
  document.getElementById('lastUpdate').textContent = 'Stand: ' + fmtDT(new Date().toISOString());
}
```
`stamp()` wird am Ende von 13 `load*()`-Funktionen aufgerufen. `showTab()` leert das Feld vorher
(`index.html:343`). `loadBanking()` (`:2908`) ruft `stamp()` nicht auf — dort bleibt der Kopf leer.

Reproduktion: Instagram öffnen. Kopf zeigt die aktuelle Uhrzeit, der Live-Feed darunter meldet
„Zuletzt synchronisiert: vor 146 Tagen".

**(b) Der Instagram-Bereich zeigt zu großen Teilen Demodaten.**

`public/index.html:2105-2134` definiert `_INSTA_MOCK`; `:2174` setzt `const d = _INSTA_MOCK;`.
Daraus gerendert:

| Oberfläche | Quelle | Zeile |
|---|---|---|
| Token-Badge „🔑 Token: 55 Tage" | `_INSTA_MOCK.tokenExpiry = 55` | `:2133`, gerendert `:2203` |
| Tabelle „Top-Beiträge (30 Tage)" mit Jan/Feb-2026-Daten | `_INSTA_MOCK.topPosts` | `:2114-2120`, gerendert `:2282` |
| „Quick Insights" (beste Posting-Zeit, Top-Format, Wachstum) | `_INSTA_MOCK.insights` | `:2132`, gerendert `:2299-2301` |
| Content-Plan inkl. Überschrift „Content-Kalender — KW 10–11" und Tagesangaben „Mo 03.03" ohne Jahr | festes Textliteral + `_INSTA_MOCK.calendar` | `:2312`, `:2121-2127` |
| Analyse-Unterbereich: Follower-Entwicklung, Engagement-Rate, Performance nach Content-Typ | `_INSTA_MOCK.followerHistory`/`.engagementHistory` + Inline-Literal `ctPerf` | `:2371-2393` |
| Absatz unter der Überschrift „🤖 KI-Empfehlung" | **festes Textliteral, keine KI-Ausgabe** | `:2415-2418` |

Echt sind dagegen: Live-Feed (`/api/instagram/media`), KPI-Kacheln Follower/Engagement/Ø Likes/Beiträge
(`/api/instagram/insights`), Drafts, Forensic und Raw Material.

**(c) Drei verschiedene Datenalter im selben Bereich, keines gekennzeichnet.**

Gemessen am 04.10.2026:

| Quelle | Datei/Tabelle | Stand | Alter |
|---|---|---|---|
| Instagram-Medien | `artifacts/personal/instagram/media-cache.json`, `fetched_at` | 11.05.2026 | 146 Tage |
| Instagram-Insights | `insights-cache.json`, `fetched_at` | 27.06.2026 | 99 Tage |
| Instagram-Forensic | `spike-forensic-v2-2026-05-08.json`, `analysis_date` | 08.05.2026 | 149 Tage |
| Banking-Salden | `banking_sync_runs`, letzter `SUCCESS_FULL` | 29.06.2026 | 97 Tage |
| SharePoint | `sharepoint_sync_runs` (ein einziger Lauf) | 16.05.2026 | 141 Tage |
| Health | `health_logs` (Oura/Withings) | 03./04.10.2026 | 0–1 Tag |
| Kalender, Trading, Token-Status | Live-Abruf | — | aktuell |

Der Hinweis „Zuletzt synchronisiert: vor 146 Tagen" (`index.html:2245-2256`) ist **korrekt gerechnet**
und ist der einzige Alterhinweis im ganzen Dashboard.

**(d) Widersprüchlicher IB-Gateway-Status.**

Reproduktion (lesende Abrufe gegen `127.0.0.1:18800`):
```
GET /api/trading/status    → {"connected":true,"paperMode":true,"account":"DUP514636", …}
GET /api/dashboard/status  → services[…{"name":"IB Gateway","status":"down"}…]
GET 127.0.0.1:18793/health → {"ok":true,"service":"trading-agent","connected":true,"uptime":1380814}
```

Ursache, zwei Teile, beide in `executive-agent/index.ts` im Handler `/api/system-status`:

1. **Feldname-Fehler.** `index.ts:3456`:
   ```ts
   ibOk = data.ibkr?.connected === true;
   ```
   Der Trading-Service liefert `connected` auf oberster Ebene (`trading-agent/src/index.ts:940-942`),
   kein `ibkr`-Objekt. `data.ibkr` ist `undefined` → `ibOk` ist immer `false`.
2. **Vorrang einer veralteten Datenbankzeile.** `index.ts:3460-3461`:
   ```ts
   const ibEntry = services.find(s => s.name === 'IB Gateway');
   if (!ibEntry) services.push({ name: 'IB Gateway', status: ibOk ? 'up' : 'down', … });
   ```
   Das Ergebnis der Live-Prüfung wird nur verwendet, wenn **keine** Zeile in `service_health`
   existiert. Derzeit existiert keine, der Pfad greift also — aber sobald eine Zeile angelegt wird,
   gewinnt dauerhaft der gespeicherte Zustand. Die vorhandenen vier Zeilen (`Core`, `Dashboard`,
   `Trading`, `n8n`) stehen alle auf `up` mit `last_change` vom 11.05.2026 bzw. 03.07.2026 — die
   angezeigten „Uptime"-Werte von 146 Tagen sind also keine echte Laufzeitmessung, sondern das
   Alter der Datenbankzeile.

**(e) Token-Laufzeit 55 vs. 59 Tage — keine zwei Quellen.**

`insta_tokens` enthält genau eine aktive Zeile (ID 210, `rotated_at` 03.10.2026,
`expires_at` 02.12.2026) → 59 Tage. Der Status-Bereich liest diesen Wert
(`index.ts:3463-3473`, Anzeige `index.html:3473-3474`) und ist **korrekt**.
Die „55 Tage" im Instagram-Bereich sind der hartcodierte Mock-Wert.

**(f) Zeitpläne sind inaktiv — Hauptgrund für die Datenalter aus (c).**

n8n-API (lesend, bestehender Schlüssel): alle vier Workflows `active: false`,
`GET /api/v1/executions` liefert **null** Einträge:
`banking-sync-daily`, `instagram-token-health-daily`, `health-withings-sync-daily`,
`260509-openclaw-health-check`.
Tabelle `workflows` in `openclaw_core` ist leer → die Kachel „Workflows pending" zeigt dauerhaft 0.

### Klassifikation
- (a), (c): beobachtete Daten-/Darstellungsunklarheit
- (b), (e): reproduzierter Funktionsfehler (Demodaten in Produktivansicht)
- (d): reproduzierter Funktionsfehler
- (f): Datenlage mit Owner-Entscheidungsbedarf (Masterplan §5 Nr. 1)

### Erwartetes Verhalten
1. Der Seitenkopf nennt nicht mehr „Stand", sondern eindeutig den **Seitenabruf**
   („Seite geladen: 04.10.2026, 18:42 (Europe/Berlin)").
2. Jede Ansicht, die auf einen Cache oder einen Synchronisationslauf zurückgeht, zeigt sichtbar
   **Datenstand** und **letzten erfolgreichen Quellenabgleich** mit absolutem Datum und Alter.
3. Daten, die älter als eine je Bereich definierte Schwelle sind, werden mit **Text und Symbol**
   als veraltet gekennzeichnet — nicht nur farblich.
4. Demodaten sind entweder eindeutig als „Demodaten — keine echten Zahlen" gekennzeichnet oder
   ausgeblendet (Owner-Entscheidung Nr. 2). Der Absatz „🤖 KI-Empfehlung" trägt bis zum Ersatz
   keinen KI-Hinweis mehr.
5. Der IB-Gateway-Zustand stimmt mit `127.0.0.1:18793/health` überein; Paper-Trading bleibt
   eindeutig gekennzeichnet.
6. Die Zustände „erreichbar", „Daten aktuell", „degradiert", „getrennt", „unbekannt" sind
   unterscheidbar. Fehlende Statusdaten erscheinen **nicht** als Erfolg.
7. Der Status-Bereich zeigt zu jedem Dienst den **Prüfzeitpunkt** und — wo der Zustand aus der
   Datenbank stammt — dass es ein gespeicherter Zustand ist.

### Dateien und Komponenten
- `public/index.html` — `stamp()` `:440-442`; Kopfzeile `:230-236`; `showTab()` `:337-346`;
  Instagram `:2105-2134`, `:2174`, `:2203`, `:2245-2256`, `:2280-2326`, `:2370-2419`;
  Status-Bereich `:3440-3520`; Banking `:2908` (fehlender Aufruf)
- **Neu:** `public/js/datenstand.js` — gemeinsamer Baustein: `datenstandBadge({quelle, stand, schwelleTage, hinweis})`,
  `altersText(iso)`, `zustandsLabel(code)`. Wird von P2-5 (Tagesübersicht) wiederverwendet.
- `public/css/assets.css` — Stilklassen für die Badges (kein `<style>` in Template-Strings, siehe
  `CLAUDE.md` Alpine-CSP-Regel 3)
- `server.mjs` — `/api/instagram/media` `:552-561`, `/api/instagram/insights` `:589-598`,
  `/api/instagram/forensics` `:602-629`: jeweils `fetched_at`/`analysis_timestamp` **und** den
  Dateizeitstempel als `datenstand` mitliefern, damit das Frontend nicht raten muss.
  `/api/dashboard/status` `:2144-2161`: `_stale`-Flag und Cache-Alter an das Frontend durchreichen
  (das Feld wird heute gesetzt, aber nirgends angezeigt).
- `executive-agent/index.ts:3451-3461` — **Red-Zone-Pfad.** Zwei Zeilen: `data.ibkr?.connected`
  → `data.connected`, und die Live-Prüfung muss die Datenbankzeile überschreiben statt
  nachrangig zu sein. Dafür gilt die Push-Regel aus Masterplan §2 (Red-Zone).

### Änderungsumfang
Begrenzt auf: Kopfzeile, einen neuen Anzeigebaustein, dessen Einbindung in Instagram, Banking,
SharePoint und Status, das Kennzeichnen der Demodaten, sowie die zwei Zeilen im Core.
**Nicht** in diesem Paket: Ersatz der Demodaten durch echte Daten (P2-7), Reaktivierung von
Zeitplänen (Owner), Umbau des Status-Bereichs (P2).

### Abnahme
- [ ] Der Seitenkopf verwendet das Wort „Stand" nicht mehr allein; Beschriftung nennt den Seitenabruf.
- [ ] Instagram zeigt für Medien, Insights und Forensic je ein eigenes Datum mit Alter.
- [ ] Die Tabelle „Top-Beiträge (30 Tage)" steht nicht mehr unkommentiert als Zeitraumanalyse da.
- [ ] Der Text unter „KI-Empfehlung" trägt keinen KI-Anspruch, solange er fest hinterlegt ist.
- [ ] Trading-Bereich und Status-Bereich melden denselben IB-Gateway-Zustand.
- [ ] Der Instagram-Token-Wert stimmt mit dem Status-Bereich überein (beide 59 Tage am 04.10.2026).
- [ ] Banking zeigt den Datenstand 29.06.2026 sichtbar und als veraltet gekennzeichnet.
- [ ] Eine frisch geladene Seite lässt alte Quelldaten nicht aktuell erscheinen.
- [ ] Bei ausgefallener Statusquelle erscheint „unbekannt", nicht „in Ordnung".

### Tests
- `npm run build` → Exit 0.
- `curl -s http://127.0.0.1:18800/api/dashboard/status` → `IB Gateway` steht auf `up`, solange
  `127.0.0.1:18793/health` `connected: true` meldet. Gegenprobe nicht durch Abschalten des
  Trading-Dienstes, sondern durch Lesen beider Endpunkte.
- Browserprüfung Instagram, Banking, Status, Trading bei 1440 px und 390 px.
- Regression: alle 13 Bereiche öffnen, kein JavaScript-Fehler in der Konsole.

### Live-Auswirkung
Nur Anzeige. Keine Datenänderung, kein externer Abruf, keine Synchronisation.
Der Core-Restart (wegen `index.ts`) unterbricht Gateway-Funktionen für wenige Sekunden —
außerhalb der Telegram-/n8n-Stoßzeiten ausführen.

### Rückweg
`git revert <commit>` im Dashboard-Repo; für den Core zusätzlich `npm run build` und
`systemctl --user restart openclaw-gateway.service`. Frontend allein:
`git checkout <tag> -- public/`, Browser-Reload.

---

## P1-2 — Fuhrparkfilter (Befund C) — Aufwand S

### Problem und Reproduktion
Spec §4 C, am Livesystem bestätigt: Fuhrpark öffnen (7 Fahrzeuge) → „Archiviert" (leer) →
„Alle" (bleibt leer) → „Aktiv" (bleibt leer) → Bereich verlassen und erneut öffnen (Fahrzeuge
wieder da).

**Das Backend ist nachweislich korrekt.** Lesende Abrufe am 04.10.2026:

| Abruf | HTTP | Ergebnis |
|---|---|---|
| `GET /api/fleet/vehicles?status=active` | 200 | 7 Fahrzeuge, alle `status: "active"` |
| `GET /api/fleet/vehicles?status=archived` | 200 | `[]` (es gibt tatsächlich keine archivierten) |
| `GET /api/fleet/vehicles?status=all` | 200 | 7 Fahrzeuge |

Der Fehler liegt im Frontend-Rendern. Beteiligte Stellen:

`public/js/fleet-stores.js:106-125` `loadVehicles()` setzt `this.loading = true`, lädt, setzt
`this.loading = false` und ruft dann `this.$nextTick(() => this._renderList())`.

`public/js/fleet-stores.js:129-132` `switchStatus()` ruft `loadVehicles()`, der Zustand `loading`
wechselt dabei `false → true → false`.

`public/index.html:1840-1855` — die Liste hängt in zwei geschachtelten Alpine-Templates:
```
<template x-if="loading">…
<template x-if="error">…
<template x-if="!loading && !error"><div>
  <template x-if="!selectedVehicle"><div>
    … Filterleiste …
    <div x-ref="fleetListContent"></div>
```
Beim Zwischenschritt `loading = true` baut Alpine den gesamten `!loading && !error`-Teilbaum ab
(`x-if` → `destroyTree` → das `x-ref` wird aus `_x_refs` entfernt) und beim Rücksprung aus dem
unveränderten Template-Inhalt **neu** auf — also mit einem leeren `<div x-ref="fleetListContent">`.

`public/js/fleet-stores.js:153-155`
```js
_renderList() {
  const el = this.$refs.fleetListContent;
  if (!el) return;          // stiller Abbruch
```
Findet die Methode das Element nicht oder trifft sie den abgebauten Knoten, bricht sie **ohne
jede Meldung** ab. Beim ersten Öffnen tritt der Zwischenschritt nicht auf (`loading` ist schon
`true`), deshalb funktioniert nur der Erstaufbau.

**Noch nicht verifiziert:** welcher der beiden Fälle zutrifft (Element nicht gefunden vs.
abgebauter Knoten). Das lässt sich nur im Browser unterscheiden. Für die Behebung ist das
unerheblich — beide Fälle verschwinden, wenn das Rendern nicht mehr von einem `x-ref` innerhalb
eines auf- und abgebauten `x-if`-Teilbaums abhängt.

Zusatzbefund: der leere Zustand meldet nur „Keine Fahrzeuge gefunden." (`fleet-stores.js:157`) —
ohne zu sagen, dass gerade der Archiv-Filter aktiv ist.

### Klassifikation
Reproduzierter Funktionsfehler. Ursache eingegrenzt, Auslösemechanismus browserseitig zu bestätigen.

### Erwartetes Verhalten
- Aktiv → Archiviert → Alle → Aktiv funktioniert ohne erneuten Bereichsaufruf.
- Der Filter verändert nur die Auswahl, nie die Gesamtliste.
- Ein leeres Archiv zeigt eine ausdrückliche Erklärung („Keine archivierten Fahrzeuge. Der Filter
  ‚Archiviert' ist aktiv — ‚Alle' zeigt alle 7 Fahrzeuge.") mit Schaltfläche zum Zurücksetzen.
- Die Trefferzahl ist je Filter sichtbar.
- Ein stiller Abbruch ist nicht mehr möglich: schlägt das Rendern fehl, erscheint ein Fehlerzustand.

### Dateien und Komponenten
- `public/js/fleet-stores.js` — `loadVehicles()` `:106-125`, `switchStatus()` `:129-132`,
  `_renderList()` `:153-194`
- `public/index.html` — Fuhrpark-Template `:1836-1897`

**Empfohlener Lösungsweg (kleinste robuste Änderung):**
Den Ladezustand nicht mehr über das Ab- und Aufbauen des Listenteilbaums abbilden. Zwei Varianten,
Variante 1 bevorzugt:

1. Das Element mit `x-ref="fleetListContent"` **aus** dem `x-if`-Teilbaum herausziehen und
   dauerhaft im Template halten; Lade- und Fehlerzustand mit `x-show` (ohne DOM-Abbau) statt
   `x-if` steuern. Dann kann der Verweis nicht verlorengehen.
2. Alternativ auf `x-ref` verzichten und das Ziel beim Rendern frisch suchen
   (`this.$el.querySelector('[data-fleet-list]')`), mit sichtbarem Fehlerzustand, wenn es fehlt.

Beide Varianten lassen die Backend-Abfrage und die Fahrzeugdaten unberührt.

### Änderungsumfang
Eine JS-Datei und ein Template-Abschnitt in `index.html`. Keine Änderung an Core, Datenbank
oder Fahrzeugdaten. Kein Umbau der Detailansicht.

### Abnahme
- [ ] Vier Filterwechsel in Folge ohne Bereichswechsel: Liste jedes Mal korrekt.
- [ ] „Archiviert" zeigt eine erklärende Leermeldung mit Rücksetzen-Schaltfläche.
- [ ] „Alle" und „Aktiv" zeigen beide 7 Fahrzeuge.
- [ ] Trefferzahl sichtbar.
- [ ] Die 7 Fahrzeuge sind unverändert (Code, Kennzeichen, KM-Stand, TÜV-Datum stichprobenartig geprüft).
- [ ] Detailansicht öffnen und zurück funktioniert weiterhin; `?fleet_code=`-Deeplink funktioniert.
- [ ] Jede `x-if` im geänderten Template hat genau ein direktes Kindelement.

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/fleet-stores.js public/index.html` → Single-Root-Prüfung.
- Browser: schnelle Filterwechsel hintereinander; kein veraltetes Ergebnis.
- Regression: Assets- und Banking-Bereich (nutzen dasselbe Alpine-Muster) unverändert bedienbar.

### Live-Auswirkung
Nur Anzeige, nur Frontend. Kein Restart nötig, Browser-Reload genügt.

### Rückweg
`git checkout <tag> -- public/js/fleet-stores.js public/index.html`, Browser-Reload.

---

## P1-3 — Mietvertragsfilter und Suche (Befund D) — Aufwand M

### Problem und Reproduktion
Stelle: Assets → Verträge & Kosten → Mietverträge.
Reproduktion laut Spec: Auswahl „I83" ließ alle 17 Zeilen sichtbar; Suche `zzzzAuditKeinTreffer`
ließ alle Zeilen sichtbar; Enter und Abwarten ohne Wirkung.

**Ursache eindeutig am Code belegt — die Filterung wurde nie implementiert.**

`public/js/assets-vertraege.js:191-193`
```js
function vertraegeFilter() {
  // Future: implement client-side filtering
}
```
Diese leere Funktion ist als `onchange`/`oninput`-Handler an alle drei Bedienelemente gebunden
(`:80`, `:84`, `:90`).

`public/js/assets-vertraege.js:116-118`
```js
_filteredLeases() {
  return this.leases;
},
```
Gibt die Liste ungefiltert zurück.

`public/js/assets-vertraege.js:14-18` deklariert `filterProperty`, `filterStatus`, `filterYear`,
`searchTenant` — **keines dieser Felder wird irgendwo gelesen oder geschrieben.**

Zusatzbefund in derselben Tabelle: `:101` gibt `esc(l.lease_type || '–')` direkt aus, also
Rohwerte wie `residential_permanent`. Das ist Teil von Befund M und wird in P2-8 behandelt;
hier nur erwähnt, weil die Spalte im gleichen Paket angefasst wird.

**Wichtig für die Abnahme (Rohdaten aus `openclaw_core`, 04.10.2026):**
- 17 Mietverträge, **alle** mit `status = 'active'`. Es existiert keine Zeile mit `ended` oder `future`.
  Der Statusfilter liefert für „Beendet" und „Zukünftig" also korrekt **null Treffer** — das ist
  kein Fehler, sondern der Bestand. Siehe auch Befund H / P2-11.
- Objekt **I83** (`properties.code = 'i83'`) hat genau **einen** Vertrag: `i83-w1-2025`,
  Einheit `unit_id 38`, Beginn 01.05.2025. „I83" muss also genau **eine** Zeile zeigen.

Zum Vergleich: die Mietersuche unter Stammdaten funktioniert, weil sie tatsächlich filtert —
`public/js/assets-stammdaten.js:155-161` setzt `row.style.display` anhand eines
`data-search`-Attributs. Dieses Muster ist die Vorlage.

### Klassifikation
Reproduzierter Funktionsfehler (nicht implementierte Funktion), Ursache vollständig belegt.

### Erwartetes Verhalten
- Objektfilter, Statusfilter und Textsuche wirken und sind **kombinierbar**.
- Die Textsuche berücksichtigt Mieternamen, Objekt und Einheit.
- Trefferzahl wird angezeigt („3 von 17 Verträgen").
- Eine Schaltfläche „Filter zurücksetzen" stellt die vollständige Liste wieder her.
- Null Treffer zeigen einen verständlichen Leerzustand, der die aktive Einschränkung nennt —
  nicht „keine Daten".
- Schnelle Filterwechsel erzeugen keine veralteten Ergebnisse.

### Dateien und Komponenten
- `public/js/assets-vertraege.js` — Zustand `:14-18`, `_renderLeases()` `:76-114`,
  Bedienelemente `:79-91`, `_filteredLeases()` `:116-118`, `vertraegeFilter()` `:191-193`
- `public/js/assets-stammdaten.js:155-161` — Referenzmuster (nicht ändern)
- Ggf. `public/css/assets.css` für Trefferzahl und Leerzustand

**Lösungsweg:** Filterung im Alpine-Zustand halten (`filterProperty`, `filterStatus`,
`searchTenant` tatsächlich benutzen), `_filteredLeases()` implementieren und `vertraegeFilter()`
die Werte aus den Bedienelementen in den Zustand schreiben und neu rendern lassen. Serverseitige
Filterung ist bei 17 Zeilen unnötig.

### Änderungsumfang
Eine JS-Datei. Keine Änderung an Core, Datenbank oder Vertragsdaten. Keine Änderung der
anderen vier Unterbereiche (Ausgaben, Verteilungsschlüssel, Zähler, Sammelablesung) —
dort hängen die Auswahlfelder an eigenen Ladefunktionen und funktionieren.

### Abnahme
- [ ] Auswahl „I83" zeigt genau **einen** Vertrag (`i83-w1-2025`).
- [ ] Suche `zzzzAuditKeinTreffer` zeigt **null** Treffer mit verständlichem Leerzustand.
- [ ] Zurücksetzen stellt alle 17 Verträge wieder her.
- [ ] Statusfilter geprüft: „Aktiv" → 17, „Beendet" → 0, „Zukünftig" → 0, mit Leerzustand-Erklärung.
- [ ] Objektfilter und Textsuche gemeinsam angewandt ergeben die Schnittmenge.
- [ ] Trefferzahl stimmt mit der Zeilenzahl überein.
- [ ] Schneller Wechsel zwischen drei Objekten hintereinander: Endzustand korrekt.
- [ ] Klick auf eine Zeile öffnet weiterhin das richtige Vertragsdetail.
- [ ] Kein Vertragsdatensatz verändert (Gegenprobe: `GET /api/assets/leases` liefert weiterhin 17 Zeilen).

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/assets-vertraege.js` → Single-Root-Prüfung.
- Browser bei 1440 px und 390 px.
- Regression: Stammdaten-Mietersuche weiterhin funktionsfähig; die vier anderen Unterbereiche
  unverändert.

### Live-Auswirkung
Nur Anzeige, nur Frontend. Browser-Reload genügt.

### Rückweg
`git checkout <tag> -- public/js/assets-vertraege.js`, Browser-Reload.

---

## P1-4 — SharePoint-Datenzuordnung und Linkbildung (Befund E) — Aufwand M

### Problem und Reproduktion
Beobachtung: „Öffnen ↗" bei einer PDF öffnete einen weiteren Dashboard-Tab statt des Dokuments;
Dokumentlinks mit leeren Zielen; Site-Übersicht ohne Site-Namen; Änderungsdaten „–";
gleichnamige Dateien ohne Ordnerkontext.

**Ursache eindeutig: Feldnamen passen seit Sprint 10 nicht mehr.** Der Core liefert seine
Daten aus Postgres in `snake_case` (`src/modules/sharepoint/store.ts:29-45`), das Frontend
liest weiterhin die Microsoft-Graph-Namen in `camelCase`.

Tatsächliche Antworten (lesend abgerufen am 04.10.2026):

| Endpunkt | Gelieferte Felder |
|---|---|
| `GET /api/sharepoint/sites` | `site_id`, `site_name`, `file_count` |
| `GET /api/sharepoint/drives/:siteId` | `drive_id`, `drive_name`, `file_count` |
| `GET /api/sharepoint/files/:siteId/:driveId` | `id`, `sp_item_key`, `graph_item_id`, `name`, `path`, `web_url`, `size`, `mime_type`, `last_modified_at`, `created_at_remote`, `site_name`, `site_id`, `drive_name`, `drive_id`, `missing_since` |
| `GET /api/sharepoint/search?q=` | wie `files` |

Gegenüberstellung mit dem Frontend:

| Stelle | gelesen | geliefert | Folge |
|---|---|---|---|
| `index.html:1559` `onclick="spOpenSite('${esc(s.id)}')"` | `s.id` | `site_id` | leere Site-ID → nachfolgender Drives-Abruf scheitert |
| `index.html:1560` | `s.displayName` | `site_name` | Site-Name fehlt |
| `index.html:1561` | `s.description` | — | immer „–" |
| `index.html:1562` `href="${esc(s.webUrl)}"` | `s.webUrl` | — | `href=""` → **Browser lädt die aktuelle Seite neu**, daher der zweite Dashboard-Tab |
| `index.html:1589-1593` | `d.id`, `d.name`, `d.driveType`, `d.webUrl` | `drive_id`, `drive_name` | Bibliotheksname und Typ fehlen, Link leer |
| `index.html:1676` | `f.lastModifiedDateTime` | `last_modified_at` | Änderungsdatum immer „–" |
| `index.html:1679` | `f.downloadUrl` | — | Download-Schaltfläche erscheint nie; es wird immer der defekte „Öffnen"-Link gezeigt |
| `index.html:1681`, `:1753` | `f.webUrl`, `h.webUrl` | `web_url` | `href=""` → Dashboard statt Dokument |
| `index.html:1672-1675` | `f.isFolder`, `f.childCount` | — | Ordner nicht navigierbar; die Liste ist flach |
| — | `path` wird geliefert | — | Ordnerkontext vorhanden, aber nicht angezeigt → gleichnamige Dateien ununterscheidbar |
| `index.html:1639-1646`, `:1742-1744` | Sortierung über `lastModifiedDateTime` | `last_modified_at` | Sortierung nach Datum wirkungslos |

Zusätzlich gefunden, nicht aus Spec §4 E, aber in derselben Funktion:
`index.html:1748` fügt `h.summary` **ohne `esc()`** in das HTML ein. Das Feld existiert in der
aktuellen Core-Antwort nicht, der Pfad ist heute also inaktiv — die Stelle ist aber eine
HTML-Einfügelücke und wird in diesem Paket mitgeschlossen.

Datenlage: ein einziger Sync-Lauf am 16.05.2026, 12.089 Dateien, 10 Sites, 10 Drives.
Die Site-Liste enthält zwei Einträge mit derselben `site_id`
(`bikolino.sharepoint.com,a932d186-…`) — einer mit leerem Namen und `file_count: 1`,
einer als „bikolino GmbH" mit `file_count: 11160`. Dasselbe bei den Drives. Siehe
Owner-Entscheidung Nr. 8.

### Klassifikation
Reproduzierter Funktionsfehler, Ursache vollständig belegt.

### Erwartetes Verhalten
- Stichproben verschiedener Dokumentarten öffnen das richtige Ziel in SharePoint.
- Ein fehlendes Ziel führt **nie** zum Dashboard: ohne `web_url` wird die Aktion verständlich
  deaktiviert („Kein Link hinterlegt").
- Site-Name, Bibliotheksname, Dokumentpfad und Änderungsdatum werden angezeigt, soweit vorhanden.
- Gleichnamige Dokumente sind über den Pfad unterscheidbar.
- Sortierung nach Name und nach Änderungsdatum wirkt.
- Die Volltextsuche bleibt unverändert funktionsfähig, inklusive „Keine Ergebnisse".
- Keine Änderung an Freigaben oder Berechtigungen.

### Dateien und Komponenten
- `public/index.html` — `loadSharePoint()` `:1497-1526`, `renderSPSites()` `:1556-1568`,
  `spOpenSite()` `:1570-1582`, `renderSPDrives()` `:1584-1598`, `spOpenDrive()` `:1600-1620`,
  `spSortItems()` `:1636-1650`, `renderSPFiles()` `:1652-1702`, `spSearch()` `:1725-1735`,
  `renderSPSearchHits()` `:1737-1771`
- `server.mjs` — Proxy-Routen `:1597-1602` (unverändert), Download `:1605-1621`,
  Upload `:1623-1681` (unverändert)

**Lösungsweg:** Eine Normalisierungsfunktion im Frontend, die die Core-Antwort einmalig auf
ein internes Format abbildet (`{ id, name, url, pfad, geaendertAm, groesse, typ }`), und alle
Renderfunktionen darauf umstellen. Damit bleibt genau eine Stelle für künftige Feldwechsel.
Ordnernavigation: der Core liefert heute eine flache Dateiliste mit `path` — statt einer
Ordnerhierarchie wird der Pfad als Spalte angezeigt und die Breadcrumb-Logik auf das reduziert,
was die Daten tragen. Keine Ordnerhierarchie erfinden.

### Änderungsumfang
Ein Abschnitt in `index.html` (SharePoint-Bereich). Keine Änderung am Core, am Sync, an
`sharepoint_files` oder an Graph-Berechtigungen. Keine Ausführung von
`POST /api/sharepoint/cleanup-missing` (Owner-Entscheidung Nr. 8).

### Abnahme
- [ ] Mindestens drei Stichproben unterschiedlicher Dateitypen (PDF, Office-Datei, Bild) öffnen
      das richtige Dokument in SharePoint.
- [ ] Kein Klick auf „Öffnen" lädt das Dashboard neu oder öffnet einen Dashboard-Tab.
- [ ] Site-Liste zeigt Namen; der Eintrag mit leerem Namen ist als solcher erkennbar
      („Name nicht erfasst"), nicht leer.
- [ ] Dateiliste zeigt Pfad und Änderungsdatum im deutschen Format.
- [ ] Zwei gleichnamige Dateien sind anhand des Pfads unterscheidbar.
- [ ] Sortierung nach „Geändert" ändert die Reihenfolge nachweisbar.
- [ ] Suche nach einem vorhandenen Begriff liefert Treffer; Suche nach einem unmöglichen Begriff
      liefert „Keine Ergebnisse".
- [ ] `h.summary` wird escaped eingefügt (oder die Stelle entfernt, falls das Feld entfällt).
- [ ] `sharepoint_files` unverändert: `SELECT count(*)` ergibt weiterhin 12.089.

### Tests
- `npm run build` → Exit 0.
- `curl` auf `sites`, `drives`, `files`, `search` — Feldnamen gegen die Normalisierung abgleichen.
- Browser bei 1440 px und 390 px; Tabelle mit langen Pfaden darf die Seite nicht überbreit machen
  (sonst in P2-3 aufnehmen).
- Regression: Dokumenten-Verknüpfung („📎"-Schaltflächen in Kalender, Fuhrpark, Assets) nutzt
  `l.spWebUrl` aus `/api/links` — **eigenes Feld, nicht betroffen**; stichprobenartig prüfen.

### Live-Auswirkung
Nur Anzeige. Keine Schreibzugriffe, keine Graph-Aufrufe außer den bestehenden Leseaufrufen.
Browser-Reload genügt.

### Rückweg
`git checkout <tag> -- public/index.html`, Browser-Reload.

---

## P1-5 — Kalenderlogik: Datum, Zeitzone, Mehrtagestermine (Befund F) — Aufwand M

### Problem und Reproduktion
Beobachtung: „Meetup INHALE in Südtriol" am 05.10.2026 mit „22:00–21:30"; das Bearbeitungsformular
zeigte dieselben Zeiten und nur ein Datum.

**Reproduziert und vollständig erklärt.** Tatsächliche Antwort von `GET /api/calendar` am 04.10.2026:

```
Meetup INHALE in Südtriol
  isAllDay: false
  start: { dateTime: "2026-10-05T22:00:00.0000000", timeZone: "UTC" }
  end:   { dateTime: "2026-10-06T21:30:00.0000000", timeZone: "UTC" }
  location: "Microsoft Teams-Besprechung"
```

Richtig umgerechnet in Europe/Berlin (MESZ, UTC+2) ist das **ein Termin am 06.10.2026 von
00:00 bis 23:30** — keine negative Dauer, kein Termin am 05.10.

Drei Ursachen:

1. **Die Zeitzone wird ignoriert.** Graph liefert `dateTime` **ohne** Zeitzonen-Suffix und die
   Zone separat in `timeZone: "UTC"`. `server.mjs:1257-1283` setzt keinen
   `Prefer: outlook.timezone`-Kopf (`graphGet()` `:285-293` sendet nur `Authorization`), also
   antwortet Graph in UTC. Im Frontend gilt:
   - `index.html:361` `fmtTime = iso => … .format(new Date(iso))` — `new Date("2026-10-05T22:00:00.0000000")`
     parst einen Zeitstempel **ohne** Zonenangabe als **Browser-Lokalzeit**. Bei einem Browser auf
     Europe/Berlin ergibt das 05.10. 22:00 Ortszeit statt 06.10. 00:00. Der Fehler ist dadurch
     **abhängig von der Zeitzone des Browsers** — auf einem UTC-Browser wäre die Anzeige zufällig richtig.
   - `index.html:1159-1161` `dayKey`/`dayLabel` haben denselben Fehler, daher die Gruppierung unter 05.10.
2. **Das Enddatum wird nicht ausgewertet.** `index.html:1178` bildet die Zeile aus
   `fmtTime(ev.start.dateTime)` und `fmtTime(ev.end.dateTime)`, die Tagesgruppe stammt
   ausschließlich aus `start` (`:1170`). Ein Termin über Tagesgrenzen erscheint damit als
   „22:00 – 21:30" an einem Tag.
3. **Das Bearbeitungsformular verliert das Enddatum — mit Schreibrisiko.**
   `index.html:1151-1152`
   ```js
   function calDatePart(iso) { return (iso || '').slice(0, 10); }
   function calTimePart(iso) { return (iso || '').slice(11, 16); }
   ```
   reine String-Ausschnitte des UTC-Zeitstempels. `editEventModal()` `:1266-1291` zeigt nur
   **ein** Datumsfeld (aus `start`) und `saveEvent()` `:1292-1320` schickt
   ```js
   start: `${date}T${tStart}:00`,
   end:   `${date}T${tEnd}:00`,
   ```
   mit `timeZone: 'Europe/Berlin'` (`server.mjs:1297-1299`). Ein Speichern dieses Termins würde
   also **„06.10. 22:00 bis 06.10. 21:30" in den echten Kalender schreiben** — negative Dauer,
   dazu um zwei Stunden verschoben, weil der gelesene UTC-Wert als Berliner Zeit zurückgeschrieben wird.
   **Zu Testzwecken darf kein echter Termin gespeichert werden** (Spec §1, §4 F).

4. **Online-Meeting und Ort sind nur Text.** `index.html:1182`
   ```js
   const teams = ev.onlineMeeting?.joinUrl ? '🔗 Online-Meeting' : '';
   ```
   Der Beitrittslink ist vorhanden, wird aber nicht verlinkt. Beim Termin
   „Jürgen + Jesse - TobaGrown" steht die Meeting-Adresse als reiner Text im `location`-Feld
   (`https://meet.google.com/…`).

5. **Mobile Darstellung.** `.ev-row`/`.ev-time`/`.ev-body` sind eine Flex-Zeile ohne
   Media-Query (`index.html:119-128`); Zeit, Titel und drei Aktionsschaltflächen konkurrieren
   um die Breite. Lange `bodyPreview`-Texte (`:1196`) laufen über. Behebung hier nur für die
   Terminkarte; das allgemeine mobile Raster macht P2-2.

### Klassifikation
Reproduzierter Funktionsfehler (1–3), Produktverbesserung (4), Darstellungsfehler (5).

### Erwartetes Verhalten
- Start, Ende, Ganztägigkeit und Zeitzone werden gemäß Datenmodell behandelt: der Zeitstempel
  wird mit seiner Zone interpretiert, nicht als Lokalzeit geraten.
- Die angezeigte Zeitzone wird benannt (z. B. „Zeiten in Europe/Berlin").
- Mehrtagestermine sind eindeutig dargestellt („06.10. 00:00 – 06.10. 23:30" bzw. mit
  Datumsangabe auf beiden Seiten, wenn Start- und Endtag verschieden sind).
- Keine unerklärte negative Dauer.
- Erstellen und Bearbeiten bilden die unterstützten Terminarten verlustfrei ab: das Formular hat
  **Start- und Enddatum**, eine Ganztags-Option und schreibt dieselbe Zeitzone zurück, die gelesen wurde.
- Sichere, echte Meeting-Links erscheinen als erkennbare Aktion („Online-Meeting beitreten ↗");
  nur `https:`-URLs, `target="_blank" rel="noopener"`.
- Mobil stehen Zeit, Titel, Ort und Aktionen sinnvoll untereinander; keine Karte läuft über.

### Dateien und Komponenten
- `server.mjs` — `graphGet()` `:285-293` (Zusatzkopf `Prefer: outlook.timezone="Europe/Berlin"`
  als Option), `GET /api/calendar` `:1257-1283`, `POST /api/calendar` `:1286-1310`,
  `PATCH /api/calendar/:eventId` `:1312-1333`
- `public/index.html` — Formatierer `:359-361`, `calDatePart`/`calTimePart` `:1151-1152`,
  `loadCalendar()` `:1154-1215`, `newEventModal()` `:1217-1239`, `createTrip`-analoges
  `createEvent()` `:1241-1264`, `editEventModal()` `:1266-1291`, `saveEvent()` `:1292-1320`,
  CSS `.ev-row` `:119-128`
- **Neu:** `public/js/zeit.js` — `graphZeitpunkt({dateTime, timeZone})` → echtes `Date`;
  `formatZeitraum(start, end, ganztags)`; `lokalInZone(datum, zeit, zone)`.
  Wird von P2-5 und P2-8 wiederverwendet.

**Entscheidung zum Lösungsweg:** Beide Richtungen vereinheitlichen, indem die Zone aus der
Antwort tatsächlich ausgewertet wird (`timeZone` + `dateTime` → `Date`). Das ist robuster als
sich auf den `Prefer`-Kopf zu verlassen, weil der Kopf nur die Antwortzone ändert und die
String-Fehlinterpretation nicht beseitigt. Der `Prefer`-Kopf kann zusätzlich gesetzt werden,
darf aber nicht die einzige Maßnahme sein.

### Änderungsumfang
Kalenderbereich in `index.html`, drei Routen in `server.mjs`, ein neuer Zeit-Baustein.
**Nicht** in diesem Paket: Trip-Segment-Kalendersynchronisation (`server.mjs:1356-1464`) — sie
schreibt echte Termine; nur lesend prüfen, ob sie denselben Fehler hat, und das Ergebnis in
`STATUS.md` vermerken.

### Abnahme
- [ ] „Meetup INHALE in Südtriol" erscheint unter dem 06.10.2026 mit 00:00–23:30.
- [ ] „Training Bernd" (Graph: 05.10. 05:00–06:00 UTC) erscheint mit 07:00–08:00.
- [ ] Keine negative Dauer in der gesamten Wochenliste.
- [ ] Die Zeitzone ist in der Oberfläche benannt.
- [ ] Das Bearbeitungsformular zeigt Start- **und** Enddatum sowie eine Ganztags-Option.
- [ ] **Speichertest nur an einem selbst angelegten Testtermin**, der anschließend gelöscht wird;
      kein Bestandstermin wird verändert. Nachweis: gelesener und zurückgeschriebener Zeitraum
      sind identisch.
- [ ] Meeting-Link erscheint als anklickbare Aktion; `javascript:`- und `data:`-URLs werden abgewiesen.
- [ ] Mobil (390 px): Terminkarte ohne Überlauf, Titel vollständig lesbar.
- [ ] Keine Einladung, keine Absage, keine Terminänderung an echten Terminen.

### Tests
- `npm run build` → Exit 0.
- `curl -s http://127.0.0.1:18800/api/calendar` — Rohdaten mit der Anzeige abgleichen
  (vier Termine im 7-Tage-Fenster am 04.10.2026).
- Browser bei 1440 px und 390 px.
- Regression: Trips-Bereich (Segment-Kalenderanzeige) unverändert.

### Live-Auswirkung
Lesend unkritisch. **Schreibend heikel** — jedes Speichern geht in den echten M365-Kalender.
Deshalb: Speichertest ausschließlich mit einem eigens erzeugten Testtermin, Löschung
unmittelbar danach, Protokoll in `STATUS.md`.

### Rückweg
`git revert <commit>`; bei `server.mjs`-Änderung zusätzlich
`systemctl --user restart openclaw-dashboard.service`. Ein versehentlich geänderter Termin ist
**nicht** über Git rückholbar — daher die Testregel oben.

---

## P1-6 — Nebenkosten: Schweregrade und verständliche Meldungen (Befund G) — Aufwand M

### Problem und Reproduktion
Beobachtung: Pre-Check meldet „3 Blocker", die Einzelbefunde darunter stehen als „INFO";
Readiness-Matrix zeigt überwiegend bloße Zahlen („2", „3"); Vorschau bei Blockern sinnvoll gesperrt.

**Reproduziert.** Tatsächliche Antwort (lesend, 04.10.2026, `GET /api/assets/properties/d4/nk-readiness?year=2025`):
```
blocking_count: 3, warning_count: 1, info_count: 0
findings:
  { code: "COMMERCIAL_NOT_SUPPORTED",        severity: "blocker", message: "Commercial/industrial properties not yet supported for NK calculation" }
  { code: "HEATING_CONFIG_MISSING",          severity: "blocker", message: "No heating configuration for year 2025 — required for properties with heating" }
  { code: "MISSING_MAIN_HEAT_METER",         severity: "blocker", message: "No main heat/gas meter found — required for heating cost allocation" }
  { code: "ESTIMATED_AREA_OVER_25_PERCENT",  severity: "warning", message: "1/1 units (100%) missing area — exceeds 25% threshold" }
```
Die Schweregrade **sind korrekt** — der Typ im Core ist
`Severity = 'blocker' | 'warning' | 'info'` (`src/modules/nk/precheck.ts:8`), das Textfeld
heißt `message` (`:12`).

Zwei Lesefehler im Frontend, jeweils an zwei Stellen:

1. **Schweregrad-Vergleich gegen den falschen Wert.**
   `public/js/assets-nebenkosten.js:246` und identisch `public/js/assets-status.js:183`:
   ```js
   const severityBadge = f.severity === 'blocking' ? '…Blocker…'
     : f.severity === 'warning' ? '…Warnung…'
     : '…Info…';
   ```
   `'blocking'` kommt nie vor → jeder Blocker fällt in den Standardzweig und wird als **„Info"**
   angezeigt. Warnungen stimmen zufällig, weil `'warning'` passt.
2. **Falsches Textfeld.**
   `assets-nebenkosten.js:255` und `assets-status.js:192`: `esc(f.detail || '')`.
   Das Feld heißt `message` → die Beschreibungszeile ist **immer leer**. Übrig bleibt nur
   der technische Code.
3. **„Beheben"-Schaltfläche erscheint nie.** `assets-nebenkosten.js:257` und
   `assets-status.js:197` verlangen `f.suggested_action`; der Core liefert kein solches Feld
   (ebenso kein `display_id`, kein `entity_id`). Die Zielzuordnung `DEEPLINK_MAP`
   (`assets-status.js:8-15`) mit sechs Handlern ist vorhanden und ungenutzt.
   `assets-status.js:197` greift zudem ohne `typeof`-Absicherung auf `DEEPLINK_MAP` zu —
   `assets-nebenkosten.js:257` tut das korrekt.
4. **Readiness-Matrix zeigt nur Zahlen.** `public/js/assets-status.js:144-155`:
   ```js
   if (blocking > 0) { badgeClass = 'nk-badge-red'; icon = blocking; }
   else if (warnings > 0 || infos > 0) { badgeClass = 'nk-badge-yellow'; icon = warnings + infos; }
   else { badgeClass = 'nk-badge-green'; icon = '✓'; }
   ```
   Die Erläuterung steckt ausschließlich im `title`-Attribut (`:156`), also **nur im Hover** —
   das verstößt gegen Spec §6 („Nichts nur über Hover").
5. **Meldungen sind englisch und nennen keinen nächsten Schritt.** Alle 21 Regeln in
   `src/modules/nk/precheck.ts` formulieren auf Englisch, ohne Ursache/Auswirkung/nächsten Schritt.

Vollständige Befundlage über alle sechs Objekte, Jahr 2025 (für die Abnahme):

| Objekt | Blocker | Warnungen | Infos |
|---|---|---|---|
| `d4` | 3 | 1 | 0 |
| `l19` | 2 | 5 | 2 |
| `n24` | 2 | 7 | 2 |
| `mg24` | 2 | 4 | 0 |
| `s28` | 2 | 3 | 0 |
| `i83` | 2 | 1 | 0 |

Kein Objekt ist derzeit abrechnungsbereit; die Sperre der Vorschau ist also fachlich richtig
und bleibt.

### Klassifikation
Reproduzierter Funktionsfehler (1–4), Produktverbesserung mit Owner-Freigabe zum Vorgehen (5).

### Erwartetes Verhalten
- Schweregrade werden durchgängig korrekt dargestellt: Blocker als Blocker, Warnung als Warnung,
  Info als Info — sowohl im Pre-Check als auch in der Readiness-Matrix-Detailansicht.
- Jeder blockierende Befund erklärt auf Deutsch **Warum** und **Wie**:
  Ursache, Auswirkung, nächster Schritt. Beispiel für `HEATING_CONFIG_MISSING`:
  „Heizungskonfiguration für 2025 fehlt. Ohne sie kann die Heizkostenabrechnung nicht berechnet
  werden. Nächster Schritt: Heizungskonfiguration im Objekt hinterlegen."
- Wo eine Zielansicht existiert, führt eine Schaltfläche direkt dorthin.
- Die Readiness-Matrix zeigt benannte Zustände statt nackter Zahlen („2 Blocker", „5 Warnungen",
  „Bereit") — sichtbar, nicht nur im Hover.
- Die Sperre der Vorschau bei echten Blockern bleibt unverändert.
- „Keine Pflichten" bzw. „Bereit" verschleiert keine fehlende Konfiguration und keinen Ladefehler:
  ein fehlgeschlagener Abruf erscheint als Fehler, nicht als grüner Zustand.

### Dateien und Komponenten
- `public/js/assets-nebenkosten.js` — `nkLoadPreCheck()` `:198-272`, Schweregrad `:246-248`,
  Text `:255`, Beheben-Schaltfläche `:257-261`
- `public/js/assets-status.js` — `DEEPLINK_MAP` `:8-15`, `loadNkReadiness()` `:122-163`,
  Zellenaufbau `:144-156`, `showNkFindings()` `:165-204`
- **Neu:** `public/js/nk-befunde.js` — Zuordnung `code → { titel, ursache, auswirkung,
  naechsterSchritt, zielAktion }` für die vorkommenden Codes, mit Rückfallebene für unbekannte
  Codes (Code + englische `message` anzeigen, nicht verschweigen)
- `public/css/assets.css` — Badge-Stile für benannte Zustände

**Bewusst nicht geändert:** `src/modules/nk/precheck.ts`. Die 21 Regeln und ihre Schweregrade
sind fachliche Abrechnungslogik; Spec §4 G verbietet, sie zur Anzeigeverbesserung anzufassen.
Die deutschen Erklärungen entstehen im Dashboard. Owner-Freigabe dieses Vorgehens:
Masterplan §5 Nr. 7.

### Änderungsumfang
Zwei bestehende JS-Dateien, eine neue Zuordnungsdatei, CSS. Kein Core, keine Datenbank,
keine Abrechnungsregel, kein Finalisieren, kein PDF.

### Abnahme
- [ ] Objekt D4, Jahr 2025: Ampel „3 Blocker", und alle drei Einzelbefunde tragen das Abzeichen
      **Blocker** — nicht „Info".
- [ ] Objekt L19, Jahr 2025: 2 Blocker, 5 Warnungen, 2 Infos, jeweils korrekt ausgezeichnet.
- [ ] Jeder blockierende Befund zeigt deutschen Text mit Ursache, Auswirkung und nächstem Schritt.
- [ ] Mindestens zwei Befundarten führen über eine Schaltfläche zur passenden Detailansicht.
- [ ] Readiness-Matrix zeigt benannte Zustände; die Erklärung ist ohne Hover lesbar.
- [ ] Vorschau bleibt bei allen sechs Objekten gesperrt (kein Objekt ist bereit).
- [ ] Ein simulierter Ladefehler (nicht erreichbarer Endpunkt) erscheint als Fehler, nicht als grün.
- [ ] Ein unbekannter Code erscheint mit Code und Originalmeldung, nicht als leere Zeile.
- [ ] Keine Finalisierung, kein PDF-Lauf, keine Datenänderung während der Prüfung.

### Tests
- `npm run build` → Exit 0.
- `grep -n "x-if" public/js/assets-nebenkosten.js public/js/assets-status.js` → Single-Root-Prüfung.
- `curl` auf `nk-readiness` für alle sechs Objekte, Jahre 2024–2026; Anzeige gegen die Rohantwort
  abgleichen.
- Browser bei 1440 px und 390 px.
- Regression: Unterbereiche „Vorschau", „Runs & Statements" und „§556-Pflichten" weiterhin
  bedienbar; Audit-Viewer unverändert.

### Live-Auswirkung
Nur Anzeige. Die Pre-Check-Abrufe sind lesend und erzeugen keine Kosten.
Browser-Reload genügt.

### Rückweg
`git checkout <tag> -- public/js/assets-nebenkosten.js public/js/assets-status.js` und
Löschen der neuen Datei; Browser-Reload.
