# Energielage — Design-Spezifikation

**Datum:** 2026-09-16
**Status:** abgestimmt, bereit für den Umsetzungsplan

## 1. Ziel

Eine öffentliche Webseite, die die wichtigsten Energiekennzahlen für Deutschland
zeigt — und zwar so, dass ein Leser sie **einordnen** kann. Eine Zahl allein
("Diesel 1,72 €") ist bedeutungslos. Der Wert der Seite entsteht erst durch den
Bezugspunkt: Ist das viel? Ist das normal für die Jahreszeit? Wo standen wir
vor der Krise?

Die Seite ist ein Werkzeug, kein Argument. Sie wertet nicht, sie zeigt Abstände
zu Referenzpunkten und überlässt die Schlussfolgerung dem Leser.

**Abgrenzung zu Sunshift:** Sunshift argumentiert mit kuratierten Fakten für die
Energiewende. Energielage ist ein Messinstrument ohne These. Getrennte Projekte,
getrennte Repos, kein geteilter Code — die einzige Verbindung ist ein
wechselseitiger Link im Fußbereich.

## 2. Getroffene Entscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| Projektform | Eigenständiges Projekt | Anderes Produkt, anderes Ausfallrisiko als Sunshift |
| Code-Teilung mit Sunshift | Keine | Überschneidung sind ~30 Zeilen Proxy-Logik; Monorepo wäre Overhead ohne Gegenwert |
| Inhaltstiefe | Verlauf **und** Einordnung | Der Bezugspunkt ist der eigentliche Produktwert |
| Datenweg | GitHub Actions Cron → JSON im Repo → statische Seite | Siehe Abschnitt 5 |
| Hosting | GitHub Pages | Vom Nutzer gewünscht; durch den statischen Aufbau problemlos möglich |
| Sprachen | Deutsch + Englisch | Die EU- und Weltkennzahlen sind auch international interessant |
| Gestaltung | Richtung A ("Messinstrument") | Neutraler Unterbau, später günstig umzubauen |
| Schriftart | Sora, selbst gehostet | Vom Nutzer gewünscht; Selbst-Hosting aus DSGVO-Gründen (Abschnitt 8.1) |
| Geräte | Ein mitwachsendes Layout | Telefon und Rechner gleichwertig (Abschnitt 8.2) |

### Zur Gestaltung

Richtung A wurde bewusst als **vorläufiger** Stand gewählt: Der Nutzer will erst
etwas Funktionierendes sehen und die Optik danach verfeinern. Daraus folgt eine
harte Anforderung an die Umsetzung:

> Farben, Abstände, Schriftgrößen und Radien liegen zentral als Design-Tokens in
> einer Datei. Komponenten referenzieren ausschließlich Tokens, niemals feste
> Werte. Ein Richtungswechsel muss eine Datei betreffen, keinen Umbau.

Die Überschriften-Idee aus Entwurf C (die Einordnung als Satz über dem Chart)
bleibt als spätere Ergänzung möglich, ohne die Datenschicht zu berühren.

## 3. Datenquellen

Alle hier gelisteten Quellen wurden am 2026-09-16 auf Verfügbarkeit, Frequenz und
Zugangsweg geprüft.

| Kennzahl | Quelle | Zugang | Frequenz | Historie |
|---|---|---|---|---|
| Gasspeicher DE + EU | GIE AGSI+ | JSON-API, freier Key (läuft nicht ab) | täglich | ja |
| Rohöl Brent / WTI | EIA API v2 | JSON-API, freier Key | börsentäglich | Jahrzehnte |
| US-Ölreserve (SPR) | EIA API v2 | JSON-API, freier Key | wöchentlich | Jahrzehnte |
| Benzin, Diesel, Heizöl DE | EU Weekly Oil Bulletin | xlsx-Download | wöchentlich (Do) | seit 2005 |
| Gaspreis Europa (TTF) | FRED (IMF-Reihe) | JSON-API, freier Key | monatlich | seit 1992 |

