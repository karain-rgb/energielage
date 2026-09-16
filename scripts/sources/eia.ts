import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

function normalisiereDatum(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  if (/^\d{4}$/.test(period)) return `${period}-01-01`;
  return period;
}

// Number(null) und Number("") ergeben 0, nicht NaN — fehlende Werte kämen
// sonst als echte Null-Messwerte durch.
export function zahlOderNaN(roh: unknown): number {
  if (roh === null || roh === undefined || roh === "") return NaN;
  return Number(roh);
}

export function parseEia(raw: unknown): SeriesPoint[] {
  const data = (raw as { response?: { data?: unknown } })?.response?.data;
  if (!Array.isArray(data)) return [];

  const points: SeriesPoint[] = [];
  for (const row of data) {
    const period = (row as { period?: unknown }).period;
    const v = zahlOderNaN((row as { value?: unknown }).value);
    if (typeof period === "string" && Number.isFinite(v)) {
      points.push({ d: normalisiereDatum(period), v });
    }
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

export async function fetchEiaSeries(
  apiKey: string,
  route: string,
  seriesId: string,
  frequency: string = "daily"
): Promise<SeriesPoint[]> {
  const url =
    `https://api.eia.gov/v2/${route}/data/?api_key=${apiKey}` +
    `&frequency=${frequency}&data[0]=value&facets[series][]=${seriesId}` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=5000`;
  try {
    return parseEia(await getJson(url));
  } catch (err) {
    // Anders als AGSI (Schlüssel im Header) steckt der EIA-Schlüssel in der
    // URL — getJson bettet die volle URL in seine Fehlermeldung ein, die sonst
    // im Klartext geloggt würde.
    throw new Error(String(err).replace(apiKey, "***"));
  }
}
