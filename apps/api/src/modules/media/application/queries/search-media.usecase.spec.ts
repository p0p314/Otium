import { describe, expect, it, vi } from "vitest";
import type { CatalogSearchResult, MediaCatalogProvider } from "../../domain";
import { SearchMediaUseCase } from "./search-media.usecase";

const emptyResult: CatalogSearchResult = { items: [], page: 1, pageSize: 20, total: 0 };

describe("SearchMediaUseCase", () => {
  it("délègue la recherche au port du catalogue", async () => {
    const provider: MediaCatalogProvider = {
      name: "fake",
      search: vi.fn().mockResolvedValue(emptyResult),
      getTrending: vi.fn().mockResolvedValue(emptyResult),
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({ seasons: [] }),
    };
    const useCase = new SearchMediaUseCase(provider);

    const result = await useCase.execute({ q: "Dune", page: 1, pageSize: 20 });

    expect(result).toBe(emptyResult);
    expect(provider.search).toHaveBeenCalledWith({ query: "Dune", page: 1, pageSize: 20 });
  });

  it("transmet le filtre de type quand il est fourni", async () => {
    const provider: MediaCatalogProvider = {
      name: "fake",
      search: vi.fn().mockResolvedValue(emptyResult),
      getTrending: vi.fn().mockResolvedValue(emptyResult),
      getMediaDetails: vi.fn(),
      getSeriesDetails: vi.fn().mockResolvedValue({ seasons: [] }),
    };
    const useCase = new SearchMediaUseCase(provider);

    await useCase.execute({ q: "Dune", page: 2, pageSize: 10, type: "MOVIE" });

    expect(provider.search).toHaveBeenCalledWith({
      query: "Dune",
      page: 2,
      pageSize: 10,
      type: "MOVIE",
    });
  });
});
