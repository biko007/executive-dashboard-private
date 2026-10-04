# 04 — Abnahme und Regressionsprüfung

Gilt für beide Checkpoints. Ergebnisse werden **hier** eingetragen (Datum, Prüfer, Befund),
nicht nur in `STATUS.md`.

Grundregel aus Spec §8: **Eine Erfolgsmeldung des Coding-Agenten genügt nicht.** Jede
Abnahmezeile braucht ein tatsächliches Prüfergebnis — gesehener Zustand, Messwert oder
Rohantwort.

---

## 0. Bewusst nicht ausgeführte Aktionen

Diese Aktionen werden in **keiner** Prüfung ausgeführt (Spec §1, §3):

| Nicht ausgeführt | Grund |
|---|---|
| Speichern, Löschen, Archivieren an Bestandsdaten | Produktionsdaten, kein Rückweg über Git |
| Uploads in SharePoint oder ins Wiki (außer eigens erzeugten Testdateien, die wieder entfernt werden) | externe Wirkung |
| Synchronisationen (Banking-FinTS, SharePoint, Withings, Oura, Meta) | echte externe Abrufe, TAN-Pflicht, Kosten |
| Instagram-Scan, -Generierung, -Veröffentlichung | Außenwirkung |
| Handelsaktionen, Watchlist-Mutationen | Spec §4 B: keine Änderung an Strategie oder Ausführungsberechtigung |
| Nebenkosten finalisieren, PDF erzeugen, Re-Render | fachliche Wirkung auf Abrechnungen |
| Termine ändern, Einladungen oder Absagen senden | echte M365-Kalenderwirkung |
| Neue Bankverbindung, Transaktion | neue Kosten, Außenwirkung |
| Workflows in n8n aktivieren oder ausführen | Owner-Entscheidung Nr. 1 |
| Zusammenführen oder Statusänderung an Mieter-/Vertragsdaten | Owner-Entscheidungen Nr. 3 und 4 |
| `POST /api/sharepoint/cleanup-missing` | Datenänderung, Owner-Entscheidung Nr. 8 |

**Zugelassene Ausnahmen**, jeweils mit anschließender Entfernung und Protokoll in `STATUS.md`:
- ein selbst angelegter **Testtermin** im Kalender (für P1-5 Speichertest),
- eine selbst angelegte **Testreise** (für P2-8 Kennungsvergabe),
- eine selbst angelegte **Wiki-Testseite** (für P2-6 Einfügeprüfung, falls nötig).

---

## 1. Bildschirmgrößen und Prüfmatrix

Zu prüfen bei **360, 390, 768, 1440 px** und auf einem **großen Desktop**.
Bei Checkpoint 2 zusätzlich auf einem **echten Smartphone gemeinsam mit dem Owner** —
Emulation allein gilt nicht als vollständig; andernfalls bleibt der Punkt als offen markiert
(Spec §9).

| Bereich | 360 | 390 | 768 | 1440 | groß | echtes Gerät |
|---|---|---|---|---|---|---|
| Tagesübersicht (ab P2-5) | | | | | | |
| Health | | | | | | |
| Trips | | | | | | |
| Kalender | | | | | | |
| Fuhrpark (Liste + ein Fahrzeug, alle 7 Unterbereiche) | | | | | | |
| Assets — Stammdaten | | | | | | |
| Assets — Verträge & Kosten (5 Unterbereiche) | | | | | | |
| Assets — Nebenkosten (4 Unterbereiche) | | | | | | |
| Assets — Status & NK-Readiness | | | | | | |
| Trading | | | | | | |
| Banking | | | | | | |
| Private Equity | | | | | | |
| Instagram (6 Ansichten) | | | | | | |
| SharePoint | | | | | | |
| Wiki | | | | | | |
| Agents | | | | | | |
| Status | | | | | | |

### Globale Messungen je Breite
- [ ] `document.documentElement.scrollWidth` ≤ Viewport-Breite. **Messwert eintragen.**
      Ausgangswert laut Owner-Beobachtung: ca. 1.251 px bei 390 px Viewport.
