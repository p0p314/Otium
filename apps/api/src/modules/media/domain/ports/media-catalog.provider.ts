import type {
  CatalogMediaDetails,
  CatalogMediaType,
  CatalogSearchResult,
} from "../models/catalog-media";

export interface MediaCatalogSearchParams {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * **Socle** du catalogue de médias : les deux capacités que tout fournisseur doit offrir,
 * quel que soit le type de média (film, série, livre…). Le domaine dépend de cette
 * interface, jamais d'un fournisseur concret ; les adapters (TMDB, Google Books…)
 * l'implémentent en infrastructure (ADR-0004).
 *
 * Les capacités **optionnelles** (structure de série, tendances) vivent dans des
 * interfaces séparées : un fournisseur de livres n'a pas à les implémenter (ISP).
 * La sélection du bon adapter selon le type se fait via `MediaCatalogRegistry` (ADR-0015).
 */
export interface MediaCatalogProvider {
  readonly name: string;
  search(params: MediaCatalogSearchParams): Promise<CatalogSearchResult>;
  /** Fiche détaillée d'un média par type + identifiant externe. */
  getMediaDetails(type: CatalogMediaType, externalId: string): Promise<CatalogMediaDetails>;
}
