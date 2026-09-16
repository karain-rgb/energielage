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

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <ComposedChart data={daten} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={theme.color.rule} vertical={false} />
          <XAxis
            dataKey="md"
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={{ stroke: theme.color.rule }}
            minTickGap={40}
            tickFormatter={(md: string) => md.slice(0, 2)}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: theme.color.textFaint }}
            tickLine={false}
            axisLine={false}
            width={38}
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
