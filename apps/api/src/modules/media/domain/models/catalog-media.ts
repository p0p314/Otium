/**
 * Modèle de lecture du catalogue externe (résultats de recherche/détails), normalisé.
 * Domaine pur : aucune dépendance à un fournisseur concret (TMDB…) ni à un framework.
 * L'identité provient de la source externe via `externalRef` (ADR-0003 / ADR-0004).
 */
export type CatalogMediaType = "MOVIE" | "SERIES" | "BOOK";

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
  /** Titre d'origine (langue originale), utile au rapprochement d'imports en anglais. */
  readonly originalTitle: string | null;
  readonly year: number | null;
  readonly posterUrl: string | null;
  readonly genres: readonly CatalogGenre[];
}

/**
 * Œuvre reconstituée à partir des volumes présents dans les résultats (série de tomes,
 * cycle de romans). Permet d'afficher une fiche unique au lieu de N volumes.
 */
export interface CatalogCollection {
  readonly ref: CatalogExternalRef;
  readonly title: string;
  readonly coverUrl: string | null;
  readonly authors: readonly string[];
  /** Nombre de volumes **trouvés** — pas le total réel de l'œuvre, souvent plus grand. */
  readonly volumeCount: number;
  /** Rangs connus, pour afficher « tomes 1 à 12 » sans charger les volumes. */
  readonly positions: readonly number[];
  readonly volumes: readonly CatalogMedia[];
}

export interface CatalogSearchResult {
  readonly items: readonly CatalogMedia[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  /**
   * Œuvres reconstituées. Champ **additif** : les catalogues qui ne regroupent rien
   * (TMDB) l'omettent, et les clients qui l'ignorent gardent le comportement d'avant.
   */
  readonly collections?: readonly CatalogCollection[];
}

export interface CatalogEpisode {
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly runtimeMinutes: number | null;
  /** Date de diffusion ISO (`YYYY-MM-DD`), ou null si inconnue. */
  readonly airDate: string | null;
}

export interface CatalogSeason {
  readonly number: number;
  readonly episodes: readonly CatalogEpisode[];
}

/** Fiche détaillée d'un épisode (résumé, image, casting), normalisée depuis le fournisseur. */
export interface CatalogEpisodeDetails {
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly overview: string | null;
  readonly airDate: string | null;
  readonly runtimeMinutes: number | null;
  readonly stillUrl: string | null;
  readonly rating: number | null;
  /** Acteurs principaux de l'épisode (casting récurrent + invités). */
  readonly cast: readonly CatalogCastMember[];
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

/** Œuvre (série de tomes, cycle) dont un média fait partie. */
export interface CatalogCollectionRef {
  readonly id: string;
  readonly provider: string;
  /** Titre de l'œuvre, débarrassé du numéro de tome. */
  readonly title: string;
  /** Comment le rattachement a été établi — trace un regroupement discutable. */
  readonly method: string;
  /** Rang du volume dans l'œuvre, `null` si le fournisseur ne le donne pas. */
  readonly position: number | null;
}

/**
 * Bloc propre aux livres, dans le modèle normalisé du catalogue. N'y figure que ce qui
 * n'a pas d'équivalent générique : titre, couverture, description, genres et note moyenne
 * restent au niveau `CatalogMediaDetails` (ADR-0003).
 */
export interface CatalogBookDetails {
  readonly subtitle: string | null;
  readonly authors: readonly string[];
  readonly publisher: string | null;
  /** Date de publication brute (`YYYY`, `YYYY-MM` ou `YYYY-MM-DD`). */
  readonly publishedDate: string | null;
  readonly pageCount: number | null;
  /** Code langue ISO 639-1, ex. `fr`. */
  readonly language: string | null;
  readonly isbn10: string | null;
  readonly isbn13: string | null;
  readonly googleBooksId: string | null;
  readonly openLibraryId: string | null;
  readonly infoUrl: string | null;
  readonly previewUrl: string | null;
  /** Couverture haute résolution si le fournisseur en propose une. */
  readonly coverUrlLarge: string | null;
  /** Fournisseurs ayant contribué à la fiche après fusion (ADR-0016). */
  readonly sources: readonly string[];
  /** Œuvre dont ce volume fait partie (un tome de manga, un cycle de romans). */
  readonly collection: CatalogCollectionRef | null;
}

/**
 * Fiche détaillée normalisée d'un média (film, série ou livre). Modèle générique : champs
 * communs + blocs spécifiques nullables. Aucune dépendance à un fournisseur concret.
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
  /** Livre : données propres au type. `null` pour les autres médias. */
  readonly book: CatalogBookDetails | null;
}
