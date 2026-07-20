import type {
  CatalogMediaType,
  MediaCatalogProvider,
  MediaCatalogRegistry,
} from "../../src/modules/media/domain";

/**
 * Registry de test qui route **tous** les types vers un unique fournisseur. Évite de
 * dupliquer ce câblage dans chaque spec depuis l'introduction du registry (ADR-0015).
 */
export function singleProviderRegistry(provider: MediaCatalogProvider): MediaCatalogRegistry {
  return {
    forType: () => provider,
    supports: () => true,
    supportedTypes: (): readonly CatalogMediaType[] => ["MOVIE", "SERIES"],
  };
}
