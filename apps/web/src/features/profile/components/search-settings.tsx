import type { MediaType } from "@otium/types";
import { BookOpen, Film, Tv, type LucideIcon } from "lucide-react";
import { MEDIA_TYPE_LABEL_PLURAL } from "../../../lib/media-type";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";

/** Icône par type de média — table exhaustive (un nouveau type doit choisir la sienne). */
const ICONS: Record<MediaType, LucideIcon> = { SERIES: Tv, MOVIE: Film, BOOK: BookOpen };

/** Ordre d'affichage, aligné sur les onglets de la bibliothèque. */
const ORDER: MediaType[] = ["SERIES", "MOVIE", "BOOK"];

/** Onglet « Réglages » : périmètre de la recherche (types de médias inclus). */
export function SearchSettings() {
  const { enabled, toggle } = useSearchSettingsStore();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Recherche</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez les types de médias inclus dans la recherche.
        </p>
      </div>
      <ul className="space-y-2">
        {ORDER.map((type) => {
          const Icon = ICONS[type];
          const label = MEDIA_TYPE_LABEL_PLURAL[type];
          return (
            <li key={type}>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                <span className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <input
                  type="checkbox"
                  checked={enabled[type]}
                  onChange={() => toggle(type)}
                  className="h-5 w-5 accent-primary"
                  aria-label={`Inclure les ${label.toLowerCase()} dans la recherche`}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Au moins un type reste actif. D'autres types (mangas, jeux…) arriveront plus tard.
      </p>
    </div>
  );
}
