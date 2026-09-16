import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fetchAgsi } from "./sources/agsi";
import { fetchEiaSeries } from "./sources/eia";
import { seasonalCorridor, referencePoints } from "./lib/context";
import { fuerAnzeige } from "./lib/series";
import type { Cadence, Metric, SeriesPoint } from "../src/types";

const EIA_QUELLE = {
  name: "U.S. Energy Information Administration",
  url: "https://www.eia.gov/opendata/",
};
const BRENT_ID = "RBRTE";
const SPR_ID = "WCSSTUS1";

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

export function buildPreisMetric(
  id: string,
  unit: string,
  cadence: Cadence,
  quelle: { name: string; url: string },
  series: SeriesPoint[],
  fetchedAt: string
): Metric {
  const last = series[series.length - 1];
  if (!last) throw new Error(`${id}: leere Reihe`);
  return {
    id,
    unit,
    fetchedAt,
    sourceDate: last.d,
    cadence,
    source: quelle,
    current: last.v,
    series,
    context: referencePoints(series, cadence),
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

// Eine Quelle pro Kennzahl. Jede liefert ihr fertiges Metric-Objekt selbst —
// main() weiß nichts über AGSI/EIA-Details und muss beim Hinzufügen einer
// weiteren Quelle (Task 8, 9) nur um einen Eintrag ergänzt werden.
interface Quelle {
  id: string;
  hole: (fetchedAt: string) => Promise<Metric>;
}

async function holeGasStorage(fetchedAt: string): Promise<Metric> {
  const key = process.env.AGSI_KEY;
  if (!key) throw new Error("AGSI_KEY fehlt");
  return buildGasStorage(await fetchAgsi(key), fetchedAt);
}

async function holeBrent(fetchedAt: string): Promise<Metric> {
  const key = process.env.EIA_KEY;
  if (!key) throw new Error("EIA_KEY fehlt");
  const series = await fetchEiaSeries(key, "petroleum/pri/spt", BRENT_ID, "daily");
  return buildPreisMetric("brent", "USD/Barrel", "daily", EIA_QUELLE, series, fetchedAt);
}

async function holeSpr(fetchedAt: string): Promise<Metric> {
  const key = process.env.EIA_KEY;
  if (!key) throw new Error("EIA_KEY fehlt");
  const series = await fetchEiaSeries(key, "petroleum/stoc/wstk", SPR_ID, "weekly");
  return buildPreisMetric("us-spr", "Tsd. Barrel", "weekly", EIA_QUELLE, series, fetchedAt);
}

const QUELLEN: Quelle[] = [
  { id: "gas-storage-de", hole: holeGasStorage },
  { id: "brent", hole: holeBrent },
  { id: "us-spr", hole: holeSpr },
];

// Jede Quelle läuft isoliert: Fällt eine aus (AGSI hatte bereits zweimal einen
// Timeout), sollen die anderen trotzdem geschrieben werden und die Seite
// zeigt für die ausgefallene Quelle weiter ihren letzten bekannten Stand.
// Exit 0 sobald mindestens eine Quelle erfolgreich war — der Commit-Schritt
// im Workflow läuft nur bei Erfolg, ein Non-Zero-Exit würde also auch die
// erfolgreichen Quellen verwerfen. Exit 1 nur, wenn wirklich nichts zu
// committen ist.
async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();

  let erfolge = 0;
  let fehlschlaege = 0;

  for (const quelle of QUELLEN) {
    try {
      await schreibe(await quelle.hole(fetchedAt));
      erfolge++;
    } catch (err) {
      fehlschlaege++;
      console.error(`::error::${quelle.id}: Abruf fehlgeschlagen — ${String(err)}`);
    }
  }

  console.log(`Abruf abgeschlossen: ${erfolge} erfolgreich, ${fehlschlaege} fehlgeschlagen.`);
  if (erfolge === 0) process.exit(1);
}

// Nur ausführen, wenn direkt aufgerufen — nicht beim Import im Test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
