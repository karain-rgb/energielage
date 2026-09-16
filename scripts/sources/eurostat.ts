import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

// Eurostat führt Halbjahre als "2024-S1"/"2024S1". Abgebildet auf den ersten
// Tag des Halbjahres, damit die Reihe dieselbe ISO-Form hat wie alle anderen.
export function halbjahrZuDatum(kennung: string): string | null {
  const m = /^(\d{4})-?S([12])$/.exec(kennung.trim());
  if (!m) return null;
  return `${m[1]}-${m[2] === "1" ? "01" : "07"}-01`;
}

// JSON-stat 2.0: `dimension.time.category.index` bildet Zeit-Kennung auf eine
// Position ab, `value` bildet Position auf die Zahl ab. Das gilt hier direkt
// (Position === Zeit-Index), weil fetchGasHaushalt jede andere Dimension
// (Verbrauchsband, Steuerstand, Währung, Einheit, geo) auf genau einen
// Wert filtert — bei mehreren Werten pro Dimension wäre die Position ein
// zusammengesetzter Index, nicht mehr allein der Zeit-Index.
export function parseEurostat(raw: unknown): SeriesPoint[] {
  const zeit = (
    raw as {
      dimension?: { time?: { category?: { index?: unknown } } };
    }
  )?.dimension?.time?.category?.index;
  const werte = (raw as { value?: unknown })?.value;
  if (
    typeof zeit !== "object" ||
    zeit === null ||
    typeof werte !== "object" ||
    werte === null
  ) {
    return [];
  }

  const points: SeriesPoint[] = [];
  for (const [kennung, position] of Object.entries(zeit as Record<string, unknown>)) {
    const d = halbjahrZuDatum(kennung);
    if (d === null) continue;
    const v = Number((werte as Record<string, unknown>)[String(position)]);
    if (Number.isFinite(v)) points.push({ d, v });
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

// Verbrauchsband GJ20-199 ("20 bis unter 200 GJ", Band D2) ist der typische
// Einfamilienhaushalt; tax=I_TAX ("alle Steuern und Abgaben") beantwortet, was
// Haushalte tatsächlich zahlen; unit=KWH wird unverändert übernommen (keine
// Umrechnung, siehe Spezifikation Abschnitt 3).
export async function fetchGasHaushalt(): Promise<SeriesPoint[]> {
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_202" +
    "?format=JSON&lang=EN&geo=DE&nrg_cons=GJ20-199&unit=KWH&tax=I_TAX&currency=EUR";
  return parseEurostat(await getJson(url));
}
