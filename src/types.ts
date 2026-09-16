export type Cadence = "daily" | "weekly" | "monthly" | "biannual";

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
  // Seit wann dieser Stand gilt — nicht wann zuletzt abgerufen wurde. Der
  // Abruf-Job überschreibt diesen Zeitstempel nur, wenn sich sonst etwas an
  // der Kennzahl geändert hat (siehe scripts/build-metrics.ts:gleicherInhalt);
  // ob der Abruf überhaupt lief, steht in der Actions-Historie, und die
  // Aktualitätswarnung in der Oberfläche stützt sich ohnehin auf sourceDate.
  fetchedAt: string;
  sourceDate: string;
  cadence: Cadence;
  source: { name: string; url: string };
  current: number;
  series: SeriesPoint[];
  context: MetricContext;
}