### Anmerkungen

- **Das EU Oil Bulletin deckt drei Kennzahlen mit einer Quelle ab** und liefert
  Preise wahlweise mit und ohne Steuern. Daraus ergibt sich der Steueranteil beim
  Sprit praktisch geschenkt — erfahrungsgemäß die meistdiskutierte Zahl überhaupt.
  Tankerkönig/MTS-K wird dadurch nicht benötigt; dessen Lizenzfrage entfällt.
- **Tagesaktuelle TTF-Kurse sind lizenzpflichtig** (ICE, EEX). Frei verfügbar ist
  nur die IMF-Monatsreihe über FRED. Für die Verlaufsdarstellung ausreichend,
  für einen tagesaktuellen Gas-Ticker nicht. Das ist eine Datenmarktgrenze, keine
  technische Lücke.
- **Ein täglicher Abruf genügt für alle Kennzahlen.** Die schnellste Quelle
  (Gasspeicher) aktualisiert täglich, alle übrigen wöchentlich oder monatlich.
- **AGSI+ liefert alle EU-Länder mit**, das MVP zeigt jedoch nur Deutschland.
  Eine europäische Ansicht ist später ohne neuen Datenabruf ergänzbar — die
  Daten liegen dann bereits im Repo.

### Bewusst nicht im MVP

- **Holzpellets** — C.A.R.M.E.N. e.V. erhebt monatlich bei rund 50 Anbietern,
  veröffentlicht aber ausschließlich als HTML ohne Angabe zu Nutzungsrechten.
  Scraping wäre rechtlich ungeklärt und technisch fragil. Nachrüstbar, sobald
  eine Nutzungserlaubnis vorliegt.
- **Weltweite strategische Ölreserven** — die IEA-Daten liegen hinter unklarer
  Lizenz. Sauber frei verfügbar ist nur die US-Reserve, die deshalb im MVP steht.

## 4. Das Einordnungs-Prinzip

Der fachliche Kern. Zwei Verfahren, je nach Art der Kennzahl.

### 4.1 Preise — drei feste Referenzpunkte

Für Brent, TTF, Benzin, Diesel und Heizöl:

| Referenz | Definition |
|---|---|
| **Vorjahr** | Wert am nächstgelegenen Datenpunkt vor 365 Tagen |
| **Vorkrise** | Arithmetisches Mittel aller Werte 2019-01-01 bis 2021-12-31 |
| **Höchststand 2022** | Maximum im Zeitraum 2022-01-01 bis 2022-12-31 |

Ausgegeben wird jeweils die prozentuale Abweichung des aktuellen Werts, gerundet
auf ganze Prozent. Ergebnis pro Kachel:

> **Diesel 1,72 €/l** — +4 % gegenüber Vorjahr, +21 % über Vorkrisenniveau,
> −28 % unter dem Höchststand 2022

**Granularität beachten:** Bei monatlichen Reihen (TTF) bedeutet "Vorjahr" den
gleichen Kalendermonat des Vorjahres, nicht den Tag. Die Vergleichsfunktion muss
die Auflösung der jeweiligen Reihe respektieren.

### 4.2 Gasspeicher — Zehn-Jahres-Korridor

Prozentwerte lassen sich hier nicht vergleichen, weil der Füllstand
jahreszeitlich schwankt: 68 % im September bedeuten etwas völlig anderes als
68 % im März.

Stattdessen wird für **jeden Kalendertag** aus den letzten zehn Jahren berechnet:

- **Minimum und Maximum** → ergeben das schattierte Band im Diagramm
- **Median** → ergibt die Aussage "üblich wären …"

Ergebnis:

> **68,4 % gefüllt** — für Mitte September liegen die Speicher üblicherweise
> bei 85 %

Das ist voraussichtlich die aussagekräftigste Einzelaussage der ganzen Seite.

