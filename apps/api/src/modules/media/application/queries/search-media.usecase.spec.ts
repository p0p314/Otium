import { describe, expect, it, vi } from "vitest";
import type {
  CatalogMedia,
  CatalogMediaType,
  CatalogSearchResult,
  MediaCatalogProvider,
  MediaCatalogRegistry,
} from "../../domain";
import { SearchMediaUseCase } from "./search-media.usecase";

const emptyResult: CatalogSearchResult = { items: [], page: 1, pageSize: 20, total: 0 };

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

function fakeProvider(name: string, result: CatalogSearchResult = emptyResult): MediaCatalogProvider {
  return { name, search: vi.fn().mockResolvedValue(result), getMediaDetails: vi.fn() };
}

/** Registry de test : table explicite `type → fournisseur`. */
function registryOf(map: Partial<Record<CatalogMediaType, MediaCatalogProvider>>): MediaCatalogRegistry {
  return {
    forType: (type) => {
      const provider = map[type];
      if (!provider) throw new Error(`type non couvert : ${type}`);
      return provider;
    },
    supports: (type) => map[type] !== undefined,
    supportedTypes: () => Object.keys(map) as CatalogMediaType[],
  };
}

describe("SearchMediaUseCase", () => {
  it("interroge tous les catalogues couverts quand aucun type n'est demandé", async () => {
    const tmdb = fakeProvider("tmdb", { ...emptyResult, items: [media("tmdb", "1")], total: 1 });
    const books = fakeProvider("books", { ...emptyResult, items: [media("books", "a")], total: 1 });
    const useCase = new SearchMediaUseCase(
      registryOf({ MOVIE: tmdb, SERIES: tmdb, BOOK: books }),
    );

    const result = await useCase.execute({ q: "Dune", page: 1, pageSize: 20 });

    expect(result.items.map((m) => m.title)).toEqual(["tmdb-1", "books-a"]);
    expect(result.total).toBe(2);
  });

  it("n'interroge qu'une fois un fournisseur couvrant plusieurs types demandés", async () => {
    const tmdb = fakeProvider("tmdb");
    const useCase = new SearchMediaUseCase(registryOf({ MOVIE: tmdb, SERIES: tmdb }));

    await useCase.execute({ q: "Dune", page: 1, pageSize: 20, types: ["MOVIE", "SERIES"] });

    expect(tmdb.search).toHaveBeenCalledTimes(1);
    // Aucun filtre transmis : le fournisseur répond sur tout son périmètre (multi).
    expect(tmdb.search).toHaveBeenCalledWith({ query: "Dune", page: 1, pageSize: 20 });
  });

  it("transmet le filtre de type quand un seul type est demandé", async () => {
    const tmdb = fakeProvider("tmdb");
    const useCase = new SearchMediaUseCase(registryOf({ MOVIE: tmdb, SERIES: tmdb }));

    await useCase.execute({ q: "Dune", page: 2, pageSize: 10, type: "MOVIE" });

    expect(tmdb.search).toHaveBeenCalledWith({
      query: "Dune",
      page: 2,
      pageSize: 10,
      type: "MOVIE",
    });
  });

  it("ignore les types non couverts plutôt que d'échouer", async () => {
    const tmdb = fakeProvider("tmdb");
    const useCase = new SearchMediaUseCase(registryOf({ MOVIE: tmdb }));

    const result = await useCase.execute({ q: "Dune", page: 1, pageSize: 20, types: ["MOVIE", "BOOK"] });

    expect(tmdb.search).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([]);
  });

  it("sert les autres sources quand un catalogue est en panne (dégradation gracieuse)", async () => {
    const tmdb = fakeProvider("tmdb", { ...emptyResult, items: [media("tmdb", "1")], total: 1 });
    const books = fakeProvider("books");
    vi.mocked(books.search).mockRejectedValue(new Error("Google Books indisponible"));
    const useCase = new SearchMediaUseCase(registryOf({ MOVIE: tmdb, BOOK: books }));

    const result = await useCase.execute({ q: "Dune", page: 1, pageSize: 20 });

    expect(result.items.map((m) => m.title)).toEqual(["tmdb-1"]);
    expect(result.total).toBe(1);
  });
});