- [ ] Seitliches Wischen auf einer Inhaltsfläche verschiebt nicht die Seite.
- [ ] Navigation: alle 13 bzw. 14 Bereiche erreichbar, aktiver Bereich erkennbar.
- [ ] Stichprobe zehn Schaltflächen: Trefferfläche ≥ 44 × 44 px.
- [ ] Kein Element nur über Hover erreichbar.
- [ ] Tastaturfokus jederzeit sichtbar.

---

## 2. CHECKPOINT 1 — Verlässlichkeit

Durchführung: unabhängige Browserprüfung nach Abschluss von P1-1 bis P1-6.
Ergebnis: _nicht begonnen_

### 2.1 Aktualität und Datenvertrauen (P1-1)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 1.1 | Dashboard neu laden, Seitenkopf lesen | Beschriftung nennt den **Seitenabruf**, nicht „Stand" | |
| 1.2 | Instagram → Übersicht | Medien, Insights und Forensic haben je ein eigenes Datum mit Alter (Ausgangslage: 11.05.2026 / 27.06.2026 / 08.05.2026) | |
| 1.3 | Instagram → Übersicht, Tabelle „Top-Beiträge" | nicht mehr unkommentiert als 30-Tage-Analyse; Demodaten gekennzeichnet oder ausgeblendet | |
| 1.4 | Instagram → Analyse | der Absatz unter „KI-Empfehlung" erhebt keinen KI-Anspruch, solange er fest hinterlegt ist | |
| 1.5 | Instagram-Kopf vs. Status-Bereich | Token-Restlaufzeit identisch (Ausgangslage: 59 Tage am 04.10.2026) | |
| 1.6 | Trading-Bereich vs. Status-Bereich | derselbe IB-Gateway-Zustand; stimmt mit `127.0.0.1:18793/health` überein | |
| 1.7 | Status-Bereich | je Dienst Prüfzeitpunkt sichtbar; gespeicherte Zustände als solche erkennbar | |
| 1.8 | Banking | Datenstand 29.06.2026 sichtbar und als veraltet gekennzeichnet | |
| 1.9 | SharePoint | Datenstand 16.05.2026 sichtbar | |
| 1.10 | Statusquelle nicht erreichbar (Abruf gegen einen falschen Port im Browser nachstellen oder Antwort abwarten) | „unbekannt" / „nicht abrufbar", **nicht** „in Ordnung" | |

### 2.2 Fuhrparkfilter (P1-2)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 2.1 | Fuhrpark öffnen | 7 Fahrzeuge | |
| 2.2 | „Archiviert" | 0 Fahrzeuge, ausdrückliche Erklärung, Rücksetzen-Schaltfläche | |
| 2.3 | „Alle" (ohne Bereichswechsel) | 7 Fahrzeuge | |
| 2.4 | „Aktiv" (ohne Bereichswechsel) | 7 Fahrzeuge | |
| 2.5 | „Archiviert" → „Alle" → „Aktiv" → „Archiviert" zügig hintereinander | Endzustand korrekt, kein veraltetes Ergebnis | |
| 2.6 | Trefferzahl | sichtbar und korrekt | |
| 2.7 | Fahrzeugdaten stichprobenartig (Tesla Model 3: TÜV bis 28.10.2026) | unverändert | |
| 2.8 | Fahrzeug öffnen, zurück, `?fleet_code=FZG-TESLA-M3` aufrufen | funktioniert | |

### 2.3 Mietvertragsfilter und Suche (P1-3)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 3.1 | Assets → Verträge & Kosten → Mietverträge | 17 Verträge, Trefferzahl „17 von 17" | |
| 3.2 | Objektfilter „I83" | genau **1** Vertrag (`i83-w1-2025`) | |
| 3.3 | Objektfilter „N24" | 7 Verträge (Einheiten W1–W6 plus der zweite Vertrag auf W6) | |
| 3.4 | Suche `zzzzAuditKeinTreffer` | 0 Treffer, Leerzustand nennt die aktive Einschränkung | |
| 3.5 | „Filter zurücksetzen" | 17 Verträge | |
| 3.6 | Statusfilter „Aktiv" / „Beendet" / „Zukünftig" | 17 / 0 / 0 — die Nullwerte mit Erklärung, da im Bestand alle Verträge `active` sind | |
| 3.7 | Objektfilter + Textsuche gleichzeitig | Schnittmenge | |
| 3.8 | Drei Objekte zügig hintereinander wählen | Endzustand korrekt | |
| 3.9 | Zeile anklicken | richtiges Vertragsdetail öffnet | |
| 3.10 | `GET /api/assets/leases` nach der Prüfung | weiterhin 17 Zeilen, unverändert | |

