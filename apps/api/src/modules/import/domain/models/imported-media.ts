/**
 * Modèle **normalisé** et agnostique du fournisseur d'origine (TV Time, Trakt…).
 * Chaque parseur de source produit ce modèle ; l'orchestration ne connaît donc
 * jamais le format d'export concret (extensibilité — CLAUDE.md §5).
 */
export type ImportMediaType = "MOVIE" | "SERIES";

/** Statut de suivi visé pour l'entrée importée (« à voir » = PLANNED). */
export type ImportStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";

/** Un épisode vu (numérotation d'origine ; rapprochée au catalogue à l'import). */
export interface ImportedEpisode {
  readonly seasonNumber: number;
  readonly episodeNumber: number;
  /** Date réelle du visionnage si l'export la fournit (TV Time `created_at`), sinon null. */
  readonly watchedAt: Date | null;
}

/** Un média importé, avant rapprochement au catalogue. */
export interface ImportedMedia {
  readonly type: ImportMediaType;
  readonly title: string;
  readonly year: number | null;
  /** Statut visé. Pour une série avec épisodes vus, affiné après rapprochement. */
  readonly status: ImportStatus;
  /** Durée d'un film (minutes) si l'export la fournit, sinon complétée par le catalogue. */
  readonly runtimeMinutes: number | null;
  /** Épisodes vus (séries uniquement), dédoublonnés. */
  readonly watchedEpisodes: readonly ImportedEpisode[];
}

/** Lot d'entrées normalisées issu d'un export. */
export interface ImportBatch {
  readonly source: string;
  readonly medias: readonly ImportedMedia[];
}
