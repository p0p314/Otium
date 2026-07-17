import { z } from "zod";
import { CastMember } from "./media-details.js";
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

/** Fiche détaillée d'un épisode (catalogue) : résumé, image, note et casting. */
export const EpisodeDetails = z.object({
  seasonNumber: z.number().int().nonnegative(),
  number: z.number().int().positive(),
  title: z.string(),
  overview: z.string().nullable(),
  airDate: z.string().nullable(),
  runtimeMinutes: z.number().int().positive().nullable(),
  stillUrl: z.string().url().nullable(),
  rating: z.number().nullable(),
  cast: z.array(CastMember),
});
export type EpisodeDetails = z.infer<typeof EpisodeDetails>;

export const MarkEpisodeInput = z.object({
  episodeId: z.string().min(1),
  watched: z.boolean(),
});
export type MarkEpisodeInput = z.infer<typeof MarkEpisodeInput>;

/** Marquage en masse (saison complète, série complète) en une seule requête. */
export const MarkEpisodesInput = z.object({
  episodeIds: z.array(z.string().min(1)).min(1).max(2000),
  watched: z.boolean(),
});
export type MarkEpisodesInput = z.infer<typeof MarkEpisodesInput>;
