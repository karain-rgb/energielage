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
