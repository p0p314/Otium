import type { MediaSummary } from "@otium/types";
import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import type { ReactNode } from "react";
import { MEDIA_TYPE_LABEL } from "../../../lib/media-type";

/**
 * Vignette d'un média : lien vers la fiche + action rapide superposée sur l'affiche
 * (ajout en 1 tap). L'action est un frère du lien (jamais imbriquée dans le `<a>`).
 */
export function MediaCard({ media, action }: { media: MediaSummary; action?: ReactNode }) {
  return (
    <article className="group relative">
      <Link
        to="/media/$type/$externalId"
        params={{ type: media.type, externalId: media.externalRef.externalId }}
        className="block"
        aria-label={`Voir la fiche de ${media.title}`}
      >
        <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
          {media.posterUrl ? (
            <img
              src={media.posterUrl}
              alt={`Affiche de ${media.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" aria-hidden />
            </div>
          )}
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
