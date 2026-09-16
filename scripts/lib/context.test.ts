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

  it("behandelt Halbjahresreihen wie Monatsreihen: kein Ausweichen auf den nächstgelegenen Tag aus dem falschen Halbjahr", () => {
    const biannual: SeriesPoint[] = [
      // Nur 16 Tage vom Vorjahresziel (2025-07-01) entfernt — läge innerhalb
      // der 60-Tage-Toleranz von Tages-/Wochenreihen, gehört aber zum
      // falschen Halbjahr (2025-06 statt 2025-07).
      { d: "2025-06-15", v: 999 },
      { d: "2026-07-01", v: 120 },
    ];
    const ctx = referencePoints(biannual, "biannual");
    expect(ctx.yearAgo).toBeNull();
  });

  it("nimmt bei Halbjahresreihen dasselbe Halbjahr des Vorjahres", () => {
    const biannual: SeriesPoint[] = [
      { d: "2025-07-01", v: 100 },
      { d: "2026-01-01", v: 110 },
      { d: "2026-07-01", v: 120 },
    ];
    const ctx = referencePoints(biannual, "biannual");
    expect(ctx.yearAgo).toEqual({ value: 100, deltaPct: 20 });
  });

  it("liefert null, wenn ein Bezugszeitraum keine Daten hat", () => {
    const ctx = referencePoints([{ d: "2026-09-12", v: 1.8 }], "weekly");
    expect(ctx.preCrisis).toBeNull();
    expect(ctx.peak2022).toBeNull();
    expect(ctx.yearAgo).toBeNull();
  });
});
