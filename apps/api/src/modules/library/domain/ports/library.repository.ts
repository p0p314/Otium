import type { LibraryItem, MediaDescriptor, WatchStatus } from "../models/library-item";
import type { ProgressState } from "../reading-progress";

/**
 * Écriture atomique d'une progression : état courant, statut/dates déduits par le domaine,
 * et delta à journaliser. Regroupés en une opération pour que l'historique ne puisse pas
 * diverger de l'état courant.
 */
export interface ProgressUpdate {
  readonly progress: ProgressState;
  readonly status: WatchStatus;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  /** Delta horodaté alimentant les statistiques (`null` si l'avancement n'a pas bougé). */
  readonly entry: { readonly from: number; readonly to: number; readonly occurredAt: Date } | null;
}

/** Un film de la bibliothèque dont la sortie est à venir (pour l'agenda « À venir »). */
export interface UpcomingMovieRecord {
  readonly itemId: string;
  readonly title: string;
  readonly posterUrl: string | null;
  readonly releaseDate: Date;
}

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
  /** Films de la bibliothèque dont la date de sortie est postérieure à `now`. */
  listUpcomingMovies(userId: string, now: Date): Promise<UpcomingMovieRecord[]>;
  /** Enregistre progression, statut, dates et delta d'historique en une seule opération. */
  saveProgress(userId: string, itemId: string, update: ProgressUpdate): Promise<LibraryItem>;
  /**
   * Œuvre et ses volumes connus, avec le suivi de l'utilisateur. `null` si l'œuvre n'a
   * jamais été rencontrée. Les volumes hors bibliothèque sont inclus : la fiche doit
   * pouvoir proposer le tome suivant même s'il n'a pas encore été ajouté.
   */
  findCollection(
    userId: string,
    provider: string,
    externalId: string,
  ): Promise<CollectionRecord | null>;
  /** Fixe les dates de consommation saisies par l'utilisateur (`null` = effacer). */
  setConsumptionDates(
    userId: string,
    itemId: string,
    dates: { startedAt?: Date | null; finishedAt?: Date | null },
  ): Promise<LibraryItem>;
}

/**
 * Un volume d'une œuvre, du point de vue de l'utilisateur. `itemId` et `status` sont
 * `null` quand le volume est connu du catalogue mais absent de sa bibliothèque.
 */
export interface CollectionVolumeRecord {
  readonly itemId: string | null;
  readonly mediaId: string;
  readonly externalId: string;
  readonly title: string;
  readonly posterUrl: string | null;
  readonly position: number | null;
  readonly status: WatchStatus | null;
}

/** Œuvre telle qu'enregistrée, avec les volumes connus d'Otium. */
export interface CollectionRecord {
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly method: string;
  readonly volumes: readonly CollectionVolumeRecord[];
}

export const LIBRARY_REPOSITORY = Symbol("LIBRARY_REPOSITORY");
