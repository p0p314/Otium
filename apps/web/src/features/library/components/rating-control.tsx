import { cn } from "@otium/ui";

interface RatingControlProps {
  value: number | null;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

/** Sélecteur de note 0–10. Cliquer la note courante l'efface (0 = non noté). */
export function RatingControl({ value, onRate, disabled }: RatingControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          aria-label={`Noter ${n} sur 10`}
          aria-pressed={value === n}
          onClick={() => onRate(value === n ? 0 : n)}
          className={cn(
            "h-8 w-8 rounded-md text-xs font-semibold transition-colors disabled:opacity-50",
            (value ?? 0) >= n
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-secondary",
          )}
        >
          {n}
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value ? `${value}/10` : "Non noté"}
      </span>
    </div>
  );
}
