import type { MediaType } from "@otium/types";

/**
 * Libellés des types de média — **source unique** pour toute l'interface (vignettes,
 * fiche, listes). Ajouter un type de média oblige à compléter ces tables : le typage
 * exhaustif garantit qu'aucun écran n'est oublié.
 */
export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  MOVIE: "Film",
  SERIES: "Série",
  BOOK: "Livre",
};

/** Pluriel, pour les onglets et titres de section. */
export const MEDIA_TYPE_LABEL_PLURAL: Record<MediaType, string> = {
  MOVIE: "Films",
  SERIES: "Séries",
  BOOK: "Livres",
};

/**
 * Médias suivis par une progression continue (pages, pourcentage) plutôt que par
 * épisodes ou par un simple « vu ». Voir ADR-0017.
 */
export function hasContinuousProgress(type: MediaType): boolean {
  return type === "BOOK";
}
