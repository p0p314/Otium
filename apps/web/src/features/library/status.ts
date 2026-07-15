import type { MediaType, WatchStatus } from "@otium/types";

const LABELS_SERIES: Record<WatchStatus, string> = {
  PLANNED: "À voir",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DROPPED: "Abandonnée",
  PAUSED: "En pause",
};

const LABELS_MOVIE: Record<WatchStatus, string> = {
  PLANNED: "À voir",
  IN_PROGRESS: "En cours",
  COMPLETED: "Vu",
  DROPPED: "Abandonné",
  PAUSED: "En pause",
};

/** Libellé de statut adapté au genre du type de média (film/série). */
export function statusLabel(status: WatchStatus, type: MediaType): string {
  return (type === "MOVIE" ? LABELS_MOVIE : LABELS_SERIES)[status];
}

/**
 * Statuts proposés au choix manuel. Pour une série, `IN_PROGRESS` reste piloté par
 * la progression des épisodes ; on n'expose donc que les états choisis explicitement.
 */
export function statusOptions(type: MediaType): WatchStatus[] {
  return type === "MOVIE"
    ? ["PLANNED", "COMPLETED", "DROPPED"]
    : ["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED", "DROPPED"];
}
