import type { SearchField } from "@otium/types";
import { cn } from "@otium/ui";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";

/** Libellés du champ interrogé, dans l'ordre d'affichage. */
const FIELDS: readonly { value: SearchField; label: string }[] = [
  { value: "ALL", label: "Tout" },
  { value: "TITLE", label: "Titre" },
  { value: "AUTHOR", label: "Auteur" },
];

/**
 * Champ interrogé par la recherche.
 *
 * Contrairement au filtre de types, les choix sont **exclusifs** — on cherche dans un
 * champ ou dans tous : d'où un `radiogroup` et non des bascules indépendantes.
 *
 * « Tout » reste le défaut : c'est le mode le plus tolérant aux fautes de frappe côté
 * fournisseurs, et celui qui ne surprend pas l'utilisateur qui tape simplement un titre.
 */
export function SearchFieldFilter() {
  const field = useSearchSettingsStore((state) => state.field);
  const setField = useSearchSettingsStore((state) => state.setField);

  return (
    <div
      role="radiogroup"
      aria-label="Champ de recherche"
      className="inline-flex gap-1 rounded-full bg-muted p-0.5 text-xs"
    >
      {FIELDS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={field === option.value}
          onClick={() => setField(option.value)}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            field === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
