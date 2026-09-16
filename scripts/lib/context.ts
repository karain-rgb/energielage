import type {
  Cadence,
  CorridorDay,
  ReferencePoint,
  ReferencePointsContext,
  SeasonalCorridorContext,
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

  if (cadence === "monthly" || cadence === "biannual") {
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
    // 29. Februar: In einem 10-Jahres-Fenster liegen nur ~3 Schaltjahre, die Stichprobe ist
    // zu klein für eine seriöse Spanne (Beispiel: Spannweite ~20 gegenüber ~52 bei den
    // Nachbartagen). Der Tag wird bewusst ausgelassen statt eine unbelegte Spanne zu zeigen —
    // bitte nicht "reparieren", das Fehlen ist Absicht.
    if (md === "02-29") continue;
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
