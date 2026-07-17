import { z } from "zod";
import { CastMember } from "./media-details.js";
import { Rating, WatchStatus } from "./media.js";

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

/** Note (0–10) et/ou avis d'un utilisateur sur un épisode. Les deux sont optionnels. */
export const EpisodeReview = z.object({
  rating: Rating.nullable(),
  body: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type EpisodeReview = z.infer<typeof EpisodeReview>;

/** Réponse de lecture : null = ni note ni avis pour cet épisode. */
export const EpisodeReviewResponse = z.object({
  review: EpisodeReview.nullable(),
});
export type EpisodeReviewResponse = z.infer<typeof EpisodeReviewResponse>;

/**
 * Enregistrement d'une note et/ou d'un avis d'épisode. Une note peut être posée sans avis
 * (et inversement) mais au moins l'un des deux doit être renseigné (sinon → suppression).
 */
export const SaveEpisodeReviewInput = z
  .object({
    rating: Rating.nullable(),
    body: z.string().trim().max(5000).nullable(),
  })
  .refine((v) => v.rating !== null || (v.body !== null && v.body.length > 0), {
    message: "Renseignez une note ou un avis.",
  });
export type SaveEpisodeReviewInput = z.infer<typeof SaveEpisodeReviewInput>;

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
