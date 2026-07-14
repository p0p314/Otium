import type { LibraryItem, MediaDescriptor } from "../models/library-item";

/**
 * Port de persistance de la bibliothèque. L'ajout persiste aussi le média sous-jacent
 * (upsert par `externalRef`) — le domaine ignore ce détail d'infrastructure.
 */
export interface LibraryRepository {
  /** Ajoute le média à la bibliothèque de l'utilisateur (idempotent : renvoie l'existant). */
  add(userId: string, media: MediaDescriptor): Promise<LibraryItem>;
  findByUser(userId: string): Promise<LibraryItem[]>;
  findItem(userId: string, itemId: string): Promise<LibraryItem | null>;
  remove(userId: string, itemId: string): Promise<void>;
  setFavorite(userId: string, itemId: string, isFavorite: boolean): Promise<LibraryItem>;
  /** Fixe la note (1–10) ou l'efface (`null`). */
  setRating(userId: string, itemId: string, rating: number | null): Promise<LibraryItem>;
  /** Identifiant interne du média d'un élément (pour les avis), ou `null`. */
  getMediaId(userId: string, itemId: string): Promise<string | null>;
}

export const LIBRARY_REPOSITORY = Symbol("LIBRARY_REPOSITORY");