### 4.3 Testbarkeit

Beide Verfahren sind reine Funktionen über Zeitreihen ohne Seiteneffekte. Sie
sind der Teil, der zwingend korrekt sein muss, und werden entsprechend mit
Vitest gegen feste Beispielreihen geprüft — inklusive der Randfälle: Lücken in
der Reihe, Schaltjahre, Reihen die vor 2019 beginnen, Monatsauflösung.

## 5. Architektur

### Datenfluss

```
GitHub Actions (Cron, täglich)
   │
   ├─ scripts/fetch/*   API-Abrufe mit Keys aus GitHub Secrets
   │                    → data/raw/*   (unveränderte Rohabzüge)
   │
   ├─ scripts/build-metrics.ts
   │                    Vereinheitlichung + Berechnung der Einordnung
   │                    → data/metrics/*.json
   │
   └─ Commit + Push
          │
          └─ Zweiter Workflow: Vite-Build → Deploy auf GitHub Pages
```

Die Webseite ist rein statisch und lädt ausschließlich die vorbereiteten
JSON-Dateien. Sie spricht zur Laufzeit mit keiner externen API.

### Warum dieser Weg

- **API-Keys bleiben sicher.** Alle Abrufe laufen serverseitig in der Action,
  die Keys liegen in den GitHub Secrets und erscheinen weder im Code noch im Build.
- **Besucher lösen keine API-Aufrufe aus.** Ob zehn oder zehntausend Leute die
  Seite aufrufen — es bleibt bei einem Abruf pro Tag und Quelle. Keine
  Rate-Limit-Probleme, keine Kosten.
- **Ausfälle bleiben folgenlos.** Fällt eine Quelle aus, zeigt die Seite den
  letzten bekannten Stand mit ehrlichem Datum statt einer Fehlermeldung. Bei fünf
  externen Abhängigkeiten ist das wesentlich.
- **Git wird zum Archiv.** Jeder Abruf ist ein Commit. Die Zeitreihe baut sich
  nachvollziehbar von selbst auf — relevant für später ergänzte Kennzahlen ohne
  freie Historie, etwa Pelletpreise.

### Verworfene Alternativen

- **Live-Proxy** (wie `api/smard.js` in Sunshift): Jeder Besucher müsste die
  vollständige Mehrjahres-Historie neu laden. Träge, verschwenderisch, und bei
  Rate Limits perspektivisch ein Problem.
- **Vercel Cron mit KV/Blob-Speicher:** Gleiche Idee, aber begrenzte
  Gratis-Kontingente und ohne die kostenlose Versionierung durch Git.

### Hosting

GitHub Pages. Das Repo muss dafür **öffentlich** sein — für die API-Keys
unkritisch, da diese in den Secrets liegen. Eine eigene Domain lässt sich später
per CNAME ergänzen.

## 6. Repo-Struktur

```
energielage/
├── .github/workflows/
│   ├── fetch-data.yml          # Cron täglich + manuell auslösbar
│   └── deploy.yml              # Build + Pages-Deploy bei Push auf main
├── scripts/
│   ├── fetch/
│   │   ├── agsi.ts             # Gasspeicher
│   │   ├── eia.ts              # Brent, WTI, SPR
│   │   ├── oil-bulletin.ts     # Benzin, Diesel, Heizöl (xlsx)
│   │   └── fred.ts             # TTF
│   ├── lib/
│   │   ├── context.ts          # Einordnungs-Berechnung (Abschnitt 4)
│   │   └── context.test.ts
│   └── build-metrics.ts
├── data/
│   ├── raw/                    # unveränderte Rohabzüge, nachvollziehbar
│   └── metrics/*.json          # was das Frontend lädt
├── src/
│   ├── theme.ts                # Design-Tokens — einziger Ort für Optik
│   ├── i18n/{de,en}.ts
│   ├── components/
│   └── App.tsx
└── docs/superpowers/specs/
```

