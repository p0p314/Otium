/**
 * Modèle de lecture du catalogue externe (résultats de recherche/détails), normalisé.
 * Domaine pur : aucune dépendance à un fournisseur concret (TMDB…) ni à un framework.
 * L'identité provient de la source externe via `externalRef` (ADR-0003 / ADR-0004).
 */
export type CatalogMediaType = "MOVIE" | "SERIES";

export interface CatalogExternalRef {
  readonly provider: string;
  readonly externalId: string;
}

export interface CatalogGenre {
  readonly id: string;
  readonly label: string;
}

export interface CatalogMedia {
  readonly externalRef: CatalogExternalRef;
  readonly type: CatalogMediaType;
  readonly title: string;
  readonly year: number | null;
  readonly posterUrl: string | null;
  readonly genres: readonly CatalogGenre[];
}

export interface CatalogSearchResult {
  readonly items: readonly CatalogMedia[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CatalogEpisode {
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly runtimeMinutes: number | null;
}

export interface CatalogSeason {
  readonly number: number;
  readonly episodes: readonly CatalogEpisode[];
}

/** Structure saisons/épisodes d'une série, normalisée depuis le fournisseur. */
export interface CatalogSeriesDetails {
  readonly seasons: readonly CatalogSeason[];
}

export interface CatalogCastMember {
  readonly name: string;
  readonly character: string | null;
  readonly profileUrl: string | null;
}

export interface CatalogCompany {
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface CatalogWatchProvider {
  readonly name: string;
  readonly logoUrl: string | null;
}

/**
 * Fiche détaillée normalisée d'un média (film ou série). Modèle générique : champs
 * communs + champs spécifiques nullables. Aucune dépendance à un fournisseur concret.
 */
export interface CatalogMediaDetails {
  readonly externalRef: CatalogExternalRef;
  readonly type: CatalogMediaType;
  readonly title: string;
  readonly originalTitle: string | null;
  readonly posterUrl: string | null;
  readonly backdropUrl: string | null;
  readonly overview: string | null;
  readonly genres: readonly CatalogGenre[];
  readonly rating: number | null;
  readonly voteCount: number;
  readonly releaseDate: string | null;
  readonly year: number | null;
  readonly status: string | null;
  readonly runtimeMinutes: number | null;
  readonly numberOfSeasons: number | null;
  readonly numberOfEpisodes: number | null;
  readonly cast: readonly CatalogCastMember[];
  readonly directors: readonly string[];
  readonly productionCompanies: readonly CatalogCompany[];
  readonly watchProviders: readonly CatalogWatchProvider[];
}
