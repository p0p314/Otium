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
  setEpisodeWatched(itemId: string, episodeId: string, watched: boolean): Promise<void>;
  setStatus(itemId: string, status: WatchStatus): Promise<void>;
}

export const SERIES_TRACKING_REPOSITORY = Symbol("SERIES_TRACKING_REPOSITORY");
