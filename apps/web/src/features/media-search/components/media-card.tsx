import type { MediaSummary } from "@otium/types";
import { ImageOff } from "lucide-react";

const TYPE_LABEL: Record<MediaSummary["type"], string> = {
  MOVIE: "Film",
  SERIES: "Série",
};

/** Vignette d'un média dans les résultats de recherche. Image en chargement paresseux. */
export function MediaCard({ media }: { media: MediaSummary }) {
  return (
    <article className="group">
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
      <h3 className="mt-2 line-clamp-1 text-sm font-medium">{media.title}</h3>
      <p className="text-xs text-muted-foreground">
        {TYPE_LABEL[media.type]}
        {media.year ? ` · ${media.year}` : ""}
      </p>
    </article>
  );
}
