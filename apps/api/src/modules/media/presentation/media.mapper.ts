import type { SearchMediaResult } from "@otium/types";
import type { CatalogSearchResult } from "../domain";

/** Convertit le résultat de recherche du domaine vers le DTO de contrat partagé. */
export function toSearchMediaResult(result: CatalogSearchResult): SearchMediaResult {
  return {
    items: result.items.map((media) => ({
      type: media.type,
      title: media.title,
      year: media.year,
      posterUrl: media.posterUrl,
      genres: media.genres.map((genre) => ({ id: genre.id, label: genre.label })),
      externalRef: {
        provider: media.externalRef.provider,
        externalId: media.externalRef.externalId,
      },
    })),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
}
