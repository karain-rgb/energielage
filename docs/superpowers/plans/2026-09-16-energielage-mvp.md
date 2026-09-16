# Energielage MVP — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine öffentlich erreichbare Webseite, die fünf deutsche und internationale Energiekennzahlen mit ihrer historischen Einordnung zeigt, täglich automatisch aktualisiert.

**Architecture:** Ein GitHub-Actions-Cronjob ruft die Quellen serverseitig ab, berechnet die Einordnung und legt fertige JSON-Dateien im Repo ab. Ein zweiter Workflow baut daraus eine statische Seite und veröffentlicht sie auf GitHub Pages. Die Seite spricht zur Laufzeit mit keiner externen API.

**Tech Stack:** Vite, React, TypeScript, Recharts, Vitest, exceljs, @fontsource-variable/sora

**Spec:** `docs/superpowers/specs/2026-09-16-energielage-design.md`

## Global Constraints

- **Sprache im Code:** Bezeichner und Commit-Botschaften auf Deutsch, wo es natürlich ist; Fachbegriffe bleiben englisch.
- **Design-Tokens:** Komponenten referenzieren ausschließlich Werte aus `src/theme.ts`. Keine festen Farben, Abstände oder Schriftgrößen in Komponenten.
- **Schriftart:** Sora, ausschließlich selbst gehostet über npm. Keine Einbindung von `fonts.googleapis.com` oder `fonts.gstatic.com` — weder im HTML noch im CSS.
- **Darstellung:** Ein mitwachsendes Layout. Geprüft bei 375 px, 768 px und 1280 px. Keine seitliche Scrollleiste.
- **Trefferflächen:** mindestens 44 × 44 px.
- **Datumsformat in allen Daten:** ISO `YYYY-MM-DD`.
- **Zwei Zeitangaben pro Kennzahl:** `fetchedAt` (wann abgerufen) und `sourceDate` (worauf sich der Wert bezieht) sind immer getrennt zu führen.
- **Node-Version:** 24 — gleiche Fassung lokal und in der CI (siehe Ruling 5 im Ledger).
- **Keine API-Schlüssel im Repo.** Alle Schlüssel kommen aus GitHub Secrets bzw. lokal aus `.env` (ist bereits in `.gitignore`).

## Abweichung von der Spezifikation

Die Spezifikation beschreibt den Korridor-Datensatz mit dem Feld `doy` (Tag im Jahr). Der Plan verwendet stattdessen `md` im Format `MM-TT`. Grund: Der Tag im Jahr verschiebt sich in Schaltjahren ab dem 1. März um eins, wodurch der 15. September eines Schaltjahres auf den 16. September eines Normaljahres abgebildet würde. Der Bucket nach Kalendertag vermeidet den Fehler vollständig.

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `src/types.ts` | Gemeinsame Datentypen für Skripte und Oberfläche |
| `scripts/lib/context.ts` | Einordnungs-Berechnung — reine Funktionen, das fachliche Herzstück |
| `scripts/lib/http.ts` | Ein einziger Abruf-Helfer mit Zeitlimit und Fehlerbehandlung |
| `scripts/sources/agsi.ts` | Gasspeicher: Parser + Abruf |
| `scripts/sources/eia.ts` | Brent und US-Ölreserve: Parser + Abruf |
| `scripts/sources/fred.ts` | TTF-Gaspreis: Parser + Abruf |
| `scripts/sources/oilBulletin.ts` | Benzin, Diesel, Heizöl aus der xlsx-Datei |
| `scripts/build-metrics.ts` | Führt Quellen und Einordnung zu `data/metrics/*.json` zusammen |
| `src/theme.ts` | Design-Tokens — der einzige Ort für Optik |
| `src/i18n/index.ts` | Übersetzungen DE/EN und Sprachwahl |
| `src/components/MetricTile.tsx` | Eine Kachel: Wert, Einordnung, Verlaufskurve |
| `src/components/CorridorChart.tsx` | Korridor-Diagramm für den Gasspeicher |
| `src/components/HistoryChart.tsx` | Verlaufsdiagramm für Preisreihen |
| `src/App.tsx` | Seitenaufbau, Laden der Kennzahlen, Sprachumschalter |

---

## Task 1: Projektgerüst und Einordnung nach Referenzpunkten

Legt das Projekt an und liefert direkt die wichtigste fachliche Funktion: den Vergleich eines aktuellen Werts gegen Vorjahr, Vorkrisenniveau und Höchststand 2022.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `src/types.ts`
- Create: `scripts/lib/context.ts`
- Test: `scripts/lib/context.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `SeriesPoint`, `Cadence`, `ReferencePoint`, `ReferencePointsContext`, `Metric` aus `src/types.ts`; `referencePoints(series: SeriesPoint[], cadence: Cadence): ReferencePointsContext` aus `scripts/lib/context.ts`

- [ ] **Step 1: Projekt anlegen**

```bash
cd /Users/janoppermann/Documents/energielage
npm init -y
npm i react react-dom recharts
npm i -D vite @vitejs/plugin-react typescript vitest tsx @types/react @types/react-dom @types/node
```

- [ ] **Step 2: Konfiguration schreiben**

`package.json` — Felder `type`, `scripts` ersetzen:

```json
{
  "name": "energielage",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "fetch": "tsx scripts/build-metrics.ts"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "scripts"]
}
```

`vite.config.ts` — `base` gilt für ein GitHub-Pages-Projektverzeichnis; bei eigener Domain später auf `"/"` ändern:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/energielage/",
  plugins: [react()],
});
```

`index.html`:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Energielage</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/App.tsx`:

```tsx
export function App() {
  return <h1>Energielage</h1>;
}
```

- [ ] **Step 3: Datentypen schreiben**

`src/types.ts`:

```ts
export type Cadence = "daily" | "weekly" | "monthly";

export interface SeriesPoint {
  d: string;
  v: number;
}

export interface ReferencePoint {
  value: number;
  deltaPct: number;
}

export interface ReferencePointsContext {
  kind: "reference-points";
  yearAgo: ReferencePoint | null;
  preCrisis: ReferencePoint | null;
  peak2022: ReferencePoint | null;
  taxShare?: number;
}

export interface CorridorDay {
  md: string;
  min: number;
  max: number;
  median: number;
}

export interface SeasonalCorridorContext {
  kind: "seasonal-corridor";
  typicalNow: number | null;
  corridor: CorridorDay[];
}

export type MetricContext = ReferencePointsContext | SeasonalCorridorContext;

export interface Metric {
  id: string;
  unit: string;
  fetchedAt: string;
  sourceDate: string;
  cadence: Cadence;
  source: { name: string; url: string };
  current: number;
  series: SeriesPoint[];
  context: MetricContext;
}
```

- [ ] **Step 4: Den fehlschlagenden Test schreiben**

`scripts/lib/context.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { referencePoints } from "./context";
import type { SeriesPoint } from "../../src/types";

const series: SeriesPoint[] = [
  { d: "2019-06-01", v: 1.0 },
  { d: "2020-06-01", v: 1.2 },
  { d: "2021-06-01", v: 1.4 },
  { d: "2022-03-01", v: 2.4 },
  { d: "2022-12-01", v: 2.0 },
  { d: "2025-09-10", v: 1.5 },
  { d: "2026-09-12", v: 1.8 },
];

describe("referencePoints", () => {
  it("vergleicht gegen Vorjahr, Vorkrise und Höchststand 2022", () => {
    const ctx = referencePoints(series, "weekly");
    expect(ctx.yearAgo).toEqual({ value: 1.5, deltaPct: 20 });
    expect(ctx.preCrisis).toEqual({ value: 1.2, deltaPct: 50 });
    expect(ctx.peak2022).toEqual({ value: 2.4, deltaPct: -25 });
  });

  it("nimmt bei Monatsreihen den gleichen Monat des Vorjahres", () => {
    const monthly: SeriesPoint[] = [
      { d: "2025-09-01", v: 40 },
      { d: "2025-10-01", v: 44 },
      { d: "2026-09-01", v: 50 },
    ];
    const ctx = referencePoints(monthly, "monthly");
    expect(ctx.yearAgo).toEqual({ value: 40, deltaPct: 25 });
  });

  it("liefert null, wenn ein Bezugszeitraum keine Daten hat", () => {
    const ctx = referencePoints([{ d: "2026-09-12", v: 1.8 }], "weekly");
    expect(ctx.preCrisis).toBeNull();
    expect(ctx.peak2022).toBeNull();
    expect(ctx.yearAgo).toBeNull();
  });
});
```

- [ ] **Step 5: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/lib/context.test.ts`
Expected: FAIL — `referencePoints` existiert nicht

- [ ] **Step 6: Implementierung schreiben**

`scripts/lib/context.ts`:

