import { z } from "zod";
import { BookDetails } from "./book.js";
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
 * Fiche détaillée d'un média issue d'un catalogue externe (TMDB, Google Books…). Modèle
 * **générique** : champs communs + blocs spécifiques nullables (durée film, saisons série,
 * `book` pour un livre). Extensible : `cast`, `productionCompanies`, `watchProviders`
 * peuvent être vides. Ajouter un type de média = ajouter un bloc, sans toucher au reste.
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
  /** Réalisateur(s) pour un film, créateur(s) pour une série, auteur(s) pour un livre. */
  directors: z.array(z.string()),
  productionCompanies: z.array(ProductionCompany),
  watchProviders: z.array(WatchProvider),
  /** Livre : données propres au type (auteurs, ISBN, éditeur…). Null sinon. */
  book: BookDetails.nullable(),
});
export type MediaDetails = z.infer<typeof MediaDetails>;
