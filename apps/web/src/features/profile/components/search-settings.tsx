import type { MediaType } from "@otium/types";
import { Film, Tv, type LucideIcon } from "lucide-react";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";

/** Onglet « Réglages » : périmètre de la recherche (types de médias inclus). */
export function SearchSettings() {
  const { movies, series, toggle } = useSearchSettingsStore();

  const rows: { type: MediaType; label: string; icon: LucideIcon; on: boolean }[] = [
    { type: "SERIES", label: "Séries", icon: Tv, on: series },
    { type: "MOVIE", label: "Films", icon: Film, on: movies },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Recherche</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez les types de médias inclus dans la recherche.
        </p>
      </div>
      <ul className="space-y-2">
        {rows.map(({ type, label, icon: Icon, on }) => (
          <li key={type}>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
              <span className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(type)}
                className="h-5 w-5 accent-primary"
                aria-label={`Inclure les ${label.toLowerCase()} dans la recherche`}
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Au moins un type reste actif. D'autres types (livres, jeux…) arriveront plus tard.
      </p>
    </div>
  );
}
