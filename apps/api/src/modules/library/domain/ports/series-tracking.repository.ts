import type { WatchStatus } from "../models/library-item";
import type { SeasonRef } from "../series-progress";

export interface PersistableEpisode {
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly runtimeMinutes: number | null;
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
  /** Progression de toutes les séries en cours d'un utilisateur (accueil). */
  listInProgress(userId: string): Promise<SeriesProgressRecord[]>;
}

export const SERIES_TRACKING_REPOSITORY = Symbol("SERIES_TRACKING_REPOSITORY");
