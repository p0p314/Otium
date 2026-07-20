import type { LibraryItem, ProgressUnit } from "@otium/types";
import { Button, Input } from "@otium/ui";
import { useEffect, useState } from "react";
import { useUpdateProgress } from "../api/use-item-detail";

const UNIT_LABEL: Record<ProgressUnit, string> = { PAGES: "Pages", PERCENT: "Pourcentage" };

/** Suffixe affiché à côté du champ de saisie. */
const UNIT_SUFFIX: Record<ProgressUnit, string> = { PAGES: "p.", PERCENT: "%" };

/**
 * Suivi de lecture : saisie de l'avancement en pages ou en pourcentage. Le composant ne
 * calcule **rien** — pourcentage lu et restant viennent du serveur (source unique de
 * vérité, cf. CLAUDE.md § frontend) ; il ne fait que présenter et transmettre.
 */
export function ReadingProgressControl({
  item,
  totalPages,
}: {
  item: LibraryItem;
  /** Pagination connue du catalogue, si l'utilisateur n'a rien saisi. */
  totalPages: number | null;
}) {
  const update = useUpdateProgress(item.id);
  const progress = item.progress;
  const [unit, setUnit] = useState<ProgressUnit>(progress?.unit ?? (totalPages ? "PAGES" : "PERCENT"));
  const [value, setValue] = useState<string>(String(progress?.value ?? 0));

  // La valeur affichée suit le serveur (mise à jour optimiste écartée : la progression
  // peut être bornée côté domaine, l'écran doit montrer ce qui a réellement été retenu).
  useEffect(() => {
    if (progress && progress.unit === unit) setValue(String(progress.value));
  }, [progress, unit]);

  const total = unit === "PERCENT" ? 100 : (progress?.total ?? totalPages);
  const percent = progress?.unit === unit ? progress.percent : null;
  const remaining = progress?.unit === unit ? progress.remaining : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // Un champ vidé ne vaut pas « 0 » : sans cette garde, effacer la saisie remettrait
    // la progression à zéro sans que l'utilisateur l'ait demandé.
    const parsed = value.trim() === "" ? Number.NaN : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    update.mutate({
      unit,
      value: Math.round(parsed),
      // Le total n'est transmis que si le catalogue l'ignore : sinon le serveur le connaît.
      ...(unit === "PAGES" && totalPages === null && total ? { total } : {}),
    });
  };

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Ma progression</h2>
        {/* Bascule pages ↔ pourcentage : deux options, un simple segmented control. */}
        <div role="radiogroup" aria-label="Unité de progression" className="flex gap-1 text-xs">
          {(["PAGES", "PERCENT"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={unit === option}
              onClick={() => setUnit(option)}
              className={
                unit === option
                  ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                  : "rounded-full px-3 py-1 text-muted-foreground hover:text-foreground"
              }
            >
              {UNIT_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {percent !== null ? (
        <div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de lecture"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {percent} % lu
            {remaining !== null && unit === "PAGES" ? ` · ${remaining} pages restantes` : ""}
          </p>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">
            {unit === "PAGES" ? "Page actuelle" : "Avancement"}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              {...(total ? { max: total } : {})}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={unit === "PAGES" ? "Page actuelle" : "Pourcentage lu"}
            />
            <span className="text-sm text-muted-foreground">
              {UNIT_SUFFIX[unit]}
              {unit === "PAGES" && total ? ` / ${total}` : ""}
            </span>
          </div>
        </label>
        <Button type="submit" size="sm" disabled={update.isPending}>
          {update.isPending ? "…" : "Enregistrer"}
        </Button>
      </form>

      {update.isError ? (
        <p role="alert" className="text-xs text-destructive">
          Progression non enregistrée. Réessayez.
        </p>
      ) : null}
    </section>
  );
}
