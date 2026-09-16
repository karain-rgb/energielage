import { describe, it, expect } from "vitest";
import { parseEia } from "./eia";

const antwort = {
  response: {
    data: [
      { period: "2026-09-11", value: 74.2 },
      { period: "2026-09-10", value: 73.8 },
      { period: "2026-09-09", value: null },
    ],
  },
};

describe("parseEia", () => {
  it("liest Zeitraum und Wert und sortiert aufsteigend", () => {
    expect(parseEia(antwort)).toEqual([
      { d: "2026-09-10", v: 73.8 },
      { d: "2026-09-11", v: 74.2 },
    ]);
  });

  it("ergänzt Monatsangaben zum ersten des Monats", () => {
    const monatlich = { response: { data: [{ period: "2026-08", value: 70 }] } };
    expect(parseEia(monatlich)).toEqual([{ d: "2026-08-01", v: 70 }]);
  });

  it("liefert eine leere Liste bei unerwarteter Antwortform", () => {
    expect(parseEia({})).toEqual([]);
  });
});