## 7. Datenschema

Eine Datei pro Kennzahl unter `data/metrics/`. Einheitliche Hülle, kennzahl-
spezifischer `context`:

```jsonc
{
  "id": "diesel-de",
  "unit": "EUR/l",
  "fetchedAt": "2026-09-16T04:07:00Z",   // wann abgerufen
  "sourceDate": "2026-09-11",            // worauf sich der Wert bezieht
  "cadence": "weekly",
  "source": { "name": "EU Weekly Oil Bulletin", "url": "https://…" },
  "current": 1.72,
  "series": [ { "d": "2026-09-11", "v": 1.72 } ],
  "context": {
    "kind": "reference-points",
    "yearAgo":   { "value": 1.65, "deltaPct":   4 },
    "preCrisis": { "value": 1.42, "deltaPct":  21 },
    "peak2022":  { "value": 2.38, "deltaPct": -28 },
    "taxShare": 0.47
  }
}
```

Für den Gasspeicher stattdessen:

```jsonc
"context": {
  "kind": "seasonal-corridor",
  "typicalNow": 85.0,
  "corridor": [ { "doy": 1, "min": 55, "max": 88, "median": 75 } ]
}
```

**`fetchedAt` und `sourceDate` sind bewusst getrennt.** Nur so kann die Seite
ehrlich sagen, wie alt eine Zahl wirklich ist.

## 8. Frontend

**Stack:** Vite + React + TypeScript, Charts mit Recharts (in Sunshift bereits
im Einsatz). TypeScript abweichend von Sunshift, weil hier die Datenformen die
eigentliche Fehlerquelle sind.

### 8.1 Typografie

**Schriftart: Sora**, ausgeliefert als **selbst gehostete Dateien im Repo** —
nicht über das Google-Fonts-CDN.

Der Grund ist rechtlich, nicht technisch: Bindet eine Seite Google Fonts per CDN
ein, wird bei jedem Aufruf die IP-Adresse des Besuchers an Google übertragen. Das
LG München hat darin 2022 einen Verstoß gegen die DSGVO gesehen; in der Folge kam
es zu einer Abmahnwelle gegen deutsche Webseiten. Für eine öffentliche Seite unter
eigenem Namen ist Selbst-Hosting der einzig sinnvolle Weg — es kostet nichts außer
zwei Schriftdateien im Repo und ist obendrein schneller.

Eingebunden werden nur die tatsächlich benötigten Schnitte als WOFF2, mit
`font-display: swap` und einer System-Schrift als Rückfall.

**Zu prüfen beim Bau — Ziffern gleicher Breite.** Ein Dashboard mit wechselnden
Zahlen braucht Tabellenziffern (`font-variant-numeric: tabular-nums`), sonst
springt das Layout bei jedem Wert-Wechsel, weil eine `1` schmaler ist als eine `8`.
Ob Sora diese Funktion mitbringt, muss an den echten Schriftdateien geprüft
werden. Falls nicht, gibt es zwei Auswege: feste Mindestbreiten für die
Zahlenfelder, oder eine schmale Monospace-Schrift ausschließlich für die
Kennzahlen. Die Entscheidung fällt am sichtbaren Ergebnis, nicht vorab.

### 8.2 Darstellung auf allen Geräten

Die Seite muss auf dem Telefon genauso funktionieren wie am Rechner. Konkret:

- **Ein Layout, das mitwächst** — die Kacheln liegen am Rechner nebeneinander
  und auf dem Telefon untereinander. Kein getrennter Mobil-Aufbau.
- **Diagramme bleiben lesbar.** Auf schmalen Schirmen werden Achsenbeschriftungen
  ausgedünnt statt verkleinert; ein Chart mit unleserlicher Beschriftung ist
  wertlos. Die Diagramme skalieren über `viewBox`, nicht über feste Pixelmaße.
