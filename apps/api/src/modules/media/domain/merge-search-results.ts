import type { CatalogMedia, CatalogSearchResult } from "./models/catalog-media";

/** Clé d'identité d'un résultat : sa référence externe (fournisseur + identifiant). */
function key(media: CatalogMedia): string {
  return `${media.externalRef.provider}:${media.externalRef.externalId}`;
}

/**
 * Fusionne les résultats de plusieurs catalogues en une page unique (**fonction pure**,
 * testable sans I/O).
 *
 * Stratégie : **entrelacement** (round-robin) plutôt que concaténation, pour qu'un
 * catalogue verbeux (TMDB) n'enterre pas un catalogue plus discret (livres) sous ses
 * résultats. L'ordre interne de chaque source — sa pertinence — est préservé.
 * Les doublons (même référence externe) sont éliminés ; le `total` cumule les sources
 * afin que la pagination reflète le volume réel disponible.
 */
export function mergeSearchResults(
  results: readonly CatalogSearchResult[],
  page: number,
  pageSize: number,
): CatalogSearchResult {
  const seen = new Set<string>();
  const items: CatalogMedia[] = [];
  const longest = Math.max(0, ...results.map((r) => r.items.length));

  for (let rank = 0; rank < longest && items.length < pageSize; rank++) {
    for (const result of results) {
      if (items.length >= pageSize) break;
      const media = result.items[rank];
      if (!media || seen.has(key(media))) continue;
      seen.add(key(media));
      items.push(media);
    }
  }

  return {
    items,
    page,
    pageSize,
    total: results.reduce((sum, result) => sum + result.total, 0),
  };
}
