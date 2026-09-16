import type { SeriesPoint } from "../../src/types";

const ANZEIGE_AB = "2019-01-01";
const VOLLE_AUFLOESUNG_JAHRE = 2;

function isoWoche(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  const tag = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - tag);
  const jahresbeginn = Date.UTC(dt.getUTCFullYear(), 0, 1);
  const woche = Math.ceil(((dt.getTime() - jahresbeginn) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-${String(woche).padStart(2, "0")}`;
}

// Die Oberfläche zeichnet Diagramme von wenigen hundert Pixeln Breite; dort sind
// Tageswerte von 2013 nicht unterscheidbar. Ausgeliefert wird deshalb volle
// Auflösung für die letzten zwei Jahre und ein Wert je Kalenderwoche davor.
export function fuerAnzeige(series: SeriesPoint[], heute: string): SeriesPoint[] {
  const grenze = `${Number(heute.slice(0, 4)) - VOLLE_AUFLOESUNG_JAHRE}${heute.slice(4)}`;
  const jeWoche = new Map<string, SeriesPoint>();
  const voll: SeriesPoint[] = [];

  for (const p of series) {
    if (p.d < ANZEIGE_AB) continue;
    if (p.d >= grenze) voll.push(p);
    else jeWoche.set(isoWoche(p.d), p);
  }

  return [...jeWoche.values(), ...voll].sort((a, b) => a.d.localeCompare(b.d));
}
