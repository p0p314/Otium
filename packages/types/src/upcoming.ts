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

/**
 * Agenda « À venir », **cloisonné par type de média** (jamais mélangés) et extensible
 * (sorties de films, parutions de livres plus tard). V1 : épisodes de séries.
 */
export const UpcomingDashboard = z.object({
  series: z.array(UpcomingEpisode),
});
export type UpcomingDashboard = z.infer<typeof UpcomingDashboard>;
