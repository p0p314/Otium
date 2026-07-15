import type { GenreCount } from "@otium/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { barCursor, tooltipProps } from "../lib/chart-theme";
import { ChartEmpty } from "./chart-empty";

/** Genres les plus regardés (barres horizontales, magnitude → teinte unique). */
export function TopGenresChart({ genres }: { genres: GenreCount[] }) {
  if (genres.length === 0) {
    return <ChartEmpty message="Les genres apparaîtront à mesure que vous regardez." />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, genres.length * 34)}>
      <BarChart data={genres} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={96}
          tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipProps} cursor={barCursor} />
        <Bar dataKey="count" fill="var(--chart-series)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList dataKey="count" position="right" fill="var(--chart-axis)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
