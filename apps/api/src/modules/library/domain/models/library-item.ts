import type { ProgressState } from "../reading-progress";

/**
 * Modèle de domaine de la bibliothèque. Capacités transversales au niveau `Media`
 * générique (favoris, statut, note, progression) — jamais spécifiques à un type concret
 * (ADR-0003).
 */
export type WatchStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED" | "PAUSED";

export type MediaType = "MOVIE" | "SERIES" | "BOOK";

export interface MediaDescriptor {
  readonly externalRef: { readonly provider: string; readonly externalId: string };
  readonly type: MediaType;
  readonly title: string;
  readonly year: number | null;
  readonly posterUrl: string | null;
  /** Genres (libellés), renseignés à l'ajout pour alimenter les statistiques. */
  readonly genres?: readonly string[];
  /** Durée d'un film en minutes (null/absent pour une série ou si indisponible). */
  readonly runtimeMinutes?: number | null;
  /** Date de sortie d'un film, renseignée à l'ajout (alimente « À venir »). */
  readonly releaseDate?: Date | null;
  /** Données propres aux livres (auteurs, ISBN, pages…), absentes des autres types. */
  readonly book?: BookMetadata | null;
}

/**
 * Métadonnées de livre attachées au média. Vivent ici — et non dans `MediaDescriptor` à
 * plat — pour que le média générique ne se charge pas des champs de chaque type (ADR-0003).
 */
export interface BookMetadata {
  readonly subtitle: string | null;
  readonly authors: readonly string[];
  readonly description: string | null;
  readonly pageCount: number | null;
  readonly publisher: string | null;
  readonly publishedDate: string | null;
  readonly language: string | null;
  readonly categories: readonly string[];
  readonly isbn10: string | null;
  readonly isbn13: string | null;
  readonly googleBooksId: string | null;
  readonly openLibraryId: string | null;
  readonly infoUrl: string | null;
  readonly previewUrl: string | null;
  readonly averageRating: number | null;
  readonly ratingsCount: number | null;
  readonly coverUrlLarge: string | null;
  readonly sources: readonly string[];
}

export interface LibraryItem {
  readonly id: string;
  readonly media: MediaDescriptor;
  readonly status: WatchStatus;
  readonly rating: number | null;
  readonly isFavorite: boolean;
  readonly addedAt: Date;
  /** Dernière activité de visionnage : dernier épisode vu (série) ou dernière MAJ (film). */
  readonly lastActivityAt: Date;
  /** Début de consommation (première lecture/visionnage), `null` si jamais commencé. */
  readonly startedAt: Date | null;
  /** Fin de consommation, `null` tant que le média n'est pas terminé. */
  readonly finishedAt: Date | null;
  /** Progression courante (pages, pourcentage…), `null` si non suivie (ADR-0017). */
  readonly progress: ProgressState | null;
}
