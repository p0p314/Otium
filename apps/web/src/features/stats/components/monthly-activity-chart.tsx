import type { MonthlyActivity } from "@otium/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { barCursor, tooltipProps } from "../lib/chart-theme";
import { formatMinutes, monthLong, monthShort } from "../lib/format";
import { ChartEmpty } from "./chart-empty";

/** Temps de visionnage par mois (12 derniers mois) — barres, teinte unique. */
export function MonthlyActivityChart({ data }: { data: MonthlyActivity[] }) {
  if (!data.some((d) => d.minutes > 0)) {
    return <ChartEmpty message="Pas encore d'activité sur les 12 derniers mois." />;
  }
  const chart = data.map((d) => ({ label: monthShort(d.month), minutes: d.minutes, full: monthLong(d.month) }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chart} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          minTickGap={4}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          {...tooltipProps}
          cursor={barCursor}
          formatter={(value) => [formatMinutes(Number(value)), "Temps"]}
          labelFormatter={(_label, payload) =>
            (payload as unknown as { payload?: { full?: string } }[] | undefined)?.[0]?.payload
              ?.full ?? ""
          }
        />
        <Bar dataKey="minutes" fill="var(--chart-series)" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