### 2.4 SharePoint-Dokumentzugriff (P1-4)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 4.1 | SharePoint öffnen | Site-Liste mit Namen; der Eintrag ohne Namen ist als „Name nicht erfasst" erkennbar | |
| 4.2 | „Dokumente (bikolino GmbH)" | Dateiliste öffnet | |
| 4.3 | „Öffnen ↗" an einer PDF | das **Dokument** öffnet in SharePoint, **kein** Dashboard-Tab | |
| 4.4 | „Öffnen ↗" an einer Office-Datei | Dokument öffnet | |
| 4.5 | „Öffnen ↗" an einem Bild | Dokument öffnet | |
| 4.6 | Datei ohne `web_url` (falls vorhanden) | Aktion verständlich deaktiviert | |
| 4.7 | Spalten „Pfad" und „Geändert" | gefüllt, Datum im deutschen Format | |
| 4.8 | Zwei gleichnamige Dateien | über den Pfad unterscheidbar | |
| 4.9 | Sortierung nach „Geändert" | Reihenfolge ändert sich nachweisbar | |
| 4.10 | Suche „Mietvertrag" | Treffer mit Pfad und Datum (Ausgangslage: u. a. `12-I83/30.04.2025_I83 Mietvertrag …pdf`) | |
| 4.11 | Suche nach unmöglichem Begriff | „Keine Ergebnisse" | |
| 4.12 | `SELECT count(*) FROM sharepoint_files` | weiterhin 12.089 | |

### 2.5 Kalender (P1-5)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 5.1 | Kalender öffnen | 4 Termine im 7-Tage-Fenster (Ausgangslage 04.10.2026) | |
| 5.2 | „Meetup INHALE in Südtriol" | **06.10.2026, 00:00–23:30** — nicht 05.10., nicht „22:00–21:30" | |
| 5.3 | „Training Bernd" (05.10.) | **07:00–08:00** | |
| 5.4 | „Jürgen + Jesse - TobaGrown" (08.10.) | **14:00–15:00** | |
| 5.5 | gesamte Wochenliste | keine negative Dauer | |
| 5.6 | Zeitzone | in der Oberfläche benannt | |
| 5.7 | „Termin bearbeiten" bei einem Bestandstermin öffnen | Start- **und** Enddatum sichtbar und korrekt; Ganztags-Option vorhanden; **mit Abbrechen schließen, nicht speichern** | |
| 5.8 | Testtermin anlegen, bearbeiten, speichern, Werte prüfen, löschen | gelesener und zurückgeschriebener Zeitraum identisch; Protokoll in `STATUS.md` | |
| 5.9 | Online-Meeting-Link | anklickbare Aktion; nur `https:` wird akzeptiert | |
| 5.10 | 390 px | Terminkarte ohne Überlauf, Titel vollständig | |
| 5.11 | Bestandstermine nach der Prüfung | unverändert (Gegenprobe über `GET /api/calendar`) | |

