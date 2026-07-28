"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// one raw row per (day, source) from billing.usage.
export type UsageRow = { day: string; source: string; dollars: number };

function pivot(
  rows: UsageRow[],
  days: number,
): { data: Record<string, number | string>[]; sources: string[] } {
  const sources = Array.from(new Set(rows.map((r) => r.source))).sort();
  // build a dense day axis so gaps render as empty bars, not skipped days.
  const byDay = new Map<string, Record<string, number | string>>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, { day: key });
  }
  for (const r of rows) {
    const row = byDay.get(r.day) ?? { day: r.day };
    row[r.source] = Number(((row[r.source] as number | undefined) ?? 0) + r.dollars);
    byDay.set(r.day, row);
  }
  return { data: [...byDay.values()], sources };
}

const SOURCE_LABEL: Record<string, string> = {
  ui: "Dashboard",
  api: "API",
  other: "Other",
};

const SOURCE_COLOR: Record<string, string> = {
  ui: "var(--color-chart-ui)",
  api: "var(--color-chart-api)",
  other: "var(--color-chart-other)",
};

function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function UsageChart({ rows, days }: { rows: UsageRow[]; days: number }) {
  const { data, sources } = pivot(rows, days);
  const hasSpend = rows.length > 0;

  const peakDay = Math.max(
    0,
    ...data.map((d) => sources.reduce((sum, s) => sum + (Number(d[s]) || 0), 0)),
  );
  const inCents = peakDay > 0 && peakDay < 0.1;

  const config: ChartConfig = Object.fromEntries(
    sources.map((s) => [
      s,
      { label: SOURCE_LABEL[s] ?? s, color: SOURCE_COLOR[s] ?? "var(--color-chart-other)" },
    ]),
  );

  if (!hasSpend) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No usage in the last {days} days.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={shortDay}
          className="text-[0.75rem]"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals
          tickFormatter={(v: number) => (inCents ? `${(v * 100).toFixed(1)}¢` : `$${v.toFixed(2)}`)}
          className="text-[0.75rem]"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => shortDay(String(label))}
              formatter={(value, name) => (
                <span className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {SOURCE_LABEL[String(name)] ?? name}
                  </span>
                  <span className="font-mono tabular-nums">${Number(value).toFixed(2)}</span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {sources.map((s, i) => (
          <Bar
            key={s}
            dataKey={s}
            stackId="spend"
            fill={SOURCE_COLOR[s] ?? "var(--color-chart-other)"}
            stroke="var(--card)"
            strokeWidth={2}
            radius={i === sources.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
