import type { LibraryItem as LibraryItemDto } from "@otium/types";
import type { LibraryItem } from "../domain";

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
