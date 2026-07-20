import { describe, expect, it, vi } from "vitest";
import type { CatalogSearchResult, TrendingCatalogProvider } from "../../domain";
import { GetTrendingMediaUseCase } from "./get-trending-media.usecase";

const emptyResult: CatalogSearchResult = { items: [], page: 1, pageSize: 20, total: 0 };

function fakeProvider(): TrendingCatalogProvider {
  return { name: "fake", getTrending: vi.fn().mockResolvedValue(emptyResult) };
}

describe("GetTrendingMediaUseCase", () => {
  it("délègue les tendances à la capacité « tendances » du catalogue", async () => {
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
