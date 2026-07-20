import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { tooltipProps } from "../lib/chart-theme";
import { ChartEmpty } from "./chart-empty";

// Palette catégorielle validée (CVD) — un slot par type de média.
const COLORS = ["var(--chart-cat-1)", "var(--chart-cat-2)", "var(--chart-cat-3)"] as const;

/** Répartition par type de média (donut). Légende = identité (jamais couleur seule). */
export function TypeBreakdownChart({
  movies,
  series,
  books,
}: {
  movies: number;
  series: number;
  books: number;
}) {
  if (movies + series + books === 0) {
    return <ChartEmpty message="Aucun média dans la bibliothèque." />;
  }
  // Un type absent est masqué plutôt que dessiné à zéro : la légende reste lisible.
  const data = [
    { name: "Films", value: movies },
    { name: "Séries", value: series },
    { name: "Livres", value: books },
  ].filter((entry) => entry.value > 0);

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
            <Cell key={entry.name} fill={COLORS[i % COLORS.length] ?? COLORS[0]} />
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
