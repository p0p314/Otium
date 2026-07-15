import type { LibraryItem as LibraryItemDto, MediaSummary } from "@otium/types";
import type { LibraryItem, MediaDescriptor } from "../domain";

/**
 * Convertit un résumé de média (contrat) vers le descripteur du domaine. Les genres
 * sont réduits à leurs libellés ; ils sont complétés à l'ajout via le catalogue.
 */
export function toMediaDescriptor(summary: MediaSummary): MediaDescriptor {
  return {
    externalRef: summary.externalRef,
    type: summary.type,
    title: summary.title,
    year: summary.year,
    posterUrl: summary.posterUrl,
    genres: summary.genres.map((g) => g.label),
  };
}

/** Convertit un élément de bibliothèque du domaine vers le DTO de contrat. */
export function toLibraryItemDto(item: LibraryItem): LibraryItemDto {
  return {
    id: item.id,
    media: {
      type: item.media.type,
      title: item.media.title,
      year: item.media.year,
      posterUrl: item.media.posterUrl,
      genres: [],
      externalRef: item.media.externalRef,
    },
    status: item.status,
    rating: item.rating,
    isFavorite: item.isFavorite,
    addedAt: item.addedAt.toISOString(),
  };
}