```ts
import type {
  Cadence,
  ReferencePoint,
  ReferencePointsContext,
  SeriesPoint,
} from "../../src/types";

const PRE_CRISIS_FROM = "2019-01-01";
const PRE_CRISIS_TO = "2021-12-31";

function sorted(series: SeriesPoint[]): SeriesPoint[] {
  return [...series].sort((a, b) => a.d.localeCompare(b.d));
}

function makeRef(current: number, value: number | null): ReferencePoint | null {
  if (value === null || value === 0) return null;
  return { value, deltaPct: Math.round(((current - value) / value) * 100) };
}

function findYearAgo(points: SeriesPoint[], cadence: Cadence): number | null {
  const last = points[points.length - 1];
  if (!last) return null;

  if (cadence === "monthly") {
    const target = `${Number(last.d.slice(0, 4)) - 1}-${last.d.slice(5, 7)}`;
    const hit = points.find((p) => p.d.startsWith(target));
    return hit ? hit.v : null;
  }

  const targetMs = Date.parse(last.d) - 365 * 24 * 3600 * 1000;
  let best: SeriesPoint | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    if (p.d === last.d) continue;
    const dist = Math.abs(Date.parse(p.d) - targetMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  // Mehr als 60 Tage daneben ist kein Vorjahresvergleich mehr.
  if (!best || bestDist > 60 * 24 * 3600 * 1000) return null;
  return best.v;
}

export function referencePoints(
  series: SeriesPoint[],
  cadence: Cadence
): ReferencePointsContext {
  const points = sorted(series);
  const last = points[points.length - 1];
  const current = last ? last.v : 0;

  const preCrisisValues = points
    .filter((p) => p.d >= PRE_CRISIS_FROM && p.d <= PRE_CRISIS_TO)
    .map((p) => p.v);
  const preCrisisMean = preCrisisValues.length
    ? preCrisisValues.reduce((a, b) => a + b, 0) / preCrisisValues.length
    : null;

  const values2022 = points
    .filter((p) => p.d.startsWith("2022"))
    .map((p) => p.v);
  const peak = values2022.length ? Math.max(...values2022) : null;

  return {
    kind: "reference-points",
    yearAgo: makeRef(current, findYearAgo(points, cadence)),
    preCrisis: makeRef(current, preCrisisMean),
    peak2022: makeRef(current, peak),
  };
}
```

- [ ] **Step 7: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run scripts/lib/context.test.ts`
Expected: PASS — 3 Tests

- [ ] **Step 8: Committen**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src scripts
git commit -m "feat: Projektgerüst und Einordnung nach Referenzpunkten"
```

---

## Task 2: Einordnung nach saisonalem Korridor

Der Gasspeicher lässt sich nicht prozentual vergleichen, weil sein Füllstand jahreszeitlich schwankt. Diese Funktion berechnet aus den Vorjahren, was zu einem Kalendertag üblich ist.

**Files:**
- Modify: `scripts/lib/context.ts`
- Test: `scripts/lib/corridor.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint`, `SeasonalCorridorContext`, `CorridorDay` aus `src/types.ts`
- Produces: `seasonalCorridor(series: SeriesPoint[], today: string, years?: number): SeasonalCorridorContext`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`scripts/lib/corridor.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { seasonalCorridor } from "./context";
import type { SeriesPoint } from "../../src/types";

const series: SeriesPoint[] = [
  { d: "2022-09-15", v: 80 },
  { d: "2023-09-15", v: 90 },
  { d: "2024-09-15", v: 70 },
  { d: "2025-09-15", v: 85 },
  { d: "2026-09-15", v: 68 },
];

describe("seasonalCorridor", () => {
  it("berechnet Spanne und Median je Kalendertag aus den Vorjahren", () => {
    const ctx = seasonalCorridor(series, "2026-09-15", 10);
    const day = ctx.corridor.find((c) => c.md === "09-15");
    expect(day).toEqual({ md: "09-15", min: 70, max: 90, median: 82.5 });
  });

  it("schließt das laufende Jahr aus, damit der Wert nicht sein eigener Maßstab wird", () => {
    const ctx = seasonalCorridor(series, "2026-09-15", 10);
    expect(ctx.typicalNow).toBe(82.5);
  });

  it("bildet Kalendertage über Schaltjahre hinweg korrekt aufeinander ab", () => {
    const leap: SeriesPoint[] = [
      { d: "2024-03-01", v: 40 },
      { d: "2025-03-01", v: 50 },
      { d: "2026-03-01", v: 30 },
    ];
    const ctx = seasonalCorridor(leap, "2026-03-01", 10);
    const day = ctx.corridor.find((c) => c.md === "03-01");
    expect(day).toEqual({ md: "03-01", min: 40, max: 50, median: 45 });
  });

  it("liefert null, wenn es für heute keine Vorjahreswerte gibt", () => {
    const ctx = seasonalCorridor([{ d: "2026-09-15", v: 68 }], "2026-09-15", 10);
    expect(ctx.typicalNow).toBeNull();
  });
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/lib/corridor.test.ts`
Expected: FAIL — `seasonalCorridor` existiert nicht

- [ ] **Step 3: Implementierung ergänzen**

An `scripts/lib/context.ts` anhängen:

```ts
import type { CorridorDay, SeasonalCorridorContext } from "../../src/types";

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

export function seasonalCorridor(
  series: SeriesPoint[],
  today: string,
  years = 10
): SeasonalCorridorContext {
  const currentYear = Number(today.slice(0, 4));
  const earliestYear = currentYear - years;

  const buckets = new Map<string, number[]>();
  for (const p of series) {
    const year = Number(p.d.slice(0, 4));
    // Das laufende Jahr darf nicht sein eigener Maßstab sein.
    if (year >= currentYear || year < earliestYear) continue;
    const md = p.d.slice(5, 10);
    const bucket = buckets.get(md);
    if (bucket) bucket.push(p.v);
    else buckets.set(md, [p.v]);
  }

  const corridor: CorridorDay[] = [...buckets.entries()]
    .map(([md, values]) => ({
      md,
      min: Math.min(...values),
      max: Math.max(...values),
      median: median(values),
    }))
    .sort((a, b) => a.md.localeCompare(b.md));

  const todayMd = today.slice(5, 10);
  const todayEntry = corridor.find((c) => c.md === todayMd);

  return {
    kind: "seasonal-corridor",
    typicalNow: todayEntry ? todayEntry.median : null,
    corridor,
  };
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 7 Tests insgesamt

- [ ] **Step 5: Committen**

```bash
git add scripts/lib
git commit -m "feat: saisonaler Zehn-Jahres-Korridor für den Gasspeicher"
```

---

## Task 3: Gasspeicher abrufen

Erste echte Quelle. Der Parser wird getestet, der Netzabruf bleibt eine dünne Hülle darum.

**Vorbedingung:** Kostenloser API-Schlüssel unter https://agsi.gie.eu/account anlegen, lokal in `.env` als `AGSI_KEY=...` ablegen.

**Files:**
- Create: `scripts/lib/http.ts`
- Create: `scripts/sources/agsi.ts`
- Test: `scripts/sources/agsi.test.ts`

**Interfaces:**
- Consumes: `SeriesPoint` aus `src/types.ts`
- Produces: `parseAgsi(raw: unknown): SeriesPoint[]`, `fetchAgsi(apiKey: string, country?: string): Promise<SeriesPoint[]>`, `getJson(url: string, headers?: Record<string, string>): Promise<unknown>`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`scripts/sources/agsi.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseAgsi } from "./agsi";

const antwort = {
  last_page: 1,
  data: [
    { gasDayStart: "2026-09-15", full: "68.42", gasInStorage: "170.11" },
    { gasDayStart: "2026-09-14", full: "68.01", gasInStorage: "169.10" },
    { gasDayStart: "2026-09-13", full: "-", gasInStorage: "-" },
  ],
};

