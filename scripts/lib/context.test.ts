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
