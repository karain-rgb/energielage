import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

export function parseAgsi(raw: unknown): SeriesPoint[] {
  const data = (raw as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  const points: SeriesPoint[] = [];
  for (const row of data) {
    const d = (row as { gasDayStart?: unknown }).gasDayStart;
    const v = Number((row as { full?: unknown }).full);
    if (typeof d === "string" && Number.isFinite(v)) {
      points.push({ d, v });
    }
  }
  return points.sort((a, b) => a.d.localeCompare(b.d));
}

export async function fetchAgsi(
  apiKey: string,
  country = "DE"
): Promise<SeriesPoint[]> {
  const alle: SeriesPoint[] = [];
  // AGSI+ blättert seitenweise; für den Zehn-Jahres-Korridor brauchen wir alles.
  for (let page = 1; page <= 60; page++) {
    const url = `https://agsi.gie.eu/api?country=${country}&size=300&page=${page}`;
    const raw = await getJson(url, { "x-key": apiKey });
    const seite = parseAgsi(raw);
    if (seite.length === 0) break;
    alle.push(...seite);
    const lastPage = Number((raw as { last_page?: unknown }).last_page);
    if (Number.isFinite(lastPage) && page >= lastPage) break;
  }
  return alle.sort((a, b) => a.d.localeCompare(b.d));
}
