/**
 * Port de lecture agrégée pour les statistiques. Le repository fournit des données
 * **brutes** minimales ; l'assemblage (séries temporelles, tops, records) est une
 * logique pure dans l'application (testable sans I/O).
 */
export interface WatchedEpisodeRecord {
  readonly watchedAt: Date;
  /** Durée de l'épisode en minutes (0 si inconnue). */
  readonly minutes: number;
  readonly seriesTitle: string;
}

export interface CompletedMovieRecord {
  /** Date de complétion approximée par la dernière mise à jour de l'élément. */
  readonly completedAt: Date;
  readonly minutes: number;
}

export interface StatsRawData {
  readonly moviesCompleted: number;
  readonly seriesCompleted: number;
  readonly seriesInProgress: number;
  readonly seriesDropped: number;
  readonly movies: number;
  readonly series: number;
  readonly averageRating: number | null;
  readonly episodes: readonly WatchedEpisodeRecord[];
  readonly completedMovies: readonly CompletedMovieRecord[];
  /** Genres (libellés, avec répétitions) des médias regardés. */
  readonly watchedGenres: readonly string[];
}

export interface StatsRepository {
  getRawData(userId: string): Promise<StatsRawData>;
}

export const STATS_REPOSITORY = Symbol("STATS_REPOSITORY");
