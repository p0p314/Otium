import type { MediaType } from "@otium/types";
import { cn } from "@otium/ui";
import { BookOpen, Film, Tv, type LucideIcon } from "lucide-react";
import { MEDIA_TYPE_LABEL_PLURAL } from "../../../lib/media-type";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";

/** Icône par type — table exhaustive : un nouveau type doit choisir la sienne. */
const ICONS: Record<MediaType, LucideIcon> = { SERIES: Tv, MOVIE: Film, BOOK: BookOpen };

/** Ordre d'affichage, aligné sur les onglets de la bibliothèque. */
const ORDER: MediaType[] = ["SERIES", "MOVIE", "BOOK"];

/**
 * Périmètre de la recherche, directement sous la barre de saisie : on voit ce qu'on
 * cherche et on l'ajuste sans quitter la page.
 *
 * Ce sont des bascules **indépendantes** (plusieurs types actifs à la fois), d'où des
 * boutons `aria-pressed` dans un `group` — et non un `radiogroup`, qui promettrait un
 * choix exclusif. Le store garantit qu'au moins un type reste actif ; le dernier bouton
 * encore actif est donc désactivé plutôt que de laisser l'utilisateur produire une
 * recherche vide sans explication.
 */
export function SearchTypeFilter() {
  const enabled = useSearchSettingsStore((state) => state.enabled);
  const toggle = useSearchSettingsStore((state) => state.toggle);
  const activeCount = ORDER.filter((type) => enabled[type]).length;

  return (
    <div role="group" aria-label="Types de médias recherchés" className="flex flex-wrap gap-2">
      {ORDER.map((type) => {
        const Icon = ICONS[type];
        const isOn = enabled[type];
        const isLastActive = isOn && activeCount === 1;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={isOn}
            disabled={isLastActive}
            {...(isLastActive ? { title: "Au moins un type doit rester sélectionné" } : {})}
            onClick={() => toggle(type)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isOn
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-input bg-background text-muted-foreground hover:text-foreground",
              isLastActive && "cursor-default",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {MEDIA_TYPE_LABEL_PLURAL[type]}
          </button>
        );
      })}
    </div>
  );
}
