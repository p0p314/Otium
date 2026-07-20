import type { CatalogMediaType, CatalogSearchResult } from "../models/catalog-media";

export interface MediaCatalogTrendingParams {
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * Capacité **optionnelle** : tendances du moment. Tous les catalogues n'en exposent pas
 * (Google Books, par exemple, n'a pas d'endpoint « tendances ») — d'où une interface
 * distincte du socle plutôt qu'une méthode obligatoire renvoyant du vide.
 */
export interface TrendingCatalogProvider {
  readonly name: string;
  getTrending(params: MediaCatalogTrendingParams): Promise<CatalogSearchResult>;
}

/** Jeton d'injection (DI) pour la capacité « tendances ». */
export const TRENDING_CATALOG_PROVIDER = Symbol("TRENDING_CATALOG_PROVIDER");
