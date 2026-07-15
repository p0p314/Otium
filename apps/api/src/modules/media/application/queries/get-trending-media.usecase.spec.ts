import { describe, expect, it, vi } from "vitest";
import type { CatalogSearchResult, MediaCatalogProvider } from "../../domain";
import { GetTrendingMediaUseCase } from "./get-trending-media.usecase";

const emptyResult: CatalogSearchResult = { items: [], page: 1, pageSize: 20, total: 0 };

function fakeProvider(): MediaCatalogProvider {
  return {
    name: "fake",
    search: vi.fn().mockResolvedValue(emptyResult),
    getTrending: vi.fn().mockResolvedValue(emptyResult),
    getMediaDetails: vi.fn(),
    getSeriesDetails: vi.fn().mockResolvedValue({ seasons: [] }),
  };
}

describe("GetTrendingMediaUseCase", () => {
  it("délègue les tendances au port du catalogue", async () => {
    const provider = fakeProvider();
    const result = await new GetTrendingMediaUseCase(provider).execute({ page: 1, pageSize: 20 });

    expect(result).toBe(emptyResult);
    expect(provider.getTrending).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("transmet le filtre de type quand il est fourni", async () => {
    const provider = fakeProvider();
    await new GetTrendingMediaUseCase(provider).execute({ page: 1, pageSize: 20, type: "SERIES" });

    expect(provider.getTrending).toHaveBeenCalledWith({ page: 1, pageSize: 20, type: "SERIES" });
  });
});
