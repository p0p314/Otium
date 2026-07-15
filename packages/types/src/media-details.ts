import { z } from "zod";
import { ExternalRef, Genre, MediaType } from "./media.js";

/** Un acteur principal (nom, rôle, photo). */
export const CastMember = z.object({
  name: z.string(),
  character: z.string().nullable(),
  profileUrl: z.string().url().nullable(),
});
export type CastMember = z.infer<typeof CastMember>;

/** Une société de production (nom + logo éventuel). */
export const ProductionCompany = z.object({
  name: z.string(),
  logoUrl: z.string().url().nullable(),
});
export type ProductionCompany = z.infer<typeof ProductionCompany>;

/** Une plateforme de diffusion (nom + logo éventuel). */
export const WatchProvider = z.object({
  name: z.string(),
  logoUrl: z.string().url().nullable(),
});
export type WatchProvider = z.infer<typeof WatchProvider>;

/**
 * Fiche détaillée d'un média issue du catalogue externe (TMDB en V1). Modèle **générique** :
 * champs communs film/série + champs spécifiques nullables (durée film, saisons série).
 * Extensible : `cast`, `productionCompanies`, `watchProviders` peuvent être vides.
 */
export const MediaDetails = z.object({
  externalRef: ExternalRef,
  type: MediaType,
  title: z.string(),
  originalTitle: z.string().nullable(),
  posterUrl: z.string().url().nullable(),
  backdropUrl: z.string().url().nullable(),
  overview: z.string().nullable(),
  genres: z.array(Genre),
  /** Note moyenne du fournisseur, échelle 0–10 (null si non notée). */
  rating: z.number().min(0).max(10).nullable(),
  voteCount: z.number().int().nonnegative(),
  /** Date de sortie / première diffusion, ISO `YYYY-MM-DD` (ou null). */
  releaseDate: z.string().nullable(),
  year: z.number().int().nullable(),
  /** Statut côté fournisseur (« Released », « Returning Series »…). */
  status: z.string().nullable(),
  /** Film : durée en minutes (null pour une série). */
  runtimeMinutes: z.number().int().positive().nullable(),
  /** Série : nombre de saisons / d'épisodes (null pour un film). */
  numberOfSeasons: z.number().int().nonnegative().nullable(),
  numberOfEpisodes: z.number().int().nonnegative().nullable(),
  cast: z.array(CastMember),
  /** Réalisateur(s) pour un film, créateur(s) pour une série. */
  directors: z.array(z.string()),
  productionCompanies: z.array(ProductionCompany),
  watchProviders: z.array(WatchProvider),
});
export type MediaDetails = z.infer<typeof MediaDetails>;
