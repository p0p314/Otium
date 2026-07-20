import { z } from "zod";
import { MediaSummary, Rating, WatchStatus } from "./media.js";
import { MediaProgress } from "./progress.js";

/** Élément de bibliothèque : relation utilisateur ↔ média (statut, note, favori). */
export const LibraryItem = z.object({
  id: z.string(),
  media: MediaSummary,
  status: WatchStatus,
  rating: Rating.nullable(),
  isFavorite: z.boolean(),
  addedAt: z.string().datetime(),
  /** Date de visionnage (dernier épisode vu, ou dernière MAJ pour un film) — tri bibliothèque. */
  lastActivityAt: z.string().datetime(),
  /** Début de consommation (première lecture/visionnage). Null si jamais commencé. */
  startedAt: z.string().datetime().nullable(),
  /** Fin de consommation. Null tant que le média n'est pas terminé. */
  finishedAt: z.string().datetime().nullable(),
  /** Progression courante (livre en pages/%, futurs types en chapitres…). Null si non suivie. */
  progress: MediaProgress.nullable(),
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

/**
 * Dates de consommation saisies par l'utilisateur (début/fin de lecture). `null` efface
 * la date ; un champ absent reste inchangé.
 */
export const SetConsumptionDatesInput = z.object({
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
});
export type SetConsumptionDatesInput = z.infer<typeof SetConsumptionDatesInput>;

/** Change le statut de suivi (ex. film « vu » = COMPLETED, « à voir » = PLANNED). */
export const SetWatchStatusInput = z.object({
  status: WatchStatus,
});
export type SetWatchStatusInput = z.infer<typeof SetWatchStatusInput>;
