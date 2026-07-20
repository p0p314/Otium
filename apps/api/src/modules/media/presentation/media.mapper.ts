import type { CollectionSummary, MediaSummary, SearchMediaResult } from "@otium/types";
import type { CatalogCollection, CatalogMedia, CatalogSearchResult } from "../domain";

/** Convertit un média du catalogue vers le DTO de contrat partagé. */
function toMediaSummary(media: CatalogMedia): MediaSummary {
  return {
    type: media.type,
    title: media.title,
    year: media.year,
    posterUrl: media.posterUrl,
    genres: media.genres.map((genre) => ({ id: genre.id, label: genre.label })),
    externalRef: {
      provider: media.externalRef.provider,
      externalId: media.externalRef.externalId,
    },
  };
}

/** Convertit une œuvre reconstituée (série de tomes, cycle) vers le DTO. */
function toCollectionSummary(collection: CatalogCollection): CollectionSummary {
  return {
    externalRef: { ...collection.ref },
    title: collection.title,
    coverUrl: collection.coverUrl,
    authors: [...collection.authors],
    volumeCount: collection.volumeCount,
    positions: [...collection.positions],
    volumes: collection.volumes.map(toMediaSummary),
  };
}

/** Convertit le résultat de recherche du domaine vers le DTO de contrat partagé. */
export function toSearchMediaResult(result: CatalogSearchResult): SearchMediaResult {
  const collections = result.collections ?? [];
  return {
    items: result.items.map(toMediaSummary),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    // Champ omis plutôt que tableau vide : le contrat le déclare optionnel, et une
    // réponse sans œuvre reste alors identique à ce qu'elle était avant.
    ...(collections.length > 0 ? { collections: collections.map(toCollectionSummary) } : {}),
  };
}
