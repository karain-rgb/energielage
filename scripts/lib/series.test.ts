import { describe, it, expect } from "vitest";
import { fuerAnzeige } from "./series";
import type { SeriesPoint } from "../../src/types";

const HEUTE = "2026-09-16";

describe("fuerAnzeige", () => {
  it("verwirft Punkte vor 2019-01-01 vollständig", () => {
    const series: SeriesPoint[] = [
      { d: "2018-12-31", v: 1 },
      { d: "2019-01-01", v: 2 },
    ];
    const out = fuerAnzeige(series, HEUTE);
    expect(out.some((p) => p.d === "2018-12-31")).toBe(false);
  });

  it("behält innerhalb der letzten zwei Jahre jeden Tageswert (Anzahl exakt erhalten)", () => {
    const series: SeriesPoint[] = [
      { d: "2025-01-01", v: 10 },
      { d: "2025-01-02", v: 11 },
      { d: "2025-01-03", v: 12 },
      { d: "2025-01-04", v: 13 },
      { d: "2025-01-05", v: 14 },
    ];
    const out = fuerAnzeige(series, HEUTE);
    expect(out).toHaveLength(5);
    expect(out).toEqual(series);
  });

  it("fasst ältere Punkte zu einem Wert je Kalenderwoche zusammen", () => {
    // 2020-06-01 (Mo) bis 2020-06-07 (So) ist eine ISO-Kalenderwoche.
    const series: SeriesPoint[] = [
      { d: "2020-06-01", v: 1 },
      { d: "2020-06-02", v: 2 },
      { d: "2020-06-03", v: 3 },
      { d: "2020-06-04", v: 4 },
      { d: "2020-06-05", v: 5 },
      { d: "2020-06-06", v: 6 },
      { d: "2020-06-07", v: 7 },
    ];
    const out = fuerAnzeige(series, HEUTE);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ d: "2020-06-07", v: 7 });
  });

  it("liefert das Ergebnis aufsteigend nach Datum sortiert", () => {
    const series: SeriesPoint[] = [
      { d: "2025-06-01", v: 1 },
      { d: "2020-01-06", v: 2 },
      { d: "2025-01-01", v: 3 },
      { d: "2020-01-01", v: 4 },
    ];
    const out = fuerAnzeige(series, HEUTE);
    const dates = out.map((p) => p.d);
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(sorted);
  });
});
