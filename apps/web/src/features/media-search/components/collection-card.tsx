import type { CollectionSummary, MediaSummary } from "@otium/types";
import { cn } from "@otium/ui";
import { ChevronDown, Layers } from "lucide-react";
import { useId, useState } from "react";
import { MediaCover } from "../../../components/media-cover";
import { MediaCard } from "./media-card";

/** Étendue des tomes trouvés, ex. « tomes 1 à 12 ». Muette si les rangs sont inconnus. */
function volumeRange(positions: readonly number[]): string | null {
  if (positions.length === 0) return null;
  const min = Math.min(...positions);
  const max = Math.max(...positions);
  return min === max ? `tome ${min}` : `tomes ${min} à ${max}`;
}

/**
 * Une **œuvre** dans les résultats de recherche : une entrée unique là où le catalogue
 * en renvoyait autant que de tomes.
 *
 * Les volumes se déplient **sur place** plutôt que de mener à une page dédiée. La fiche
 * d'œuvre suit la bibliothèque, or une œuvre tout juste découverte n'y est pas encore :
 * y renvoyer mènerait à une page vide. Déplier permet d'ajouter le tome voulu sans
 * quitter ses résultats — et c'est cet ajout qui fera exister l'œuvre en bibliothèque.
 */
export function CollectionCard({
  collection,
  renderAction,
  priority = false,
}: {
  collection: CollectionSummary;
  /** Action rendue sur chaque tome déplié (ex. bouton « Ajouter »). */
  renderAction?: (media: MediaSummary) => React.ReactNode;
  priority?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const range = volumeRange(collection.positions);
  const count = collection.volumeCount;

  return (
    <article className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          <MediaCover src={collection.coverUrl} alt="" priority={priority} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Œuvre
          </p>
          <h3 className="line-clamp-2 font-semibold">{collection.title}</h3>
          {collection.authors.length > 0 ? (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {collection.authors.join(", ")}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {count} tome{count > 1 ? "s" : ""} trouvé{count > 1 ? "s" : ""}
            {range ? ` · ${range}` : ""}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <ul
          id={panelId}
          className="grid grid-cols-2 gap-4 border-t p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {collection.volumes.map((volume) => (
            <li key={`${volume.externalRef.provider}:${volume.externalRef.externalId}`}>
              {/* Chaque tome garde sa fiche et son suivi : l'œuvre n'est qu'un regroupement. */}
              <MediaCard media={volume} action={renderAction?.(volume)} />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
