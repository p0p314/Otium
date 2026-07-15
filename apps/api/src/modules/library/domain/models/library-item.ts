/**
 * Modèle de domaine de la bibliothèque. Capacités transversales au niveau `Media`
 * générique (favoris, statut, note) — jamais spécifiques à un type concret (ADR-0003).
 */
export type WatchStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED" | "PAUSED";

export type MediaType = "MOVIE" | "SERIES";

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
}

export interface LibraryItem {
  readonly id: string;
  readonly media: MediaDescriptor;
  readonly status: WatchStatus;
  readonly rating: number | null;
  readonly isFavorite: boolean;
  readonly addedAt: Date;
}
