import type {
  CatalogEpisodeDetails,
  CatalogMediaDetails,
  CatalogMediaType,
  CatalogSearchResult,
  CatalogSeriesDetails,
} from "../models/catalog-media";

export interface MediaCatalogSearchParams {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

export interface MediaCatalogTrendingParams {
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * Port du catalogue de médias. Le domaine dépend de cette interface, jamais d'un
 * fournisseur concret. Les adapters (TMDB, TVMaze…) l'implémentent en infrastructure,
 * ce qui rend le fournisseur remplaçable sans impact métier (ADR-0004).
 */
export interface MediaCatalogProvider {
  readonly name: string;
  search(params: MediaCatalogSearchParams): Promise<CatalogSearchResult>;
  /** Tendances du moment (films/séries), pour la mise en avant. */
  getTrending(params: MediaCatalogTrendingParams): Promise<CatalogSearchResult>;
  /** Fiche détaillée d'un média (film ou série) par type + identifiant externe. */
  getMediaDetails(type: CatalogMediaType, externalId: string): Promise<CatalogMediaDetails>;
  /** Structure saisons/épisodes d'une série, par identifiant externe. */
  getSeriesDetails(externalId: string): Promise<CatalogSeriesDetails>;
  /** Fiche détaillée d'un épisode (résumé, image, casting) par série + saison + numéro. */
  getEpisodeDetails(
    externalId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<CatalogEpisodeDetails>;
}

/** Jeton d'injection (DI) pour le port `MediaCatalogProvider`. */
export const MEDIA_CATALOG_PROVIDER = Symbol("MEDIA_CATALOG_PROVIDER");
