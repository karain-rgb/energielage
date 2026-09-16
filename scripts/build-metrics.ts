import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fetchAgsi } from "./sources/agsi";
import { seasonalCorridor } from "./lib/context";
import { fuerAnzeige } from "./lib/series";
import type { Metric, SeriesPoint } from "../src/types";

export function buildGasStorage(
  series: SeriesPoint[],
  fetchedAt: string
): Metric {
  const last = series[series.length - 1];
  if (!last) throw new Error("Gasspeicher: leere Reihe");

  return {
    id: "gas-storage-de",
    unit: "%",
    fetchedAt,
    sourceDate: last.d,
    cadence: "daily",
    source: {
      name: "GIE AGSI+",
      url: "https://agsi.gie.eu/",
    },
    current: last.v,
    series: fuerAnzeige(series, last.d),
    context: seasonalCorridor(series, last.d),
  };
}

// Vergleicht zwei Kennzahl-Dateien ohne den Abrufzeitpunkt. Ohne das erzeugte
// jeder Lauf einen Commit und einen vollständigen Neubau, obwohl sich keine
// einzige Zahl bewegt hat — und echte Datenänderungen wären in der Historie
// nicht mehr von reinen Abruf-Läufen zu unterscheiden.
export function gleicherInhalt(a: Metric, b: Metric): boolean {
  const ohneZeit = ({ fetchedAt: _, ...rest }: Metric) => rest;
  return JSON.stringify(ohneZeit(a)) === JSON.stringify(ohneZeit(b));
}

async function liesVorherige(pfad: string): Promise<Metric | null> {
  try {
    return JSON.parse(await readFile(pfad, "utf8")) as Metric;
  } catch {
    return null; // Datei fehlt (erster Lauf) oder ist kein gültiges JSON.
  }
}

async function schreibe(metric: Metric): Promise<void> {
  await mkdir("data/metrics", { recursive: true });
  const pfad = `data/metrics/${metric.id}.json`;

  const vorherige = await liesVorherige(pfad);
  if (vorherige && gleicherInhalt(vorherige, metric)) {
    console.log(`${metric.id}: unverändert (${metric.sourceDate})`);
    return;
  }

  await writeFile(pfad, JSON.stringify(metric, null, 2) + "\n", "utf8");
  console.log(`${metric.id}: ${metric.current} ${metric.unit} (${metric.sourceDate})`);
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const key = process.env.AGSI_KEY;
  if (!key) throw new Error("AGSI_KEY fehlt");

  await schreibe(buildGasStorage(await fetchAgsi(key), fetchedAt));
}

// Nur ausführen, wenn direkt aufgerufen — nicht beim Import im Test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
