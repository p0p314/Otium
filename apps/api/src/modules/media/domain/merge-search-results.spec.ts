import { describe, expect, it } from "vitest";
import { mergeSearchResults } from "./merge-search-results";
import type { CatalogMedia, CatalogSearchResult } from "./models/catalog-media";

function media(provider: string, id: string): CatalogMedia {
  return {
    externalRef: { provider, externalId: id },
    type: "MOVIE",
    title: `${provider}-${id}`,
    originalTitle: null,
    year: null,
    posterUrl: null,
    genres: [],
  };
}

function result(items: CatalogMedia[], total = items.length): CatalogSearchResult {
  return { items, page: 1, pageSize: 20, total };
}

describe("mergeSearchResults", () => {
  it("entrelace les sources pour qu'aucune n'enterre l'autre", () => {
    const merged = mergeSearchResults(
      [
        result([media("tmdb", "1"), media("tmdb", "2"), media("tmdb", "3")]),
        result([media("books", "a"), media("books", "b")]),
      ],
      1,
      20,
    );

    expect(merged.items.map((m) => m.title)).toEqual([
      "tmdb-1",
      "books-a",
      "tmdb-2",
      "books-b",
      "tmdb-3",
    ]);
  });

  it("cumule les totaux des sources", () => {
    const merged = mergeSearchResults([result([media("tmdb", "1")], 120), result([], 8)], 1, 20);
    expect(merged.total).toBe(128);
  });

  it("élimine les doublons de référence externe", () => {
    const merged = mergeSearchResults(
      [result([media("tmdb", "1")]), result([media("tmdb", "1"), media("tmdb", "2")])],
      1,
      20,
    );
    expect(merged.items).toHaveLength(2);
  });

  it("respecte la taille de page demandée", () => {
    const merged = mergeSearchResults(
      [result([media("tmdb", "1"), media("tmdb", "2"), media("tmdb", "3")])],
      1,
      2,
    );
    expect(merged.items).toHaveLength(2);
    expect(merged.pageSize).toBe(2);
  });

  it("renvoie une page vide sans source", () => {
    expect(mergeSearchResults([], 1, 20)).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });
});
