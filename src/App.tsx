import { MetricTile } from "./components/MetricTile";
import { CorridorChart } from "./components/CorridorChart";
import { theme } from "./theme";
import type { Metric } from "./types";

import gasStorage from "../data/metrics/gas-storage-de.json";

const metric = gasStorage as Metric;

export function App() {
  const ctx = metric.context;
  const üblich =
    ctx.kind === "seasonal-corridor" && ctx.typicalNow !== null
      ? `Üblich sind um diese Jahreszeit ${ctx.typicalNow.toLocaleString("de-DE", {
          maximumFractionDigits: 0,
        })} %`
      : "Kein Vergleichswert verfügbar";

  return (
    <main
      style={{
        maxWidth: theme.maxWidth,
        margin: "0 auto",
        padding: theme.space.md,
        background: theme.color.bg,
        fontFamily: theme.font.family,
      }}
    >
      <h1
        style={{
          fontSize: theme.font.size.title,
          fontWeight: theme.font.weight.bold,
          letterSpacing: "-0.02em",
          borderBottom: `2px solid ${theme.color.ruleStrong}`,
          paddingBottom: theme.space.sm,
          margin: 0,
        }}
      >
        Energielage
      </h1>

      <MetricTile
        titel="Gasspeicher Deutschland"
        metric={metric}
        einordnung={üblich}
        chart={<CorridorChart metric={metric} />}
      />
    </main>
  );
}