### 2.6 Nebenkosten (P1-6)

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 6.1 | Assets → Nebenkosten → Pre-Check, Objekt **D4**, Jahr 2025 | Ampel „3 Blocker"; alle drei Einzelbefunde tragen das Abzeichen **Blocker** | |
| 6.2 | dieselbe Ansicht | jeder Blocker nennt auf Deutsch Ursache, Auswirkung und nächsten Schritt | |
| 6.3 | Objekt **L19**, Jahr 2025 | 2 Blocker, 5 Warnungen, 2 Infos — jeweils korrekt ausgezeichnet | |
| 6.4 | Objekt **N24**, Jahr 2025 | 2 Blocker, 7 Warnungen, 2 Infos | |
| 6.5 | „Beheben" an mindestens zwei Befundarten | führt in die passende Detailansicht | |
| 6.6 | Unterbereich „Vorschau" | bei allen sechs Objekten gesperrt (kein Objekt ist bereit) | |
| 6.7 | Assets → Status → NK-Readiness-Matrix | benannte Zustände statt nackter Zahlen; Erklärung **ohne** Hover lesbar | |
| 6.8 | Matrix-Zelle anklicken | Detailbefunde mit korrekten Schweregraden | |
| 6.9 | nicht erreichbarer Endpunkt nachgestellt | Fehlerzustand, **nicht** grün | |
| 6.10 | unbekannter Befundcode (konstruiert) | Code und Originalmeldung erscheinen, keine leere Zeile | |
| 6.11 | §556-Pflichten | „nicht eingerichtet" (Tabelle ist leer), **nicht** „keine Pflichten" | |
| 6.12 | nach der Prüfung | keine Finalisierung, kein PDF-Lauf, keine Datenänderung | |

### 2.7 Regression Checkpoint 1

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 7.1 | alle 13 Bereiche öffnen | kein JavaScript-Fehler in der Konsole | |
| 7.2 | Health | Warnungen stehen **vor** den Kennzahlen; Kennzahl + Messdatum + Verlauf vorhanden (Spec §7) | |
| 7.3 | Trading | Paper-Trading-Kennzeichnung sichtbar (Konto DUP514636) | |
| 7.4 | Wiki | Kategorien, Quellenstand, Anhänge, Revisionen, Rücknavigation vorhanden | |
| 7.5 | Fuhrpark | Unterteilung in 7 Unterbereiche erhalten | |
| 7.6 | ein Formular öffnen und mit Escape schließen | funktioniert | |
| 7.7 | Genehmigungsdialoge (Fuhrpark, Assets, Banking) | öffnen und lassen sich abbrechen; Timer läuft | |
| 7.8 | Dokumenten-Verknüpfung „📎" in Kalender, Fuhrpark, Assets | vorhandene Verknüpfungen öffnen weiterhin das richtige Ziel | |
| 7.9 | `npm run build` | Exit 0 | |
| 7.10 | `grep -n "x-if" public/js/*.js` | jede `x-if` hat genau ein direktes Kindelement | |
| 7.11 | Agent-Repo `scripts/smoke-test.ts` (prüft u. a. `https://app.bikobickel.de/dashboard/`) | läuft durch | |

### Übergabe an den Owner bei Checkpoint 1
- geänderte Dateien je Paket mit Commit-Hash,
- Fundort im Livesystem (Bereich, Unterbereich, Pfad),
- Reproduktions- und Abnahmeschritte,
- erwartete Zustände,
- noch Offenes,
- Änderungsstand (Commit-Hashes, Tag).

**Breiter UI-Umbau beginnt erst nach Freigabe dieses Checkpoints.**

---

## 3. CHECKPOINT 2 — Design, Mobil, Tagesübersicht

Ergebnis: _nicht begonnen_

### 3.1 Helles Design und Lesbarkeit

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 8.1 | alle Bereiche und Unterbereiche | durchgängig hell; kein dunkler Flicken | |
| 8.2 | Anmeldemaske, alle Dialoge | hell | |
| 8.3 | Tabellen-Zeilen-Hover | sichtbar | |
| 8.4 | Warnungen und Fehler | Text **und** Symbol, nicht nur Farbe | |
| 8.5 | Fließtext | ≥ 14 px; Nebeninfos ≥ 13 px | |
| 8.6 | Kontrast je Farbrolle (Text/Fläche, gedämpft/Fläche, Akzent/Fläche, Weiß/Akzent) | WCAG AA erreicht oder Abweichung dokumentiert | |
| 8.7 | `grep -nE '#[0-9a-fA-F]{3,8}\b\|rgba?\(' public/index.html public/css/*.css public/js/*.js` | nur Treffer im Token-Block | |
| 8.8 | Abstände, Ausrichtung, Aktionshierarchie | konsistent über die Bereiche | |
| 8.9 | Fließtextbreite auf großem Desktop | keine endlos breiten Zeilen | |

