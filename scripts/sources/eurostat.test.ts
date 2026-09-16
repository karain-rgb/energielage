import { describe, it, expect } from "vitest";
import { parseEurostat, halbjahrZuDatum } from "./eurostat";
import roh from "./__fixtures__/eurostat-gas-de.json";

describe("halbjahrZuDatum", () => {
  it("bildet S1 auf den 1. Januar ab", () => {
    expect(halbjahrZuDatum("2024-S1")).toBe("2024-01-01");
  });

  it("bildet S2 auf den 1. Juli ab", () => {
    expect(halbjahrZuDatum("2024-S2")).toBe("2024-07-01");
  });

  it("liefert null bei unbekannter Form", () => {
    expect(halbjahrZuDatum("2024-Q1")).toBeNull();
  });
});

describe("parseEurostat", () => {
  it("bildet Halbjahres-Kennungen auf den ersten Tag des Halbjahres ab", () => {
    const punkte = parseEurostat(roh);
    expect(punkte.every((p) => /^\d{4}-(01|07)-01$/.test(p.d))).toBe(true);
  });

  it("liefert aufsteigend sortierte, endliche Werte", () => {
    const punkte = parseEurostat(roh);
    expect(punkte.length).toBeGreaterThan(0);
    expect(punkte.every((p) => Number.isFinite(p.v))).toBe(true);
    expect([...punkte].sort((a, b) => a.d.localeCompare(b.d))).toEqual(punkte);
  });

  it("liest die echten Werte aus dem Fixture", () => {
    expect(parseEurostat(roh)).toEqual([
      { d: "2024-01-01", v: 0.1198 },
      { d: "2024-07-01", v: 0.1238 },
      { d: "2025-01-01", v: 0.1216 },
      { d: "2025-07-01", v: 0.1223 },
    ]);
  });

  it("verwirft Zeitpunkte ohne Wert", () => {
    const luecke = JSON.parse(JSON.stringify(roh));
    const ersterSchluessel = Object.keys(luecke.value)[0]!;
    delete luecke.value[ersterSchluessel];
    expect(parseEurostat(luecke).length).toBe(parseEurostat(roh).length - 1);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseEurostat({ kaputt: true })).toEqual([]);
  });
});
