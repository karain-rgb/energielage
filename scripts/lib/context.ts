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
