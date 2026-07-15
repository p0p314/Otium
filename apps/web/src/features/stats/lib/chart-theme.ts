/** Style commun des infobulles recharts, aligné sur les tokens du design system. */
export const tooltipProps = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "none",
    color: "hsl(var(--foreground))",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))", marginBottom: 2 },
  itemStyle: { color: "hsl(var(--foreground))" },
} as const;

/** Surbrillance discrète au survol d'une barre. */
export const barCursor = { fill: "hsl(var(--muted))", opacity: 0.4 } as const;
