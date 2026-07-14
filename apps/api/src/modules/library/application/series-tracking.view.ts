import {
  isComplete,
  nextUnwatched,
  type SeasonRef,
  totalEpisodes,
  type WatchStatus,
} from "../domain";

export interface TrackedEpisodeView {
  id: string;
  seasonNumber: number;
  number: number;
  title: string;
  watched: boolean;
}
export interface TrackedSeasonView {
  number: number;
  episodes: TrackedEpisodeView[];
}
export interface SeriesTrackingView {
  itemId: string;
  title: string;
  status: WatchStatus;
  totalEpisodes: number;
  watchedEpisodes: number;
  nextEpisode: TrackedEpisodeView | null;
  seasons: TrackedSeasonView[];
}

/** Assemble la vue de suivi à partir des saisons persistées et des épisodes vus. */
export function buildSeriesTrackingView(
  itemId: string,
  title: string,
  status: WatchStatus,
  seasons: readonly SeasonRef[],
  watched: ReadonlySet<string>,
): SeriesTrackingView {
  const next = nextUnwatched(seasons, watched);
  return {
    itemId,
    title,
    status,
    totalEpisodes: totalEpisodes(seasons),
    watchedEpisodes: [...watched].length,
    nextEpisode: next ? { ...next, watched: false } : null,
    seasons: seasons.map((s) => ({
      number: s.number,
      episodes: s.episodes.map((e) => ({
        id: e.id,
        seasonNumber: e.seasonNumber,
        number: e.number,
        title: e.title,
        watched: watched.has(e.id),
      })),
    })),
  };
}

export { isComplete };
