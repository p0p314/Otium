import { z } from "zod";
import { TrackedEpisode } from "./series.js";

/** Une série mise en avant sur l'accueil (progression + reprise + dernière activité). */
export const HomeSeries = z.object({
  itemId: z.string(),
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  totalEpisodes: z.number().int().nonnegative(),
  watchedEpisodes: z.number().int().nonnegative(),
  /** Prochain épisode à regarder (reprise), ou null si terminé. */
  nextEpisode: TrackedEpisode.nullable(),
  /** Date du dernier épisode vu (ISO), ou null si aucun. */
  lastWatchedAt: z.string().datetime().nullable(),
});
export type HomeSeries = z.infer<typeof HomeSeries>;

/**
 * Tableau de bord de l'accueil : séries en cours (activité récente) et séries
 * laissées de côté (pas d'épisode vu depuis un moment).
 */
export const HomeDashboard = z.object({
  continueWatching: z.array(HomeSeries),
  staleSeries: z.array(HomeSeries),
});
export type HomeDashboard = z.infer<typeof HomeDashboard>;

/** Seuil (jours) au-delà duquel une série en cours est considérée « laissée de côté ». */
export const STALE_SERIES_AFTER_DAYS = 30;
