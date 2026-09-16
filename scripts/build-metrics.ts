import { mkdir, writeFile } from "node:fs/promises";
import { fetchAgsi } from "./sources/agsi";
import { seasonalCorridor } from "./lib/context";
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
    series,
    context: seasonalCorridor(series, last.d),
  };
}

async function schreibe(metric: Metric): Promise<void> {
  await mkdir("data/metrics", { recursive: true });
  await writeFile(
    `data/metrics/${metric.id}.json`,
    JSON.stringify(metric, null, 2) + "\n",
    "utf8"
  );
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
