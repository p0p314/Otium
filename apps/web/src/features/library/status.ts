import type { MediaType, WatchStatus } from "@otium/types";

/**
 * Libellés de statut par type de média : le même état se dit différemment selon l'œuvre
 * (« Vu » pour un film, « Terminée » pour une série, « Lu » pour un livre). Table
 * exhaustive : ajouter un type de média oblige à choisir ses libellés.
 */
const LABELS: Record<MediaType, Record<WatchStatus, string>> = {
  SERIES: {
    PLANNED: "À voir",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    DROPPED: "Abandonnée",
    PAUSED: "En pause",
  },
  MOVIE: {
    PLANNED: "À voir",
    IN_PROGRESS: "En cours",
    COMPLETED: "Vu",
    DROPPED: "Abandonné",
    PAUSED: "En pause",
  },
  BOOK: {
    PLANNED: "À lire",
    IN_PROGRESS: "En cours",
    COMPLETED: "Lu",
    DROPPED: "Abandonné",
    PAUSED: "En pause",
  },
};

/** Libellé de statut adapté au type de média. */
export function statusLabel(status: WatchStatus, type: MediaType): string {
  return LABELS[type][status];
}

/**
 * Statuts proposés au choix manuel. Pour une série, `IN_PROGRESS` reste piloté par la
 * progression des épisodes ; pour un livre, il l'est par la progression de lecture —
 * on n'expose donc que les états réellement choisis à la main.
 */
export function statusOptions(type: MediaType): WatchStatus[] {
  if (type === "MOVIE") return ["PLANNED", "COMPLETED", "DROPPED"];
  if (type === "BOOK") return ["PLANNED", "COMPLETED", "PAUSED", "DROPPED"];
  return ["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED", "DROPPED"];
}