describe("parseAgsi", () => {
  it("liest Datum und Füllstand und sortiert aufsteigend", () => {
    expect(parseAgsi(antwort)).toEqual([
      { d: "2026-09-14", v: 68.01 },
      { d: "2026-09-15", v: 68.42 },
    ]);
  });

  it("verwirft Einträge ohne verwertbaren Zahlenwert", () => {
    expect(parseAgsi(antwort)).toHaveLength(2);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseAgsi({ irgendwas: true })).toEqual([]);
  });
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/sources/agsi.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 3: Abruf-Helfer schreiben**

`scripts/lib/http.ts`:

```ts
export async function getJson(
  url: string,
  headers: Record<string, string> = {}
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`${url} antwortete mit ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Parser und Abruf schreiben**

`scripts/sources/agsi.ts`:

```ts
import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

export function parseAgsi(raw: unknown): SeriesPoint[] {
  const data = (raw as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  const points: SeriesPoint[] = [];
  for (const row of data) {
    const d = (row as { gasDayStart?: unknown }).gasDayStart;
    const v = Number((row as { full?: unknown }).full);
    if (typeof d === "string" && Number.isFinite(v)) {
      points.push({ d, v });
    }
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

// Zahl der Rohzeilen einer Antwortseite — unabhängig davon, wie viele davon
// verwertbare Werte tragen.
export function rohZeilenAnzahl(raw: unknown): number {
  const data = (raw as { data?: unknown })?.data;
  return Array.isArray(data) ? data.length : 0;
}

export async function fetchAgsi(
  apiKey: string,
  country = "DE"
): Promise<SeriesPoint[]> {
  // Nach Datum abgelegt: Wird zwischen zwei Abrufen ein neuer Gastag
  // veröffentlicht, verschieben sich die Seitengrenzen und ein Datum käme
  // doppelt — das würde den Median der Korridor-Berechnung verzerren.
  const nachDatum = new Map<string, number>();

  // AGSI+ blättert seitenweise; für den Zehn-Jahres-Korridor brauchen wir alles.
  for (let page = 1; page <= 60; page++) {
    const url = `https://agsi.gie.eu/api?country=${country}&size=300&page=${page}`;
    const raw = await getJson(url, { "x-key": apiKey });

    // Abbruch am Rohbestand, nicht am gefilterten Ergebnis: Eine Seite, auf der
    // zufällig kein Wert verwertbar ist, ist nicht das Ende der Reihe.
    if (rohZeilenAnzahl(raw) === 0) break;

    for (const p of parseAgsi(raw)) nachDatum.set(p.d, p.v);

    const lastPage = Number((raw as { last_page?: unknown }).last_page);
    if (Number.isFinite(lastPage) && page >= lastPage) break;
  }

  return [...nachDatum]
    .map(([d, v]) => ({ d, v }))
    .sort((a, b) => a.d.localeCompare(b.d));
}
```

- [ ] **Step 5: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 10 Tests insgesamt

- [ ] **Step 6: Abruf gegen die echte API prüfen**

```bash
AGSI_KEY=$(grep AGSI_KEY .env | cut -d= -f2) npx tsx -e "
import { fetchAgsi } from './scripts/sources/agsi';
const p = await fetchAgsi(process.env.AGSI_KEY!);
console.log('Punkte:', p.length, '| ältester:', p[0]?.d, '| neuester:', p.at(-1)?.d);
"
```

Expected: mehrere tausend Punkte, ältester um 2011, neuester von gestern. Schlägt das fehl, ist der Schlüssel falsch oder die API-Form hat sich geändert — vor dem Weitermachen klären.

- [ ] **Step 7: Committen**

```bash
git add scripts/lib/http.ts scripts/sources
git commit -m "feat: Gasspeicher-Abruf über GIE AGSI+"
```

---

## Task 4: Kennzahl-Datei für den Gasspeicher erzeugen

Verbindet Abruf und Einordnung zur ersten fertigen JSON-Datei, die die Oberfläche später lädt.

**Files:**
- Create: `scripts/build-metrics.ts`
- Create: `data/metrics/.gitkeep`
- Test: `scripts/build-metrics.test.ts`

**Interfaces:**
- Consumes: `fetchAgsi`, `seasonalCorridor`, `Metric`
- Produces: `buildGasStorage(series: SeriesPoint[], fetchedAt: string): Metric`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`scripts/build-metrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGasStorage } from "./build-metrics";
import type { SeriesPoint } from "../src/types";

const series: SeriesPoint[] = [
  { d: "2024-09-15", v: 70 },
  { d: "2025-09-15", v: 90 },
  { d: "2026-09-15", v: 68.4 },
];

