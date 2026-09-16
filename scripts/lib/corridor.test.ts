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
