import type { CatalogEpisodeDetails, CatalogSeriesDetails } from "../models/catalog-media";
import type { MediaCatalogProvider } from "./media-catalog.provider";

/**
 * Capacité **optionnelle** : structure saisons/épisodes et fiche d'épisode. Seuls les
 * fournisseurs de séries l'implémentent (TMDB en V1) — un catalogue de livres n'a pas
 * à porter ces méthodes (principe de ségrégation des interfaces).
 */
export interface SeriesCatalogProvider extends MediaCatalogProvider {
  /** Structure saisons/épisodes d'une série, par identifiant externe. */
  getSeriesDetails(externalId: string): Promise<CatalogSeriesDetails>;
  /** Fiche détaillée d'un épisode (résumé, image, casting) par série + saison + numéro. */
  getEpisodeDetails(
    externalId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<CatalogEpisodeDetails>;
}

/** Jeton d'injection (DI) pour la capacité « séries ». */
export const SERIES_CATALOG_PROVIDER = Symbol("SERIES_CATALOG_PROVIDER");