### 3.2 Mobile Navigation und Struktur

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 9.1 | 360/390/768 px | kein horizontaler Seitenüberlauf; Messwerte eintragen | |
| 9.2 | Navigation bei 390 px | alle Bereiche erreichbar, aktiver Bereich erkennbar | |
| 9.3 | seitliches Wischen | verschiebt nicht die Seite | |
| 9.4 | Browser-Zurück nach drei Bereichswechseln | schrittweise zurück, nicht aus der Anwendung | |
| 9.5 | Neuladen in einem Detailbereich | führt zurück in denselben Bereich | |
| 9.6 | Deeplinks `?tab=banking`, `?tab=wiki&page=<slug>`, `?fleet_code=<code>` | funktionieren | |
| 9.7 | keine Funktion mobil verschwunden | Gegenprobe je Bereich gegen die Desktop-Ansicht | |

### 3.3 Tabellen, Karten, Diagramme

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 10.1 | jede Tabelle bei 390 px | Karte oder erkennbarer Scrollbereich; keine abgeschnittene Spalte | |
| 10.2 | drei Health-Diagramme bei 390 px | vollständig sichtbar; **jüngster Wert ohne Scrollen sichtbar** | |
| 10.3 | Diagrammwerte | stimmen mit `/api/health/chart-data` überein | |
| 10.4 | SharePoint-Dateiliste mit langen Pfaden | sprengt die Seitenbreite nicht | |
| 10.5 | Instagram-Raster bei 390 px | nicht vierspaltig gestaucht | |
| 10.6 | Terminkarten | kein Überlauf, lange Beschreibungen umbrechen oder gekürzt | |

### 3.4 Formulare, Dialoge, Zustände

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 11.1 | sechs Dialoge bei 390 px mit offener Bildschirmtastatur | Aktionszeile erreichbar | |
| 11.2 | Escape und Abbrechen | in jedem Dialog vorhanden und wirksam | |
| 11.3 | Tabulator im Dialog | bleibt im Dialog; Fokus kehrt beim Schließen zurück | |
| 11.4 | Zustände „keine Daten", „keine Treffer", „nicht eingerichtet", „Laden fehlgeschlagen", „Daten veraltet" | in mindestens fünf Bereichen unterschieden | |
| 11.5 | lesender Ladefehler | Wiederholungsschaltfläche vorhanden und wirksam | |
| 11.6 | `grep -c "aria-label"` über die Frontend-Dateien | deutlich > 0; Stichprobe zehn Icon-Schaltflächen mit sinnvollen Namen | |
| 11.7 | kein „alles in Ordnung" bei fehlenden Daten | je Bereich geprüft | |

### 3.5 Tagesübersicht

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 12.1 | Anmelden | Tagesübersicht ist die Startansicht | |
| 12.2 | TÜV-Fristen | Tesla Model 3 (28.10.2026) erscheint und steht vor den Fristen von 2027/2028 | |
| 12.3 | Gesundheitswarnungen | kritische vor warnender Meldung | |
| 12.4 | veraltete Quellen | Banking, SharePoint, Instagram mit Datum und Alter | |
| 12.5 | §556-Pflichten | „nicht eingerichtet" | |
| 12.6 | Gesamtbild | kein Gesamtscore, keine Kennzahlenwand, keine doppelten Warnungen | |
| 12.7 | jede Zeile anklicken | führt in die richtige Detailansicht | |
| 12.8 | alle Fachbereiche | weiterhin direkt erreichbar (Spec §7) | |
| 12.9 | 390 px | vollständig lesbar, kein Überlauf | |