describe("buildGasStorage", () => {
  it("setzt den jüngsten Wert als aktuellen Stand", () => {
    const m = buildGasStorage(series, "2026-09-16T04:07:00Z");
    expect(m.current).toBe(68.4);
    expect(m.sourceDate).toBe("2026-09-15");
  });

  it("trennt Abrufzeitpunkt und Datenstand", () => {
    const m = buildGasStorage(series, "2026-09-16T04:07:00Z");
    expect(m.fetchedAt).toBe("2026-09-16T04:07:00Z");
    expect(m.fetchedAt).not.toBe(m.sourceDate);
  });

  it("hängt den saisonalen Korridor an", () => {
    const m = buildGasStorage(series, "2026-09-16T04:07:00Z");
    expect(m.context.kind).toBe("seasonal-corridor");
    if (m.context.kind === "seasonal-corridor") {
      expect(m.context.typicalNow).toBe(80);
    }
  });
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/build-metrics.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 3: Implementierung schreiben**

`scripts/build-metrics.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { fetchAgsi } from "./sources/agsi";
import { seasonalCorridor } from "./lib/context";
import type { Metric, SeriesPoint } from "../src/types";

export function buildGasStorage(
  series: SeriesPoint[],
  fetchedAt: string
): Metric {
  const last = series[series.length - 1];
  if (!last) throw new Error("Gasspeicher: leere Reihe");

  return {
    id: "gas-storage-de",
    unit: "%",
    fetchedAt,
    sourceDate: last.d,
    cadence: "daily",
    source: {
      name: "GIE AGSI+",
      url: "https://agsi.gie.eu/",
    },
    current: last.v,
    series,
    context: seasonalCorridor(series, last.d),
  };
}

async function schreibe(metric: Metric): Promise<void> {
  await mkdir("data/metrics", { recursive: true });
  await writeFile(
    `data/metrics/${metric.id}.json`,
    JSON.stringify(metric, null, 2) + "\n",
    "utf8"
  );
  console.log(`${metric.id}: ${metric.current} ${metric.unit} (${metric.sourceDate})`);
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const key = process.env.AGSI_KEY;
  if (!key) throw new Error("AGSI_KEY fehlt");

  await schreibe(buildGasStorage(await fetchAgsi(key), fetchedAt));
}

// Nur ausführen, wenn direkt aufgerufen — nicht beim Import im Test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 13 Tests insgesamt

- [ ] **Step 5: Echte Datei erzeugen**

```bash
set -a && source .env && set +a && npm run fetch
```

Expected: `data/metrics/gas-storage-de.json` entsteht, Konsole zeigt den aktuellen Füllstand.

- [ ] **Step 6: Committen**

```bash
git add scripts/build-metrics.ts scripts/build-metrics.test.ts data/metrics
git commit -m "feat: Kennzahl-Datei für den Gasspeicher"
```

---

## Task 5: Oberfläche mit der ersten Kachel

Design-Tokens, selbst gehostete Schrift und eine Kachel, die die erzeugte JSON-Datei anzeigt. Ab hier ist etwas sichtbar.

**Files:**
- Create: `src/theme.ts`
- Create: `src/components/MetricTile.tsx`
- Create: `src/components/CorridorChart.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `Metric`, `SeasonalCorridorContext`
- Produces: `theme` aus `src/theme.ts`; `MetricTile({ metric })`; `CorridorChart({ metric })`

- [ ] **Step 1: Schrift selbst hosten**

```bash
npm i @fontsource-variable/sora
```

Schlägt das fehl, weil es das Variable-Paket nicht gibt, stattdessen `npm i @fontsource/sora` verwenden und in Schritt 2 statt `@fontsource-variable/sora` die benötigten Schnitte einzeln importieren (`@fontsource/sora/400.css`, `/600.css`).

Prüfen, dass nichts auf Google zeigt:

```bash
grep -rn "fonts.googleapis\|fonts.gstatic" src index.html || echo "sauber — keine CDN-Einbindung"
```

- [ ] **Step 2: Design-Tokens schreiben**

`src/theme.ts`:

```ts
export const theme = {
  color: {
    bg: "#ffffff",
    text: "#14161a",
    textMuted: "#6b7280",
    textFaint: "#9ca3af",
    rule: "#e3e5e8",
    ruleStrong: "#14161a",
    band: "#e5e7eb",
    signal: "#b45309",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
  font: {
    family: "'Sora Variable', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif",
    size: { label: 11, body: 13, lead: 15, value: 40 },
    weight: { normal: 400, medium: 500, bold: 600 },
  },
  radius: { sm: 0, md: 0 },
  maxWidth: 1100,
} as const;
```

- [ ] **Step 3: Korridor-Diagramm schreiben**

`src/components/CorridorChart.tsx`:

```tsx
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { theme } from "../theme";
import type { Metric, SeasonalCorridorContext } from "../types";

interface Props {
  metric: Metric;
}

export function CorridorChart({ metric }: Props) {
  if (metric.context.kind !== "seasonal-corridor") return null;
  const ctx: SeasonalCorridorContext = metric.context;

  const laufendesJahr = metric.sourceDate.slice(0, 4);
  const aktuell = new Map(
    metric.series
      .filter((p) => p.d.startsWith(laufendesJahr))
      .map((p) => [p.d.slice(5, 10), p.v])
  );

  const daten = ctx.corridor.map((c) => ({
    md: c.md,
    spanne: [c.min, c.max] as [number, number],
    jetzt: aktuell.get(c.md) ?? null,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <ComposedChart data={daten} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={theme.color.rule} vertical={false} />
          <XAxis
            dataKey="md"
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={{ stroke: theme.color.rule }}
            minTickGap={40}
            tickFormatter={(md: string) => md.slice(0, 2)}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={false}
            width={38}
            unit="%"
          />
          <Area
            dataKey="spanne"
            fill={theme.color.band}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            dataKey="jetzt"
            stroke={theme.color.ruleStrong}
            strokeWidth={1.8}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Kachel schreiben**

`src/components/MetricTile.tsx`:

```tsx
import type { ReactNode } from "react";
import { theme } from "../theme";
import type { Metric } from "../types";

interface Props {
  titel: string;
  metric: Metric;
  einordnung: ReactNode;
  chart: ReactNode;
}

export function MetricTile({ titel, metric, einordnung, chart }: Props) {
  return (
    <section
      style={{
        padding: theme.space.lg,
        borderTop: `1px solid ${theme.color.rule}`,
        fontFamily: theme.font.family,
        color: theme.color.text,
      }}
    >
      <div
        style={{
          fontSize: theme.font.size.label,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: theme.color.textMuted,
          marginBottom: theme.space.sm,
        }}
      >
        {titel}
      </div>

      <div
        style={{
          fontSize: theme.font.size.value,
          fontWeight: theme.font.weight.bold,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
        }}
      >
        {metric.current.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
        <span
          style={{
            fontSize: theme.font.size.lead,
            color: theme.color.textMuted,
            marginLeft: theme.space.xs,
          }}
        >
          {metric.unit}
        </span>
      </div>

      <div
        style={{
          marginTop: theme.space.sm,
          fontSize: theme.font.size.body,
          lineHeight: 1.45,
          color: theme.color.signal,
        }}
      >
        {einordnung}
      </div>

      <div style={{ marginTop: theme.space.md }}>{chart}</div>

      <div
        style={{
          marginTop: theme.space.sm,
          fontSize: theme.font.size.label,
          color: theme.color.textFaint,
        }}
      >
        Stand {new Date(metric.sourceDate).toLocaleDateString("de-DE")} · Quelle:{" "}
        <a
          href={metric.source.url}
          style={{ color: "inherit" }}
          target="_blank"
          rel="noreferrer"
        >
          {metric.source.name}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Seite zusammensetzen**

`src/main.tsx` — Schrift-Import als erste Zeile ergänzen:

```tsx
import "@fontsource-variable/sora";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { MetricTile } from "./components/MetricTile";
import { CorridorChart } from "./components/CorridorChart";
import { theme } from "./theme";
import type { Metric } from "./types";

import gasStorage from "../data/metrics/gas-storage-de.json";

export function App() {
  const [metric, setMetric] = useState<Metric | null>(null);

  useEffect(() => {
    setMetric(gasStorage as Metric);
  }, []);

  if (!metric) return null;

  const ctx = metric.context;
  const üblich =
    ctx.kind === "seasonal-corridor" && ctx.typicalNow !== null
      ? `Üblich sind um diese Jahreszeit ${ctx.typicalNow.toLocaleString("de-DE", {
          maximumFractionDigits: 0,
        })} %`
      : "Kein Vergleichswert verfügbar";

  return (
    <main
      style={{
        maxWidth: theme.maxWidth,
        margin: "0 auto",
        padding: theme.space.md,
        background: theme.color.bg,
        fontFamily: theme.font.family,
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: theme.font.weight.bold,
          letterSpacing: "-0.02em",
          borderBottom: `2px solid ${theme.color.ruleStrong}`,
          paddingBottom: theme.space.sm,
          margin: 0,
        }}
      >
        Energielage
      </h1>

      <MetricTile
        titel="Gasspeicher Deutschland"
        metric={metric}
        einordnung={üblich}
        chart={<CorridorChart metric={metric} />}
      />
    </main>
  );
}
```

- [ ] **Step 6: Im Browser prüfen**

Run: `npm run dev`

Prüfen:
- Füllstand und Korridor-Diagramm erscheinen
- Im Netzwerk-Reiter der Entwicklerwerkzeuge steht **kein** Eintrag zu `fonts.gstatic.com` oder `fonts.googleapis.com`
- Ziffern gleicher Breite: Wert kurz im Inspektor von `68,4` auf `11,1` ändern — springt die Breite, fehlt Sora die Tabellenziffern-Funktion. In dem Fall in `MetricTile.tsx` dem Wert-Element zusätzlich `minWidth: 3.5ch` geben und im Kommentar den Grund festhalten.
- Bei 375 px Breite (Gerätesimulation) keine seitliche Scrollleiste

- [ ] **Step 7: Committen**

```bash
git add package.json package-lock.json src
git commit -m "feat: Oberfläche mit Design-Tokens, Sora und der Gasspeicher-Kachel"
```

---

## Task 6: Automatischer Abruf und Veröffentlichung

Ab hier läuft die Seite öffentlich und aktualisiert sich selbst. Das ist der Punkt, an dem die riskanteste Integration bewiesen ist.

**Vorbedingung:** Öffentliches Repo `energielage` auf GitHub anlegen, als `origin` eintragen, `AGSI_KEY` unter Settings → Secrets and variables → Actions hinterlegen.

**Files:**
- Create: `.github/workflows/fetch-data.yml`
- Create: `.github/workflows/deploy.yml`
- Modify: `package.json` (Feld `engines`)

**Interfaces:**
- Consumes: `npm run fetch`, `npm run build`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Abruf-Workflow schreiben**

`.github/workflows/fetch-data.yml`:

```yaml
name: Daten abrufen

on:
  schedule:
    - cron: "17 4 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npm run fetch
        env:
          AGSI_KEY: ${{ secrets.AGSI_KEY }}
      - name: Änderungen committen
        run: |
          git config user.name "energielage-bot"
          git config user.email "actions@users.noreply.github.com"
          git add data/
          git diff --staged --quiet && echo "keine Änderung" && exit 0
          git commit -m "data: Abruf vom $(date -u +%Y-%m-%d)"
          git push
```

- [ ] **Step 2: Veröffentlichungs-Workflow schreiben**

`.github/workflows/deploy.yml`:

```yaml
name: Veröffentlichen

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Node-Vorgabe verbindlich machen**

Die Workflows pinnen die CI auf Node 24. Damit dieselbe Vorgabe auch lokal gilt und nicht bloß zufällig zutrifft, in `package.json` nach `"type": "module"` ergänzen:

```json
  "engines": {
    "node": ">=24"
  },
```

Prüfen, dass npm die Vorgabe sieht:

```bash
node -p "require('./package.json').engines.node"
```

Expected: `>=24`

- [ ] **Step 4: Pages aktivieren und hochladen**

```bash
git add .github
git commit -m "ci: täglicher Datenabruf und Veröffentlichung auf GitHub Pages"
git push -u origin main
```

Danach auf GitHub unter Settings → Pages die Quelle auf **GitHub Actions** stellen.

- [ ] **Step 5: Beide Workflows prüfen**

- Unter Actions den Workflow „Daten abrufen" von Hand auslösen. Expected: läuft durch, erzeugt entweder einen `data:`-Commit oder meldet „keine Änderung".
- „Veröffentlichen" läuft danach automatisch. Expected: grün, und die Seite ist unter `https://<nutzer>.github.io/energielage/` erreichbar und zeigt die Gasspeicher-Kachel.

Schlägt der Aufbau mit fehlenden Ressourcen fehl, stimmt `base` in `vite.config.ts` nicht mit dem Repo-Namen überein.

---

## Task 7: Rohöl und US-Ölreserve

Zwei Kennzahlen aus einer Quelle. Die EIA-API liefert beide im selben Antwortformat.

**Vorbedingung:** Kostenloser Schlüssel unter https://www.eia.gov/opendata/ anlegen, als `EIA_KEY` in `.env` und in den GitHub Secrets ablegen.

**Files:**
- Create: `scripts/sources/eia.ts`
- Test: `scripts/sources/eia.test.ts`
- Modify: `scripts/build-metrics.ts`
- Modify: `.github/workflows/fetch-data.yml:24`

**Interfaces:**
- Consumes: `getJson`, `referencePoints`, `SeriesPoint`, `Metric`
- Produces: `parseEia(raw: unknown): SeriesPoint[]`, `zahlOderNaN(roh: unknown): number`, `fetchEiaSeries(apiKey: string, route: string, seriesId: string): Promise<SeriesPoint[]>`, `buildPreisMetric(id, unit, cadence, quelle, series, fetchedAt): Metric`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`scripts/sources/eia.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseEia } from "./eia";

const antwort = {
  response: {
    data: [
      { period: "2026-09-11", value: 74.2 },
      { period: "2026-09-10", value: 73.8 },
      { period: "2026-09-09", value: null },
    ],
  },
};

describe("parseEia", () => {
  it("liest Zeitraum und Wert und sortiert aufsteigend", () => {
    expect(parseEia(antwort)).toEqual([
      { d: "2026-09-10", v: 73.8 },
      { d: "2026-09-11", v: 74.2 },
    ]);
  });

  it("ergänzt Monatsangaben zum ersten des Monats", () => {
    const monatlich = { response: { data: [{ period: "2026-08", value: 70 }] } };
    expect(parseEia(monatlich)).toEqual([{ d: "2026-08-01", v: 70 }]);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseEia({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/sources/eia.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 3: Implementierung schreiben**

`scripts/sources/eia.ts`:

```ts
import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

function normalisiereDatum(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  if (/^\d{4}$/.test(period)) return `${period}-01-01`;
  return period;
}

// Number(null) und Number("") ergeben 0, nicht NaN — fehlende Werte kämen
// sonst als echte Null-Messwerte durch.
export function zahlOderNaN(roh: unknown): number {
  if (roh === null || roh === undefined || roh === "") return NaN;
  return Number(roh);
}

export function parseEia(raw: unknown): SeriesPoint[] {
  const data = (raw as { response?: { data?: unknown } })?.response?.data;
  if (!Array.isArray(data)) return [];

  const points: SeriesPoint[] = [];
  for (const row of data) {
    const period = (row as { period?: unknown }).period;
    const v = zahlOderNaN((row as { value?: unknown }).value);
    if (typeof period === "string" && Number.isFinite(v)) {
      points.push({ d: normalisiereDatum(period), v });
    }
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

export async function fetchEiaSeries(
  apiKey: string,
  route: string,
  seriesId: string
): Promise<SeriesPoint[]> {
  const url =
    `https://api.eia.gov/v2/${route}/data/?api_key=${apiKey}` +
    `&frequency=daily&data[0]=value&facets[series][]=${seriesId}` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=5000`;
  return parseEia(await getJson(url));
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 16 Tests insgesamt

- [ ] **Step 5: Die echten Reihen-Kennungen ermitteln**

Die EIA-Kennungen und die passende Frequenz müssen an der echten API bestätigt werden, statt sie zu raten:

```bash
set -a && source .env && set +a
curl -s "https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=$EIA_KEY&frequency=daily&data[0]=value&length=3&sort[0][column]=period&sort[0][direction]=desc" | head -40
curl -s "https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=$EIA_KEY&frequency=weekly&data[0]=value&length=3&sort[0][column]=period&sort[0][direction]=desc" | head -40
```

Aus der Ausgabe die Kennung für Brent (Europe Brent Spot Price FOB) und für die strategische Reserve notieren und in Schritt 6 einsetzen. Weicht die Frequenz ab, `frequency` in `fetchEiaSeries` entsprechend parametrisieren.

- [ ] **Step 6: Kennzahlen ergänzen**

In `scripts/build-metrics.ts` ergänzen — `BRENT_ID` und `SPR_ID` mit den in Schritt 5 ermittelten Werten belegen:

```ts
import { fetchEiaSeries } from "./sources/eia";
import { referencePoints } from "./lib/context";

const BRENT_ID = "RBRTE";
const SPR_ID = "WCSSTUS1";

export function buildPreisMetric(
  id: string,
  unit: string,
  cadence: "daily" | "weekly" | "monthly",
  quelle: { name: string; url: string },
  series: SeriesPoint[],
  fetchedAt: string
): Metric {
  const last = series[series.length - 1];
  if (!last) throw new Error(`${id}: leere Reihe`);
  return {
    id,
    unit,
    fetchedAt,
    sourceDate: last.d,
    cadence,
    source: quelle,
    current: last.v,
    series,
    context: referencePoints(series, cadence),
  };
}
```

In `main()` ergänzen:

```ts
  const eiaKey = process.env.EIA_KEY;
  if (!eiaKey) throw new Error("EIA_KEY fehlt");

  await schreibe(
    buildPreisMetric(
      "brent",
      "USD/Barrel",
      "daily",
      { name: "U.S. Energy Information Administration", url: "https://www.eia.gov/opendata/" },
      await fetchEiaSeries(eiaKey, "petroleum/pri/spt", BRENT_ID),
      fetchedAt
    )
  );

  await schreibe(
    buildPreisMetric(
      "us-spr",
      "Mio. Barrel",
      "weekly",
      { name: "U.S. Energy Information Administration", url: "https://www.eia.gov/opendata/" },
      await fetchEiaSeries(eiaKey, "petroleum/stoc/wstk", SPR_ID),
      fetchedAt
    )
  );
```

- [ ] **Step 7: Schlüssel im Workflow ergänzen**

In `.github/workflows/fetch-data.yml` unter `env:` ergänzen:

```yaml
          EIA_KEY: ${{ secrets.EIA_KEY }}
```

- [ ] **Step 8: Abruf ausführen und Ergebnis prüfen**

```bash
set -a && source .env && set +a && npm run fetch
```

Expected: `brent.json` und `us-spr.json` entstehen. Die Brent-Reihe muss bis mindestens 2019 zurückreichen, sonst bleibt `preCrisis` leer.

- [ ] **Step 9: Committen**

```bash
git add scripts data/metrics .github
git commit -m "feat: Rohölpreis und US-Ölreserve über die EIA-API"
```

---

## Task 8: Gaspreis Europa — mit vorgeschalteter Rechteprüfung

Die TTF-Reihe stammt ursprünglich vom IWF und wird über FRED bezogen. Ob sie in einem öffentlichen Repo liegen darf, ist vor dem ersten Datencommit zu klären.

**Vorbedingung:** Kostenloser Schlüssel unter https://fredaccount.stlouisfed.org/apikeys, als `FRED_KEY` ablegen.

**Files:**
- Create: `scripts/sources/fred.ts`
- Test: `scripts/sources/fred.test.ts`
- Modify: `scripts/build-metrics.ts`
- Modify: `.github/workflows/fetch-data.yml`
- Modify: `docs/superpowers/specs/2026-09-16-energielage-design.md` (offenen Punkt auflösen)

**Interfaces:**
- Consumes: `getJson`, `buildPreisMetric`
- Produces: `parseFred(raw: unknown): SeriesPoint[]`, `fetchFred(apiKey: string, seriesId: string): Promise<SeriesPoint[]>`

- [ ] **Step 1: Rechtelage klären — Abbruchpunkt**

Die Nutzungsbedingungen der FRED-API und den Quellenhinweis der konkreten Reihe (`PNGASEUUSDM`) lesen:

```bash
open "https://fred.stlouisfed.org/series/PNGASEUUSDM"
open "https://fred.stlouisfed.org/docs/api/terms_of_use.html"
```

Zu beantworten ist genau eine Frage: **Dürfen die abgerufenen Werte in einem öffentlichen Repo gespeichert und auf einer öffentlichen Seite angezeigt werden?**

- Ja → mit Schritt 2 weitermachen.
- Nein oder unklar → diesen Task abbrechen, die Gaspreis-Kachel entfällt im MVP. Den offenen Punkt in der Spezifikation entsprechend auflösen und mit Task 9 weitermachen. Keine Daten committen, solange das ungeklärt ist.

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`scripts/sources/fred.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseFred } from "./fred";

const antwort = {
  observations: [
    { date: "2026-07-01", value: "32.10" },
    { date: "2026-08-01", value: "34.50" },
    { date: "2026-09-01", value: "." },
  ],
};

describe("parseFred", () => {
  it("liest Datum und Wert", () => {
    expect(parseFred(antwort)).toEqual([
      { d: "2026-07-01", v: 32.1 },
      { d: "2026-08-01", v: 34.5 },
    ]);
  });

  it("verwirft den Platzhalter für fehlende Werte", () => {
    expect(parseFred(antwort)).toHaveLength(2);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseFred({ fehler: "kaputt" })).toEqual([]);
  });
});
```

- [ ] **Step 3: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/sources/fred.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 4: Implementierung schreiben**

`scripts/sources/fred.ts`:

```ts
import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

export function parseFred(raw: unknown): SeriesPoint[] {
  const obs = (raw as { observations?: unknown })?.observations;
  if (!Array.isArray(obs)) return [];

  const points: SeriesPoint[] = [];
  for (const row of obs) {
    const d = (row as { date?: unknown }).date;
    // FRED schreibt "." für fehlende Beobachtungen.
    const v = Number((row as { value?: unknown }).value);
    if (typeof d === "string" && Number.isFinite(v)) {
      points.push({ d, v });
    }
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

export async function fetchFred(
  apiKey: string,
  seriesId: string
): Promise<SeriesPoint[]> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&file_type=json` +
    `&observation_start=2015-01-01`;
  return parseFred(await getJson(url));
}
```

- [ ] **Step 5: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 19 Tests insgesamt

- [ ] **Step 6: Kennzahl ergänzen**

In `scripts/build-metrics.ts` in `main()`:

```ts
  const fredKey = process.env.FRED_KEY;
  if (!fredKey) throw new Error("FRED_KEY fehlt");

  await schreibe(
    buildPreisMetric(
      "gas-ttf",
      "USD/MMBtu",
      "monthly",
      { name: "IWF über FRED", url: "https://fred.stlouisfed.org/series/PNGASEUUSDM" },
      await fetchFred(fredKey, "PNGASEUUSDM"),
      fetchedAt
    )
  );
```

Die Einheit ist an der echten Antwort zu prüfen und gegebenenfalls zu korrigieren — die IWF-Reihe wird in US-Dollar je MMBtu geführt, nicht in Euro je MWh wie in der Spezifikation angenommen. Weicht es ab, die Einheit hier und in der Spezifikation angleichen.

- [ ] **Step 7: Schlüssel im Workflow ergänzen**

```yaml
          FRED_KEY: ${{ secrets.FRED_KEY }}
```

- [ ] **Step 8: Committen**

```bash
set -a && source .env && set +a && npm run fetch
git add scripts data/metrics .github docs
git commit -m "feat: europäischer Gaspreis über FRED, Rechtelage geklärt"
```

---

## Task 9: Benzin, Diesel und Heizöl aus dem EU Oil Bulletin

Die aufwendigste Quelle: eine xlsx-Datei statt einer API. Der Aufbau der Datei wird zuerst untersucht, nicht erraten.

**Files:**
- Create: `scripts/sources/oilBulletin.ts`
- Create: `scripts/sources/__fixtures__/oil-bulletin-auszug.json`
- Test: `scripts/sources/oilBulletin.test.ts`
- Modify: `scripts/build-metrics.ts`

**Interfaces:**
- Consumes: `buildPreisMetric`, `SeriesPoint`
- Produces: `parseOilBulletin(rows: unknown[][], spalte: string): SeriesPoint[]`, `ladeBulletinZeilen(pfad: string): Promise<unknown[][]>`, `QUELLE_URL: string`

- [ ] **Step 1: Aufbau der echten Datei untersuchen**

```bash
npm i -D exceljs
```

Aktuelle Datei von https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en herunterladen (die Preisdatei **mit** Steuern) und den Aufbau ausgeben.

Das Untersuchungsskript kommt in eine Datei **außerhalb des Repos**, nicht als `tsx -e`-Einzeiler: `tsx` übersetzt `-e`-Code nach CommonJS, worin `await` auf oberster Ebene nicht erlaubt ist (in Task 3 bereits aufgetreten). Also `/tmp/inspect-bulletin.ts` anlegen:

```ts
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile("/tmp/oil-bulletin.xlsx");
wb.eachSheet((s) => {
  console.log("--- Blatt:", s.name, "| Zeilen:", s.rowCount);
  for (let i = 1; i <= Math.min(12, s.rowCount); i++) {
    console.log(i, JSON.stringify(s.getRow(i).values));
  }
});
```

Dann ausführen und danach löschen:

```bash
npx tsx /tmp/inspect-bulletin.ts
rm /tmp/inspect-bulletin.ts
```

Notieren: Name des relevanten Blatts, Zeile mit den Spaltenüberschriften, Spalte mit dem Datum, Spalten für Euro-Super 95, Diesel und Heizöl, sowie die Zeilen für Deutschland. **Erst danach** weiterarbeiten — die folgenden Schritte setzen diese Erkenntnisse ein.

- [ ] **Step 2: Fixture aus der echten Datei ableiten**

Aus der Untersuchung einen kleinen, echten Auszug als `scripts/sources/__fixtures__/oil-bulletin-auszug.json` speichern: ein Array von Zeilen-Arrays, das die Überschriftenzeile und drei Datenzeilen für Deutschland enthält. Beispielform, mit den tatsächlich vorgefundenen Werten zu füllen:

```json
[
  ["Country", "Date", "Euro-super 95", "Gas oil automotive", "Heating gas oil"],
  ["Germany", "2026-09-11", 1.812, 1.723, 1.021],
  ["Germany", "2026-09-04", 1.805, 1.716, 1.015],
  ["France", "2026-09-11", 1.902, 1.755, 1.101]
]
```

- [ ] **Step 3: Den fehlschlagenden Test schreiben**

`scripts/sources/oilBulletin.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseOilBulletin } from "./oilBulletin";
import rows from "./__fixtures__/oil-bulletin-auszug.json";

describe("parseOilBulletin", () => {
  it("liest die Dieselreihe für Deutschland", () => {
    expect(parseOilBulletin(rows as unknown[][], "Gas oil automotive")).toEqual([
      { d: "2026-09-04", v: 1.716 },
      { d: "2026-09-11", v: 1.723 },
    ]);
  });

  it("ignoriert andere Länder", () => {
    const punkte = parseOilBulletin(rows as unknown[][], "Euro-super 95");
    expect(punkte.every((p) => p.v < 1.9)).toBe(true);
  });

  it("wirft, wenn die gesuchte Spalte fehlt", () => {
    expect(() => parseOilBulletin(rows as unknown[][], "Gibt es nicht")).toThrow(
      /Spalte/
    );
  });
});
```

- [ ] **Step 4: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run scripts/sources/oilBulletin.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 5: Implementierung schreiben**

`scripts/sources/oilBulletin.ts` — Blattname und Land-Bezeichnung an die Erkenntnisse aus Schritt 1 anpassen:

```ts
import ExcelJS from "exceljs";
import { zahlOderNaN } from "./eia";
import type { SeriesPoint } from "../../src/types";

const LAND = "Germany";
const QUELLE_URL =
  "https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en";

function alsDatum(wert: unknown): string | null {
  if (wert instanceof Date) return wert.toISOString().slice(0, 10);
  if (typeof wert === "string" && /^\d{4}-\d{2}-\d{2}/.test(wert)) {
    return wert.slice(0, 10);
  }
  return null;
}

export function parseOilBulletin(
  rows: unknown[][],
  spalte: string
): SeriesPoint[] {
  const kopf = rows[0];
  if (!kopf) throw new Error("Oil Bulletin: keine Überschriftenzeile");

  const spaltenIndex = kopf.findIndex((z) => z === spalte);
  if (spaltenIndex === -1) {
    throw new Error(`Oil Bulletin: Spalte "${spalte}" nicht gefunden`);
  }
  const landIndex = kopf.findIndex((z) => z === "Country");
  const datumIndex = kopf.findIndex((z) => z === "Date");

  const points: SeriesPoint[] = [];
  for (const row of rows.slice(1)) {
    if (row[landIndex] !== LAND) continue;
    const d = alsDatum(row[datumIndex]);
    const v = zahlOderNaN(row[spaltenIndex]);
    if (d && Number.isFinite(v)) points.push({ d, v });
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

export async function ladeBulletinZeilen(pfad: string): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(pfad);
  const blatt = wb.worksheets[0];
  if (!blatt) throw new Error("Oil Bulletin: kein Tabellenblatt gefunden");

  const rows: unknown[][] = [];
  blatt.eachRow((row) => {
    const werte = row.values as unknown[];
    rows.push(werte.slice(1));
  });
  return rows;
}

export { QUELLE_URL };
```

- [ ] **Step 6: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 22 Tests insgesamt

- [ ] **Step 7: Kennzahlen ergänzen**

In `scripts/build-metrics.ts` zuerst den Import ergänzen:

```ts
import { ladeBulletinZeilen, parseOilBulletin, QUELLE_URL } from "./sources/oilBulletin";
```

Dann in `main()` — die Datei wird im Workflow vorher heruntergeladen:

```ts
  const zeilen = await ladeBulletinZeilen("data/raw/oil-bulletin.xlsx");
  const quelle = { name: "EU Weekly Oil Bulletin", url: QUELLE_URL };

  await schreibe(
    buildPreisMetric("diesel-de", "EUR/l", "weekly", quelle,
      parseOilBulletin(zeilen, "Gas oil automotive"), fetchedAt)
  );
  await schreibe(
    buildPreisMetric("benzin-de", "EUR/l", "weekly", quelle,
      parseOilBulletin(zeilen, "Euro-super 95"), fetchedAt)
  );
  await schreibe(
    buildPreisMetric("heizoel-de", "EUR/l", "weekly", quelle,
      parseOilBulletin(zeilen, "Heating gas oil"), fetchedAt)
  );
```

- [ ] **Step 8: Download in den Workflow aufnehmen**

In `.github/workflows/fetch-data.yml` vor `npm run fetch` einfügen — die tatsächliche Datei-Adresse aus Schritt 1 einsetzen:

```yaml
      - name: Oil Bulletin herunterladen
        run: |
          mkdir -p data/raw
          curl -fsSL -o data/raw/oil-bulletin.xlsx "<in Schritt 1 ermittelte Adresse>"
```

- [ ] **Step 9: Committen**

```bash
set -a && source .env && set +a && npm run fetch
git add scripts data/metrics data/raw .github package.json package-lock.json
git commit -m "feat: Benzin, Diesel und Heizöl aus dem EU Oil Bulletin"
```

---

## Task 10: Alle Kacheln, Verlaufsdiagramm und Aufklappen

Die Oberfläche zeigt bisher nur den Gasspeicher. Jetzt kommen die übrigen Kennzahlen dazu, mit Verlaufsdiagramm und aufklappbarem Detail.

**Files:**
- Create: `src/components/HistoryChart.tsx`
- Create: `src/metrics.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/MetricTile.tsx`

**Interfaces:**
- Consumes: `Metric`, `ReferencePointsContext`, `theme`
- Produces: `HistoryChart({ metric })`; `ALLE_METRIKEN: MetrikBeschreibung[]` aus `src/metrics.ts`

- [ ] **Step 1: Verlaufsdiagramm schreiben**

`src/components/HistoryChart.tsx`:

```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { theme } from "../theme";
import type { Metric } from "../types";

interface Props {
  metric: Metric;
  hoehe?: number;
}

export function HistoryChart({ metric, hoehe = 200 }: Props) {
  const daten = metric.series.filter((p) => p.d >= "2019-01-01");

  return (
    <div style={{ width: "100%", height: hoehe }}>
      <ResponsiveContainer>
        <LineChart data={daten} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={theme.color.rule} vertical={false} />
          <XAxis
            dataKey="d"
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={{ stroke: theme.color.rule }}
            minTickGap={50}
            tickFormatter={(d: string) => d.slice(0, 4)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={["auto", "auto"]}
          />
          <Line
            dataKey="v"
            stroke={theme.color.ruleStrong}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Kennzahl-Register schreiben**

`src/metrics.ts`:

```ts
import type { Metric } from "./types";

import gasStorage from "../data/metrics/gas-storage-de.json";
import benzin from "../data/metrics/benzin-de.json";
import diesel from "../data/metrics/diesel-de.json";
import heizoel from "../data/metrics/heizoel-de.json";
import brent from "../data/metrics/brent.json";
import spr from "../data/metrics/us-spr.json";
import gasTtf from "../data/metrics/gas-ttf.json";

export interface MetrikBeschreibung {
  metric: Metric;
  titelKey: string;
}

export const ALLE_METRIKEN: MetrikBeschreibung[] = [
  { metric: gasStorage as Metric, titelKey: "gasStorage" },
  { metric: benzin as Metric, titelKey: "benzin" },
  { metric: diesel as Metric, titelKey: "diesel" },
  { metric: heizoel as Metric, titelKey: "heizoel" },
  { metric: brent as Metric, titelKey: "brent" },
  { metric: gasTtf as Metric, titelKey: "gasTtf" },
  { metric: spr as Metric, titelKey: "spr" },
];
```

**Zwei Abweichungen von der Spezifikation, beide bewusst:**

Die Spezifikation fasst Benzin und Diesel in einer Kachel zusammen; hier bekommt jedes seine eigene. Grund: Beide sind eigenständige Reihen mit eigener Einordnung, und eine Kachel mit zwei Werten und zwei Referenzpunkt-Sätzen wird unleserlich. Damit sind es sieben Kacheln statt sechs.

Entfiel die Gaspreis-Kachel in Task 8 wegen ungeklärter Rechtelage, entfallen hier Import und Eintrag `gasTtf` — dann sind es sechs.

- [ ] **Step 3: Kachel um Aufklappen erweitern**

In `src/components/MetricTile.tsx` die Signatur um `detail` und `offen`/`onToggle` ergänzen und den Kopfbereich als Schaltfläche ausführen:

```tsx
interface Props {
  titel: string;
  metric: Metric;
  einordnung: ReactNode;
  chart: ReactNode;
  detail?: ReactNode;
  offen?: boolean;
  onToggle?: () => void;
}
```

Den äußeren Inhalt in eine Schaltfläche mit ausreichender Trefferfläche legen:

```tsx
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        style={{
          all: "unset",
          display: "block",
          width: "100%",
          minHeight: 44,
          cursor: detail ? "pointer" : "default",
        }}
      >
        {/* Titel, Wert, Einordnung wie bisher */}
      </button>
      {offen && detail}
```

- [ ] **Step 4: Seite auf alle Kacheln umstellen**

`src/App.tsx` — Raster, das am Rechner zweispaltig und auf dem Telefon einspaltig läuft:

```tsx
import { useState } from "react";
import { MetricTile } from "./components/MetricTile";
import { CorridorChart } from "./components/CorridorChart";
import { HistoryChart } from "./components/HistoryChart";
import { ALLE_METRIKEN } from "./metrics";
import { theme } from "./theme";
import type { Metric } from "./types";

function einordnungText(metric: Metric): string {
  const ctx = metric.context;
  if (ctx.kind === "seasonal-corridor") {
    return ctx.typicalNow === null
      ? "Kein Vergleichswert verfügbar"
      : `Üblich sind um diese Jahreszeit ${ctx.typicalNow.toLocaleString("de-DE", {
          maximumFractionDigits: 0,
        })} %`;
  }
  const teile: string[] = [];
  if (ctx.yearAgo) teile.push(`${vorzeichen(ctx.yearAgo.deltaPct)} gegenüber Vorjahr`);
  if (ctx.preCrisis) teile.push(`${vorzeichen(ctx.preCrisis.deltaPct)} zum Vorkrisenniveau`);
  if (ctx.peak2022) teile.push(`${vorzeichen(ctx.peak2022.deltaPct)} zum Höchststand 2022`);
  return teile.length ? teile.join(", ") : "Keine Vergleichswerte verfügbar";
}

function vorzeichen(pct: number): string {
  return pct > 0 ? `+${pct} %` : `${pct} %`;
}

// Vorläufige Beschriftungen. Task 11 ersetzt sie durch t(titelKey, sprache)
// und löscht diese Tabelle.
const LABELS: Record<string, string> = {
  gasStorage: "Gasspeicher Deutschland",
  benzin: "Benzin (Super E5)",
  diesel: "Diesel",
  heizoel: "Heizöl",
  brent: "Rohöl Brent",
  gasTtf: "Gaspreis Europa",
  spr: "US-Ölreserve",
};

export function App() {
  const [offen, setOffen] = useState<string | null>(null);

  return (
    <main
      style={{
        maxWidth: theme.maxWidth,
        margin: "0 auto",
        padding: theme.space.md,
        fontFamily: theme.font.family,
        color: theme.color.text,
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: theme.font.weight.bold,
          letterSpacing: "-0.02em",
          borderBottom: `2px solid ${theme.color.ruleStrong}`,
          paddingBottom: theme.space.sm,
          margin: 0,
        }}
      >
        Energielage
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 0,
        }}
      >
        {ALLE_METRIKEN.map(({ metric, titelKey }) => (
          <MetricTile
            key={metric.id}
            titel={LABELS[titelKey] ?? titelKey}
            metric={metric}
            einordnung={einordnungText(metric)}
            chart={
              metric.context.kind === "seasonal-corridor" ? (
                <CorridorChart metric={metric} />
              ) : (
                <HistoryChart metric={metric} hoehe={120} />
              )
            }
            detail={<HistoryChart metric={metric} hoehe={260} />}
            offen={offen === metric.id}
            onToggle={() => setOffen(offen === metric.id ? null : metric.id)}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Im Browser prüfen**

Run: `npm run dev`

Prüfen bei 375 px, 768 px und 1280 px:
- Alle Kacheln erscheinen, einspaltig auf dem Telefon, mehrspaltig am Rechner
- Antippen klappt das große Diagramm auf und wieder zu
- Keine seitliche Scrollleiste
- Achsenbeschriftungen bleiben auf 375 px lesbar

- [ ] **Step 6: Committen**

```bash
git add src
git commit -m "feat: alle Kacheln mit Verlaufsdiagramm und aufklappbarem Detail"
```

---

## Task 11: Zweisprachigkeit und Frische-Warnung

Deutsch und Englisch, plus der ehrliche Hinweis, wenn eine Zahl älter ist als erwartet.

**Files:**
- Create: `src/i18n/index.ts`
- Test: `src/i18n/freshness.test.ts`
- Modify: `src/App.tsx`, `src/components/MetricTile.tsx`

**Interfaces:**
- Consumes: `Metric`, `Cadence`
- Produces: `t(key: string, sprache: Sprache): string`, `istVeraltet(metric: Metric, heute: string): boolean`, `Sprache = "de" | "en"`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/i18n/freshness.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { istVeraltet } from "./index";
import type { Metric } from "../types";

function metrik(cadence: Metric["cadence"], sourceDate: string): Metric {
  return {
    id: "test", unit: "%", fetchedAt: "2026-09-16T00:00:00Z",
    sourceDate, cadence, source: { name: "", url: "" },
    current: 1, series: [], context: { kind: "reference-points", yearAgo: null, preCrisis: null, peak2022: null },
  };
}

describe("istVeraltet", () => {
  it("erkennt eine frische Tagesreihe als aktuell", () => {
    expect(istVeraltet(metrik("daily", "2026-09-15"), "2026-09-16")).toBe(false);
  });

  it("schlägt bei einer Tagesreihe nach einer Woche an", () => {
    expect(istVeraltet(metrik("daily", "2026-09-08"), "2026-09-16")).toBe(true);
  });

  it("gibt Wochenreihen mehr Spielraum", () => {
    expect(istVeraltet(metrik("weekly", "2026-09-08"), "2026-09-16")).toBe(false);
  });

  it("gibt Monatsreihen den größten Spielraum", () => {
    expect(istVeraltet(metrik("monthly", "2026-08-01"), "2026-09-16")).toBe(false);
  });
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag bestätigen**

Run: `npx vitest run src/i18n/freshness.test.ts`
Expected: FAIL — Modul nicht gefunden

- [ ] **Step 3: Implementierung schreiben**

`src/i18n/index.ts`:

```ts
import type { Cadence, Metric } from "../types";

export type Sprache = "de" | "en";

const TEXTE: Record<string, Record<Sprache, string>> = {
  titel: { de: "Energielage", en: "Energy Status" },
  untertitel: {
    de: "Energiekennzahlen für Deutschland, täglich aktualisiert",
    en: "German energy indicators, updated daily",
  },
  gasStorage: { de: "Gasspeicher Deutschland", en: "German gas storage" },
  benzin: { de: "Benzin (Super E5)", en: "Petrol (Euro-super 95)" },
  diesel: { de: "Diesel", en: "Diesel" },
  heizoel: { de: "Heizöl", en: "Heating oil" },
  brent: { de: "Rohöl Brent", en: "Brent crude" },
  spr: { de: "US-Ölreserve", en: "US Strategic Petroleum Reserve" },
  gasTtf: { de: "Gaspreis Europa", en: "European gas price" },
  stand: { de: "Stand", en: "As of" },
  quelle: { de: "Quelle", en: "Source" },
  veraltet: {
    de: "Seit dem erwarteten Termin keine neuen Daten",
    en: "No new data since the expected update",
  },
  keinVergleich: { de: "Kein Vergleichswert verfügbar", en: "No reference value available" },
};

export function t(key: string, sprache: Sprache): string {
  return TEXTE[key]?.[sprache] ?? key;
}

const TOLERANZ_TAGE: Record<Cadence, number> = {
  daily: 4,
  weekly: 12,
  monthly: 70,
};

export function istVeraltet(metric: Metric, heute: string): boolean {
  const alterTage =
    (Date.parse(heute) - Date.parse(metric.sourceDate)) / (24 * 3600 * 1000);
  return alterTage > TOLERANZ_TAGE[metric.cadence];
}

export function spracheAusBrowser(): Sprache {
  return navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
}
```

- [ ] **Step 4: Test ausführen und Erfolg bestätigen**

Run: `npx vitest run`
Expected: PASS — 26 Tests insgesamt

- [ ] **Step 5: In die Oberfläche einbauen**

In `src/App.tsx`: Zustand `sprache` mit `spracheAusBrowser()` als Anfangswert, Umschalter neben der Überschrift, `titelKey` durch `t(titelKey, sprache)` ersetzen, `lang`-Attribut am `<html>` über einen Effekt setzen. In `MetricTile.tsx` bei `istVeraltet(metric, heute)` den Hinweis `t("veraltet", sprache)` in `theme.color.signal` unter dem Stand-Datum ausgeben.

- [ ] **Step 6: Im Browser prüfen**

Run: `npm run dev`
Prüfen: Umschalten wechselt alle Beschriftungen; Datumsformate folgen der Sprache; bei künstlich altem `sourceDate` in einer JSON-Datei erscheint der Hinweis.

- [ ] **Step 7: Committen**

```bash
git add src
git commit -m "feat: Zweisprachigkeit DE/EN und Hinweis auf veraltete Daten"
```

---

## Task 12: Abschluss — Fußbereich, Prüfung auf allen Breiten, Veröffentlichung

**Files:**
- Modify: `src/App.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: alles Vorherige
- Produces: nichts

- [ ] **Step 1: Fußbereich mit Quellen ergänzen**

In `src/App.tsx` unter dem Raster: eine Liste aller verwendeten Quellen mit Namen und Link (aus `ALLE_METRIKEN` ableiten, doppelte Einträge zusammenfassen), ein Hinweis auf die jeweilige Aktualisierungsfrequenz sowie ein Link zu Sunshift.

- [ ] **Step 2: README schreiben**

`README.md` mit: Zweck der Seite, Liste der Quellen mit Frequenz, Anleitung zum lokalen Start (`npm ci`, `.env` anlegen, `npm run fetch`, `npm run dev`), Erklärung der beiden Workflows und der Hinweis, dass Sora selbst gehostet wird und keine Google-Dienste eingebunden werden dürfen.

- [ ] **Step 3: Vollständige Prüfung**

```bash
npx tsc --noEmit
npm test
npm run build
npx vite preview
```

Expected: keine Typfehler, alle Tests grün, Aufbau erfolgreich.

In der Vorschau bei 375 px, 768 px und 1280 px prüfen:
- Keine seitliche Scrollleiste
- Alle Diagramm-Beschriftungen lesbar
- Aufklappen mit dem Finger bedienbar
- Im Netzwerk-Reiter kein Eintrag zu `fonts.gstatic.com` oder `fonts.googleapis.com`

- [ ] **Step 4: Veröffentlichen und nachsehen**

```bash
git add src README.md
git commit -m "feat: Fußbereich mit Quellen und README"
git push
```

Nach dem Durchlauf des Workflows die veröffentlichte Seite aufrufen und dieselben drei Breiten am echten Gerät gegenprüfen.

---

## Selbst-Review

**Abdeckung der Spezifikation**

| Anforderung | Task |
|---|---|
| Einordnung nach Referenzpunkten (4.1) | 1 |
| Saisonaler Korridor (4.2) | 2 |
| Testbarkeit der Einordnung (4.3) | 1, 2 |
| Gasspeicher | 3, 4 |
| Rohöl Brent, US-Ölreserve | 7 |
| Gaspreis TTF inkl. Rechteprüfung (10) | 8 |
| Benzin, Diesel, Heizöl | 9 |
| Datenschema mit `fetchedAt`/`sourceDate` (7) | 4 |
| Abruf-Workflow, Pages-Veröffentlichung (5) | 6 |
| Design-Tokens (2) | 5 |
| Sora selbst gehostet, Tabellenziffern (8.1) | 5 |
| Mitwachsendes Layout (8.2) | 10, 12 |
| Sechs Kacheln, Aufklappen (8) | 10 |
| Zweisprachigkeit | 11 |
| Frische-Warnung (8) | 11 |
| Fehlerverhalten bei Quellenausfall (9) | 6 (Workflow bricht nicht ab, alte JSON bleibt) |
| Fußbereich mit Quellen (8) | 12 |

**Offen gelassen und begründet**

- Die Plausibilitätsgrenzen je Kennzahl aus Abschnitt 9 der Spezifikation sind nicht eigens umgesetzt. Die Parser verwerfen bereits alles, was keine endliche Zahl ist; darüber hinausgehende Grenzwerte lassen sich sinnvoll erst festlegen, wenn die echten Reihen vorliegen. Nach Task 9 als kleine Ergänzung nachzuholen.
- Die Steueranteil-Angabe beim Sprit (`taxShare`) erfordert die zweite Oil-Bulletin-Datei ohne Steuern. Der Typ ist in Task 1 vorgesehen, die Befüllung ist bewusst nicht im MVP — sie verdoppelt den Download und die Parser-Arbeit in Task 9 und ist eine eigenständige Ergänzung wert.
