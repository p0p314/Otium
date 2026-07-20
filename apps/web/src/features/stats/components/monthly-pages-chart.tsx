import type { MonthlyPages } from "@otium/types";
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
import { monthLong, monthShort } from "../lib/format";
import { ChartEmpty } from "./chart-empty";

/** Pages lues par mois (12 derniers mois) — même grammaire visuelle que le visionnage. */
export function MonthlyPagesChart({ data }: { data: MonthlyPages[] }) {
  if (!data.some((d) => d.pages > 0)) {
    return <ChartEmpty message="Pas encore de lecture sur les 12 derniers mois." />;
  }
  const chart = data.map((d) => ({
    label: monthShort(d.month),
    pages: d.pages,
    full: monthLong(d.month),
  }));

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
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          {...tooltipProps}
          cursor={barCursor}
          formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} pages`, "Lecture"]}
          labelFormatter={(_label, payload) =>
            (payload as unknown as { payload?: { full?: string } }[] | undefined)?.[0]?.payload
              ?.full ?? ""
          }
        />
        <Bar dataKey="pages" fill="var(--chart-cat-3)" radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
