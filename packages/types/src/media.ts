import { z } from "zod";

/**
 * Type de média. Enum **fermé mais extensible** : ajouter un type = ajouter une valeur
 * (Open/Closed), sans refonte des capacités transversales. Voir ADR-0003.
 */
export const MediaType = z.enum(["MOVIE", "SERIES", "BOOK"]);
export type MediaType = z.infer<typeof MediaType>;

/** Types de média prévus mais non actifs (documentés pour l'extension future). */
export const FUTURE_MEDIA_TYPES = [
  "MANGA",
  "ANIME",
  "GAME",
  "PODCAST",
  "MUSIC",
  "DOCUMENTARY",
] as const;

/** Statut de consommation, commun à tous les types de média. */
export const WatchStatus = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "DROPPED", "PAUSED"]);
export type WatchStatus = z.infer<typeof WatchStatus>;

/**
 * Référence stable vers une source externe (fournisseur + identifiant).
 * Opaque au domaine : le métier ne sait pas d'où viennent les données (ADR-0004).
 */
export const ExternalRef = z.object({
  provider: z.string().min(1),
  externalId: z.string().min(1),
});
export type ExternalRef = z.infer<typeof ExternalRef>;

/** Note entière sur l'échelle 0–10 (0 = non noté). Décision produit. */
export const Rating = z.number().int().min(0).max(10);
export type Rating = z.infer<typeof Rating>;

export const Genre = z.object({
  id: z.string(),
  label: z.string(),
});
export type Genre = z.infer<typeof Genre>;

export const Episode = z.object({
  id: z.string(),
  seasonNumber: z.number().int().nonnegative(),
  number: z.number().int().positive(),
  title: z.string(),
  runtimeMinutes: z.number().int().positive().nullable(),
});
export type Episode = z.infer<typeof Episode>;

export const Season = z.object({
  number: z.number().int().nonnegative(),
  episodes: z.array(Episode),
});
export type Season = z.infer<typeof Season>;

/**
 * Résumé d'un média issu du catalogue externe (recherche) : identité par `externalRef`,
 * pas encore d'`id` interne (le média n'est pas nécessairement en base).
 */
export const MediaSummary = z.object({
  type: MediaType,
  title: z.string(),
  year: z.number().int().nullable(),
  posterUrl: z.string().url().nullable(),
  genres: z.array(Genre),
  externalRef: ExternalRef,
});
export type MediaSummary = z.infer<typeof MediaSummary>;

/** Représentation transport (DTO) d'un média persisté. Le domaine a son propre modèle riche. */
export const Media = z.object({
  id: z.string(),
  type: MediaType,
  title: z.string(),
  year: z.number().int().nullable(),
  posterUrl: z.string().url().nullable(),
  genres: z.array(Genre),
  externalRef: ExternalRef,
  runtimeMinutes: z.number().int().positive().nullable().optional(),
  seasons: z.array(Season).optional(),
});
export type Media = z.infer<typeof Media>;