- **Bedienbar mit dem Daumen.** Das Aufklappen einer Kachel funktioniert per
  Antippen, die Trefferflächen sind mindestens 44 × 44 px groß.
- **Keine seitliche Scrollleiste**, auch nicht bei den breitesten Zahlen.
- **Geprüft wird an echten Breiten**, mindestens 375 px (Telefon), 768 px (Tablet)
  und 1280 px (Rechner).

**Aufbau** — eine Seite, kein Menü:

1. Kopfbereich: was das hier ist, Sprachumschalter
2. Sechs Kacheln mit Wert, Verlaufskurve und Einordnungszeile
3. Beim Antippen einer Kachel klappt der große Chart mit voller Historie auf
4. Fußbereich: Quellen mit Link, Link zu Sunshift

**Die sechs Kacheln:**

| Kachel | Kernzahl | Einordnung |
|---|---|---|
| Gasspeicher Deutschland | Füllstand % | Zehn-Jahres-Korridor |
| Benzin & Diesel | €/Liter | Drei Referenzpunkte + Steueranteil |
| Heizöl | €/100 l | Drei Referenzpunkte |
| Rohöl Brent | $/Barrel | Drei Referenzpunkte |
| Gaspreis Europa | €/MWh | Drei Referenzpunkte (monatlich) |
| US-Ölreserve | Mio. Barrel + % | Verlauf seit 2020 |

**Jede Kachel trägt ihr eigenes Stand-Datum.** Der Gasspeicher ist von gestern,
der Spritpreis von letztem Donnerstag, der TTF-Wert vom Monatswechsel. Eine
Seite, die alles gleich frisch aussehen lässt, verliert genau die
Glaubwürdigkeit, für die sie gebaut wird.

**Frische-Warnung:** Überschreitet `sourceDate` das für die jeweilige Frequenz
erwartete Alter deutlich, weist die Kachel sichtbar darauf hin, statt einen
veralteten Wert als aktuell zu zeigen.

## 9. Fehlerverhalten

| Fall | Verhalten |
|---|---|
| Eine Quelle antwortet nicht | Action bricht nicht ab; bisherige JSON bleibt bestehen; Kachel zeigt den alten Stand mit Datum |
| Alle Quellen fallen aus | Seite bleibt vollständig funktionsfähig mit dem letzten Stand |
| Antwortformat hat sich geändert | Abruf schlägt kontrolliert fehl und meldet sich über den fehlgeschlagenen Workflow |
| Wert wirkt unplausibel | Plausibilitätsgrenzen je Kennzahl; Ausreißer werden verworfen statt veröffentlicht |

## 10. Offene Punkte

- **FRED/IMF-Weiterverbreitung prüfen**, bevor die TTF-Reihe im öffentlichen Repo
  landet. Die zugrundeliegende Reihe stammt vom IWF; die Bedingungen müssen vor
  dem ersten Commit der Daten geklärt sein. Fällt das weg, entfällt die
  Gaspreis-Kachel im MVP.
- **xlsx-Bibliothek wählen** für das Oil Bulletin (SheetJS vs. exceljs) —
  Lizenz und Bezugsweg beim Bau prüfen.
- **Tabellenziffern in Sora prüfen** und bei Bedarf einen der beiden in
  Abschnitt 8.1 genannten Auswege wählen.
- **Gestaltung verfeinern**, sobald die Seite mit echten Daten läuft.
- **Domain** registrieren und per CNAME anbinden.

## 11. Nicht im Umfang

Bewusst weggelassen, um das MVP klein zu halten:

- Benutzerkonten, Personalisierung, Benachrichtigungen
- Prognosen oder Hochrechnungen — die Seite zeigt Gemessenes, nichts Geschätztes
- Strompreise und Strommix (deckt Sunshift bereits ab)
- Eigene API für Dritte
- Pelletpreise und weltweite Ölreserven (siehe Abschnitt 3)
