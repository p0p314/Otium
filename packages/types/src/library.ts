import { z } from "zod";
import { ExternalRef, Media, Rating, WatchStatus } from "./media.js";

/** Élément de bibliothèque : relation utilisateur ↔ média (statut, note, favori). */
export const LibraryItem = z.object({
  id: z.string(),
  media: Media,
  status: WatchStatus,
  rating: Rating.nullable(),
  isFavorite: z.boolean(),
  watchedEpisodeIds: z.array(z.string()),
  addedAt: z.string().datetime(),
});
export type LibraryItem = z.infer<typeof LibraryItem>;

/** Commande d'ajout d'un média à la bibliothèque, à partir d'une référence externe. */
export const AddToLibraryInput = z.object({
  externalRef: ExternalRef,
});
export type AddToLibraryInput = z.infer<typeof AddToLibraryInput>;

export const RateMediaInput = z.object({
  rating: Rating,
});
export type RateMediaInput = z.infer<typeof RateMediaInput>;

export const MarkEpisodeWatchedInput = z.object({
  episodeId: z.string().min(1),
  watched: z.boolean(),
});
export type MarkEpisodeWatchedInput = z.infer<typeof MarkEpisodeWatchedInput>;
