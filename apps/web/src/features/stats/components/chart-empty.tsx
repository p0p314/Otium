/** Placeholder affiché quand un graphique n'a pas encore de données. */
export function ChartEmpty({ message = "Pas encore de données." }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
