import { z } from "zod";
import { TrackedEpisode } from "./series.js";

/** Une série mise en avant sur l'accueil (progression + reprise + dernière activité). */
export const HomeSeries = z.object({
  itemId: z.string(),
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  totalEpisodes: z.number().int().nonnegative(),
  watchedEpisodes: z.number().int().nonnegative(),
  /** Épisodes déjà sortis (pour distinguer « disponible » de « à venir »). */
  airedEpisodes: z.number().int().nonnegative(),
  /** Prochain épisode **sorti** à regarder (reprise), ou null si rien à regarder. */
  nextEpisode: TrackedEpisode.nullable(),
  /** Date du dernier épisode vu (ISO), ou null si aucun. */
  lastWatchedAt: z.string().datetime().nullable(),
});
export type HomeSeries = z.infer<typeof HomeSeries>;

/**
 * Sections d'un type de média sur l'accueil, ordonnées par intention de visionnage :
 * - **à voir** : séries actives (vues il y a moins d'un mois) **et** séries jamais
 *   commencées mais déjà disponibles ;
 * - **à reprendre** : séries commencées puis laissées de côté (dernier épisode vu il y a
 *   1 à 3 mois).
 * Les séries sans visionnage depuis 3 mois sont masquées de l'accueil (mais restent en
 * bibliothèque).
 */
export const HomeMediaSections = z.object({
  toWatch: z.array(HomeSeries),
  toResume: z.array(HomeSeries),
});
export type HomeMediaSections = z.infer<typeof HomeMediaSections>;

/**
 * Tableau de bord de l'accueil, **cloisonné par type de média** (jamais mélangés) et
 * extensible (films et livres plus tard). V1 : séries.
 */
export const HomeDashboard = z.object({
  series: HomeMediaSections,
});
export type HomeDashboard = z.infer<typeof HomeDashboard>;
