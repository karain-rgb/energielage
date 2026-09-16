import { getJson } from "../lib/http";
import type { SeriesPoint } from "../../src/types";

// Zahl der Rohzeilen einer Antwortseite — unabhängig davon, wie viele davon
// verwertbare Werte tragen.
export function rohZeilenAnzahl(raw: unknown): number {
  const data = (raw as { data?: unknown })?.data;
  return Array.isArray(data) ? data.length : 0;
}

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
  // Nach Datum abgelegt: Wird zwischen zwei Abrufen ein neuer Gastag
  // veröffentlicht, verschieben sich die Seitengrenzen und ein Datum käme
  // doppelt — das würde den Median der Korridor-Berechnung verzerren.
  const nachDatum = new Map<string, number>();

  // AGSI+ blättert seitenweise; für den Zehn-Jahres-Korridor brauchen wir alles.
  for (let page = 1; page <= 60; page++) {
    const url = `https://agsi.gie.eu/api?country=${country}&size=300&page=${page}`;
    const raw = await getJson(url, { "x-key": apiKey });

    // Abbruch am Rohbestand, nicht am gefilterten Ergebnis: Eine Seite, auf der
    // zufällig kein Wert verwertbar ist, ist nicht das Ende der Reihe.
    if (rohZeilenAnzahl(raw) === 0) break;

    for (const p of parseAgsi(raw)) nachDatum.set(p.d, p.v);

    const lastPage = Number((raw as { last_page?: unknown }).last_page);
    if (Number.isFinite(lastPage) && page >= lastPage) break;
  }

  return [...nachDatum]
    .map(([d, v]) => ({ d, v }))
    .sort((a, b) => a.d.localeCompare(b.d));
}
