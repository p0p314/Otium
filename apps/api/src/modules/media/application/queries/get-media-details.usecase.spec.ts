import { describe, expect, it, vi } from "vitest";
import type { CatalogMediaDetails, MediaCatalogProvider } from "../../domain";
import { GetMediaDetailsUseCase } from "./get-media-details.usecase";

const details = {
  externalRef: { provider: "tmdb", externalId: "42" },
  type: "MOVIE",
  title: "Dune",
} as unknown as CatalogMediaDetails;

function fakeProvider(): MediaCatalogProvider {
  return {
    name: "fake",
    search: vi.fn(),
    getTrending: vi.fn(),
    getMediaDetails: vi.fn().mockResolvedValue(details),
    getSeriesDetails: vi.fn(),
    getEpisodeDetails: vi.fn(),
  };
}

describe("GetMediaDetailsUseCase", () => {
  it("délègue la récupération de la fiche au port du catalogue", async () => {
    const provider = fakeProvider();
    const result = await new GetMediaDetailsUseCase(provider).execute({
      type: "MOVIE",
      externalId: "42",
    });

    expect(result).toBe(details);
    expect(provider.getMediaDetails).toHaveBeenCalledWith("MOVIE", "42");
  });
});
