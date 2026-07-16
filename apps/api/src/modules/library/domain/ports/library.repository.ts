import type { LibraryItem, MediaDescriptor, WatchStatus } from "../models/library-item";

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
  /** Fixe le statut de suivi (ex. film « vu »), scopé à l'utilisateur. */
  setStatus(userId: string, itemId: string, status: WatchStatus): Promise<LibraryItem>;
  /** Fixe la note (1–10) ou l'efface (`null`). */
  setRating(userId: string, itemId: string, rating: number | null): Promise<LibraryItem>;
  /** Identifiant interne du média d'un élément (pour les avis), ou `null`. */
  getMediaId(userId: string, itemId: string): Promise<string | null>;
  /**
   * Complète genres/durée d'un média déjà présent (backfill best-effort). Données
   * objectives partagées entre utilisateurs, identifiées par référence externe ;
   * seules les valeurs renseignées écrasent l'existant.
   */
  backfillMediaMetadata(
    ref: { provider: string; externalId: string },
    metadata: { genres: readonly string[]; runtimeMinutes: number | null },
  ): Promise<void>;
}

export const LIBRARY_REPOSITORY = Symbol("LIBRARY_REPOSITORY");
