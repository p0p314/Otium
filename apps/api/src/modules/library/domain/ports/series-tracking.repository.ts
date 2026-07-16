import type { WatchStatus } from "../models/library-item";
import type { SeasonRef } from "../series-progress";

export interface PersistableEpisode {
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly runtimeMinutes: number | null;
  /** Date de diffusion, ou null si inconnue. */
  readonly airDate: Date | null;
}

export interface PersistableSeason {
  readonly number: number;
  readonly episodes: readonly PersistableEpisode[];
}

/** Contexte minimal d'un élément de bibliothèque nécessaire au suivi de série. */
export interface TrackingContext {
  readonly mediaId: string;
  readonly externalId: string;
  readonly title: string;
  readonly status: WatchStatus;
}

/** Série candidate à un rafraîchissement de sa structure (saisons/épisodes/dates). */
export interface SeriesSyncCandidate {
  readonly mediaId: string;
  readonly externalId: string;
}

/**
 * Instantané de progression d'une série pour l'accueil : saisons/épisodes,
 * épisodes vus et date de dernière activité. Assemblé en une requête (éco-conception).
 */
export interface SeriesProgressRecord {
  readonly itemId: string;
  readonly title: string;
  readonly posterUrl: string | null;
  readonly status: WatchStatus;
  readonly seasons: readonly SeasonRef[];
  readonly watchedIds: ReadonlySet<string>;
  readonly lastWatchedAt: Date | null;
}

/**
 * Port de persistance du suivi de séries : structure saisons/épisodes (partagée entre
 * utilisateurs) et progression (épisodes vus, propre à un élément de bibliothèque).
 */
export interface SeriesTrackingRepository {
  getContext(userId: string, itemId: string): Promise<TrackingContext | null>;
  hasEpisodes(mediaId: string): Promise<boolean>;
  saveSeasons(mediaId: string, seasons: readonly PersistableSeason[]): Promise<void>;
  getSeasons(mediaId: string): Promise<SeasonRef[]>;
  getWatchedEpisodeIds(itemId: string): Promise<Set<string>>;
  isEpisodeOfMedia(mediaId: string, episodeId: string): Promise<boolean>;
  /** Nombre d'épisodes (parmi `episodeIds`) appartenant réellement au média. */
  countEpisodesOfMedia(mediaId: string, episodeIds: readonly string[]): Promise<number>;
  setEpisodeWatched(itemId: string, episodeId: string, watched: boolean): Promise<void>;
  /** Marque/démarque plusieurs épisodes en une opération (saison/série complète). */
  setEpisodesWatched(
    itemId: string,
    episodeIds: readonly string[],
    watched: boolean,
  ): Promise<void>;
  setStatus(itemId: string, status: WatchStatus): Promise<void>;
  /**
   * Progression de **toutes** les séries de la bibliothèque d'un utilisateur (tous
   * statuts), structure saisons/épisodes incluse. Base de l'accueil et de « À venir ».
   */
  listTrackedSeries(userId: string): Promise<SeriesProgressRecord[]>;
  /**
   * Séries suivies (hors abandonnées) dont la structure n'a **jamais** été synchronisée
   * ou l'a été avant `staleBefore`. Alimente le rafraîchissement périodique de « À venir ».
   * Dédoublonné par média (structure partagée entre utilisateurs).
   */
  listSeriesNeedingSync(userId: string, staleBefore: Date): Promise<SeriesSyncCandidate[]>;
  /** Horodate la dernière synchro de structure d'un média (garde-fou de fraîcheur). */
  markEpisodesSynced(mediaId: string, syncedAt: Date): Promise<void>;
}

export const SERIES_TRACKING_REPOSITORY = Symbol("SERIES_TRACKING_REPOSITORY");
