import { describe, expect, it, vi } from "vitest";
import type { CatalogMediaDetails, MediaCatalogProvider, MediaCatalogRegistry } from "../../domain";
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
    getMediaDetails: vi.fn().mockResolvedValue(details),
  };
}

/** Registry de test : route tous les types vers l'unique fournisseur fourni. */
function registryOf(provider: MediaCatalogProvider): MediaCatalogRegistry {
  return { forType: () => provider, supports: () => true, supportedTypes: () => ["MOVIE"] };
}

describe("GetMediaDetailsUseCase", () => {
  it("délègue la récupération de la fiche au catalogue choisi par le registry", async () => {
    const provider = fakeProvider();
    const result = await new GetMediaDetailsUseCase(registryOf(provider)).execute({
      type: "MOVIE",
      externalId: "42",
    });

    expect(result).toBe(details);
    expect(provider.getMediaDetails).toHaveBeenCalledWith("MOVIE", "42");
  });
});
