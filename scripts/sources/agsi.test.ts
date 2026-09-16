import { describe, it, expect } from "vitest";
import { parseAgsi } from "./agsi";

const antwort = {
  last_page: 1,
  data: [
    { gasDayStart: "2026-09-15", full: "68.42", gasInStorage: "170.11" },
    { gasDayStart: "2026-09-14", full: "68.01", gasInStorage: "169.10" },
    { gasDayStart: "2026-09-13", full: "-", gasInStorage: "-" },
  ],
};

describe("parseAgsi", () => {
  it("liest Datum und Füllstand und sortiert aufsteigend", () => {
    expect(parseAgsi(antwort)).toEqual([
      { d: "2026-09-14", v: 68.01 },
      { d: "2026-09-15", v: 68.42 },
    ]);
  });

  it("verwirft Einträge ohne verwertbaren Zahlenwert", () => {
    expect(parseAgsi(antwort)).toHaveLength(2);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseAgsi({ irgendwas: true })).toEqual([]);
  });
});
