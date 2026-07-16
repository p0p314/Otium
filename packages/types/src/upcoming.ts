import { z } from "zod";

/** Un épisode à diffusion **future** d'une série suivie. */
export const UpcomingEpisode = z.object({
  itemId: z.string(),
  seriesTitle: z.string(),
  posterUrl: z.string().url().nullable(),
  seasonNumber: z.number().int().nonnegative(),
  number: z.number().int().positive(),
  title: z.string(),
  /** Date de diffusion prévue (ISO). */
  airDate: z.string().datetime(),
});
export type UpcomingEpisode = z.infer<typeof UpcomingEpisode>;

/** Un film **à venir** (sortie future) présent dans la bibliothèque. */
export const UpcomingMovie = z.object({
  itemId: z.string(),
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  /** Date de sortie prévue (ISO). */
  releaseDate: z.string().datetime(),
});
export type UpcomingMovie = z.infer<typeof UpcomingMovie>;

/**
 * Agenda « À venir », **cloisonné par type de média** (jamais mélangés) et extensible
 * (parutions de livres plus tard). Séries : prochains épisodes ; films : sorties.
 */
export const UpcomingDashboard = z.object({
  series: z.array(UpcomingEpisode),
  movies: z.array(UpcomingMovie),
});
export type UpcomingDashboard = z.infer<typeof UpcomingDashboard>;
