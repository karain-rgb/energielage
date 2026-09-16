import { describe, it, expect } from "vitest";
import { buildGasStorage, gleicherInhalt } from "./build-metrics";
import type { Metric, SeriesPoint } from "../src/types";

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

  // Schutz gegen eine Regression, die auf der kurzen Fixture oben unsichtbar
  // bliebe: 2021-09-15 (Mi) und 2021-09-17 (Fr derselben ISO-Woche) landen im
  // selben Wochen-Bucket, fuerAnzeige behält den späteren — der 09-15-Wert von
  // 2021 fehlt in der verdünnten Serie. Voller Korridor für 09-15 (2019–2025):
  // [60,70,80,90,100,50,40] → Median 70. Verdünnt fehlt 2021 (80) →
  // [60,70,90,100,50,40] → Median 65. Bitte diese Fixture NICHT vereinfachen —
  // eine kürzere Reihe ohne Wochenkollision entwaffnet den Test wieder.
  it("berechnet current/sourceDate/context aus der vollen Reihe, nicht aus der verdünnten", () => {
    const langeReihe: SeriesPoint[] = [
      { d: "2019-09-15", v: 60 },
      { d: "2020-09-15", v: 70 },
      { d: "2021-09-15", v: 80 },
      { d: "2021-09-17", v: 81 },
      { d: "2022-09-15", v: 90 },
      { d: "2023-09-15", v: 100 },
      { d: "2024-09-15", v: 50 },
      { d: "2025-09-15", v: 40 },
      { d: "2026-09-15", v: 68.4 },
    ];

    const m = buildGasStorage(langeReihe, "2026-09-16T04:07:00Z");

    expect(m.current).toBe(68.4);
    expect(m.sourceDate).toBe("2026-09-15");
    expect(m.context.kind).toBe("seasonal-corridor");
    if (m.context.kind === "seasonal-corridor") {
      expect(m.context.typicalNow).toBe(70);
    }
  });
});

describe("gleicherInhalt", () => {
  const basis = buildGasStorage(series, "2026-09-16T04:07:00Z");

  it("ignoriert einen abweichenden Abrufzeitpunkt", () => {
    const spaeter: Metric = { ...basis, fetchedAt: "2026-09-17T04:07:00Z" };
    expect(gleicherInhalt(basis, spaeter)).toBe(true);
  });

  it("erkennt eine Änderung am aktuellen Stand", () => {
    const anders: Metric = { ...basis, current: basis.current + 0.1 };
    expect(gleicherInhalt(basis, anders)).toBe(false);
  });

  it("erkennt eine Änderung irgendwo im Kontext", () => {
    if (basis.context.kind !== "seasonal-corridor") {
      throw new Error("unerwarteter Kontext-Typ in der Fixture");
    }
    const anders: Metric = {
      ...basis,
      context: { ...basis.context, corridor: [] },
    };
    expect(gleicherInhalt(basis, anders)).toBe(false);
  });
});
