import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { tooltipProps } from "../lib/chart-theme";
import { ChartEmpty } from "./chart-empty";

// Palette catégorielle validée (CVD) — slots 1 (films) et 2 (séries).
const COLORS = ["var(--chart-cat-1)", "var(--chart-cat-2)"] as const;

/** Répartition films vs séries (donut). Légende = identité (jamais couleur seule). */
export function TypeBreakdownChart({ movies, series }: { movies: number; series: number }) {
  if (movies + series === 0) return <ChartEmpty message="Aucun média dans la bibliothèque." />;
  const data = [
    { name: "Films", value: movies },
    { name: "Séries", value: series },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={82}
          paddingAngle={2}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={i === 0 ? COLORS[0] : COLORS[1]} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} />
        <Legend
          iconType="circle"
          formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
