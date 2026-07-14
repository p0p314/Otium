import { z } from "zod";
import { WatchStatus } from "./media.js";

export const TrackedEpisode = z.object({
  id: z.string(),
  seasonNumber: z.number().int().nonnegative(),
  number: z.number().int().positive(),
  title: z.string(),
  watched: z.boolean(),
});
export type TrackedEpisode = z.infer<typeof TrackedEpisode>;

export const TrackedSeason = z.object({
  number: z.number().int().nonnegative(),
  episodes: z.array(TrackedEpisode),
});
export type TrackedSeason = z.infer<typeof TrackedSeason>;

/** État de suivi d'une série pour un élément de bibliothèque. */
export const SeriesTracking = z.object({
  itemId: z.string(),
  title: z.string(),
  status: WatchStatus,
  totalEpisodes: z.number().int().nonnegative(),
  watchedEpisodes: z.number().int().nonnegative(),
  /** Prochain épisode à regarder (reprise), ou null si terminé. */
  nextEpisode: TrackedEpisode.nullable(),
  seasons: z.array(TrackedSeason),
});
export type SeriesTracking = z.infer<typeof SeriesTracking>;

export const MarkEpisodeInput = z.object({
  episodeId: z.string().min(1),
  watched: z.boolean(),
});
export type MarkEpisodeInput = z.infer<typeof MarkEpisodeInput>;
