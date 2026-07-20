import type { MediaSummary } from "@otium/types";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MediaCover } from "../../../components/media-cover";
import { MEDIA_TYPE_LABEL } from "../../../lib/media-type";

/**
 * Vignette d'un média : lien vers la fiche + action rapide superposée sur l'affiche
 * (ajout en 1 tap). L'action est un frère du lien (jamais imbriquée dans le `<a>`).
 */
export function MediaCard({
  media,
  action,
  priority = false,
}: {
  media: MediaSummary;
  action?: ReactNode;
  /** Vrai pour les premières vignettes de la grille (chargement immédiat). */
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <Link
        to="/media/$type/$externalId"
        params={{ type: media.type, externalId: media.externalRef.externalId }}
        className="block"
        aria-label={`Voir la fiche de ${media.title}`}
      >
        <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
          <MediaCover
            src={media.posterUrl}
            alt={`Affiche de ${media.title}`}
            priority={priority}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <h3 className="mt-2 line-clamp-1 text-sm font-medium group-hover:text-primary">
          {media.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {MEDIA_TYPE_LABEL[media.type]}
          {media.year ? ` · ${media.year}` : ""}
        </p>
      </Link>
      {action ? <div className="absolute right-1.5 top-1.5 z-10">{action}</div> : null}
    </article>
  );
}
