import { z } from "zod";
import { MediaSummary, Rating, WatchStatus } from "./media.js";

/** Élément de bibliothèque : relation utilisateur ↔ média (statut, note, favori). */
export const LibraryItem = z.object({
  id: z.string(),
  media: MediaSummary,
  status: WatchStatus,
  rating: Rating.nullable(),
  isFavorite: z.boolean(),
  addedAt: z.string().datetime(),
});
export type LibraryItem = z.infer<typeof LibraryItem>;

/** Ajout à la bibliothèque : le client transmet le résumé issu de la recherche. */
export const AddToLibraryInput = z.object({
  media: MediaSummary,
});
export type AddToLibraryInput = z.infer<typeof AddToLibraryInput>;

export const ToggleFavoriteInput = z.object({
  isFavorite: z.boolean(),
});
export type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteInput>;

export const RateMediaInput = z.object({
  rating: Rating,
});
export type RateMediaInput = z.infer<typeof RateMediaInput>;