### 3.6 Bereichsverbesserungen

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 13.1 | Wiki-Suche „Pflanzliste" | Begriff hervorgehoben, kein `<b>`-Text, keine Markdown-Linksyntax | |
| 13.2 | Wiki-Ausschnitt mit Sonderzeichen | wird nicht als HTML ausgeführt | |
| 13.3 | Instagram-Content-Plan | Entwurfsverweise öffnen den richtigen Entwurf; fehlende Verknüpfung erklärt | |
| 13.4 | Instagram-Datumsangaben | vollständig mit Jahr | |
| 13.5 | Instagram-Rohmaterial | Suche und Filter wirken; höchstens 25 Einträge beim ersten Laden | |
| 13.6 | keine Schaltfläche ohne Wirkung | in Instagram geprüft | |
| 13.7 | neue Reise ohne Kennungseingabe anlegen | Kennung folgt `YYMMDD-trip-<ort>`; Testreise danach entfernen | |
| 13.8 | Mietvertragstabelle | „Wohnung unbefristet" statt `residential_permanent` | |
| 13.9 | kein englischer Oberflächentext in Assets und Fuhrpark | Stichprobe zehn Beschriftungen | |
| 13.10 | HRV- und Readiness-Kacheln | Skala, Quelle (Oura), Bedeutung der Schwellen genannt | |
| 13.11 | Banking | beide aktiven Konten mit Saldo, „EUR", Status, Datenstand 29.06.2026; Summe 17.968,73 € mit Währungsangabe | |
| 13.12 | Banking, Konten ohne Saldo | „kein Saldo erfasst", nicht 0 € | |
| 13.13 | Agents | 4 Workflows mit Aktiv-Zustand (derzeit alle inaktiv); „Keine Ausführungen aufgezeichnet" | |
| 13.14 | Agents, Seitenquelle und Netzwerkmitschnitt | der n8n-Schlüssel erscheint nirgends | |
| 13.15 | Vertrag `n24-w6-2024` | Klärungshinweis sichtbar; `status` in der Datenbank unverändert `active` | |
| 13.16 | Mieteransicht „Jürgen Bickel" | alle vier Datensätze mit zugehörigem Vertrag und Doppeleintrags-Hinweis | |
| 13.17 | Übersicht „Klärungsbedarf" | listet beide Fälle, benennt den Owner als Entscheider | |
| 13.18 | „Hans Dampf" | unverändert, solange keine Owner-Entscheidung vorliegt | |

### 3.7 Regression Checkpoint 2

| Nr. | Prüfschritt | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| 14.1 | alle Prüfschritte aus 2.7 erneut | unverändert erfüllt | |
| 14.2 | alle Prüfschritte aus 2.1–2.6 erneut | unverändert erfüllt (keine Rückfälle durch Phase 2) | |
| 14.3 | Bestandsdaten-Gegenprobe | `leases` 17 aktiv, `tenants` 26, `sharepoint_files` 12.089, `vehicles` 7 aktiv, `banking_sync_runs` 3 Zeilen | |
| 14.4 | Agent-Repo `scripts/smoke-test.ts` | läuft durch | |
| 14.5 | `systemctl --user status openclaw-dashboard.service` | active (running) | |
| 14.6 | `journalctl --user -u openclaw-dashboard.service -n 50` | keine neuen Fehler | |

---

## 4. Nicht geprüfte Punkte (sind als offen auszuweisen)

Was in einer Prüfung nicht ausgeführt wurde, bleibt ausdrücklich offen und wird **nicht** als
erfüllt gemeldet. Vorlage für den Eintrag:

| Punkt | Warum nicht geprüft | Folge |
|---|---|---|
| | | |

Aus Phase 0 bereits offen:
- Alle Messwerte aus Spec §6 (Dokumentbreite, Diagrammbreite, Wischverhalten) — in Phase 0
  nicht nachgemessen, nur die Ursachen am Code belegt.
- Der genaue Auslösemechanismus von Befund C.
- Tastaturfokus, Dialogfokus und Bildschirmtastatur-Verhalten.
- Fachliche Richtigkeit der 21 Nebenkosten-Pre-Check-Regeln.
- Funktion von Speichern, Löschen, Archivieren, Uploads, Synchronisationen,
  Veröffentlichungen, Handelsaktionen — bewusst nicht ausgeführt.
- Ob ein lesender Endpunkt für Bankumsätze existiert (`banking_transactions`).
