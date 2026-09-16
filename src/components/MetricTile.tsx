import type { ReactNode } from "react";
import { theme } from "../theme";
import type { Metric } from "../types";

interface Props {
  titel: string;
  metric: Metric;
  einordnung: ReactNode;
  chart: ReactNode;
}

export function MetricTile({ titel, metric, einordnung, chart }: Props) {
  return (
    <section
      style={{
        padding: theme.space.lg,
        borderTop: `1px solid ${theme.color.rule}`,
        fontFamily: theme.font.family,
        color: theme.color.text,
      }}
    >
      <div
        style={{
          fontSize: theme.font.size.label,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: theme.color.textMuted,
          marginBottom: theme.space.sm,
        }}
      >
        {titel}
      </div>

      <div
        style={{
          fontSize: theme.font.size.value,
          fontWeight: theme.font.weight.bold,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
        }}
      >
        {metric.current.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
        <span
          style={{
            fontSize: theme.font.size.lead,
            color: theme.color.textMuted,
            marginLeft: theme.space.xs,
          }}
        >
          {metric.unit}
        </span>
      </div>

      <div
        style={{
          marginTop: theme.space.sm,
          fontSize: theme.font.size.body,
          lineHeight: 1.45,
          color: theme.color.signal,
        }}
      >
        {einordnung}
      </div>

      <div style={{ marginTop: theme.space.md }}>{chart}</div>

      <div
        style={{
          marginTop: theme.space.sm,
          fontSize: theme.font.size.label,
          color: theme.color.textFaint,
        }}
      >
        {/* T12:00:00 (local noon) avoids the date shifting a day for viewers west of Greenwich */}
        Stand {new Date(`${metric.sourceDate}T12:00:00`).toLocaleDateString("de-DE")} · Quelle:{" "}
        <a
          href={metric.source.url}
          style={{ color: "inherit" }}
          target="_blank"
          rel="noreferrer"
        >
          {metric.source.name}
        </a>
      </div>
    </section>
  );
}
