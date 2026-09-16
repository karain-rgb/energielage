import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { theme } from "../theme";
import type { Metric, SeasonalCorridorContext } from "../types";

interface Props {
  metric: Metric;
}

export function CorridorChart({ metric }: Props) {
  if (metric.context.kind !== "seasonal-corridor") return null;
  const ctx: SeasonalCorridorContext = metric.context;

  const laufendesJahr = metric.sourceDate.slice(0, 4);
  const aktuell = new Map(
    metric.series
      .filter((p) => p.d.startsWith(laufendesJahr))
      .map((p) => [p.d.slice(5, 10), p.v])
  );

  const daten = ctx.corridor.map((c) => ({
    md: c.md,
    spanne: [c.min, c.max] as [number, number],
    jetzt: aktuell.get(c.md) ?? null,
  }));

  // Ein Tick pro Monat: Recharts wählt Ticks über die Pixelbreite des formatierten Labels
  // (minTickGap) und merkt nicht, wenn zwei verschiedene Tage auf denselben Monat abbilden —
  // das ergäbe wiederholte Beschriftungen ("01 01 02 02 03 …"). Explizite Liste vermeidet das.
  const monatsTicks = daten.filter((d) => d.md.endsWith("-01")).map((d) => d.md);

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <ComposedChart data={daten} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.color.rule} vertical={false} />
          <XAxis
            dataKey="md"
            ticks={monatsTicks}
            tick={{ fontSize: theme.font.size.tick, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={{ stroke: theme.color.rule }}
            tickFormatter={(md: string) => md.slice(0, 2)}
          />
          <YAxis
            domain={[0, 105]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: theme.font.size.tick, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="%"
          />
          <Area
            dataKey="spanne"
            fill={theme.color.band}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            dataKey="jetzt"
            stroke={theme.color.ruleStrong}
            strokeWidth={1.8}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
