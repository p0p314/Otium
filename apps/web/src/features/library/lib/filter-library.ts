import type { LibraryItem, WatchStatus } from "@otium/types";

/**
 * Recherche avancée **dans la bibliothèque** — logique **pure** (testable sans I/O),
 * appliquée côté client sur la bibliothèque déjà chargée (aucun appel réseau
 * supplémentaire : instantané, éco-responsable — voir ADR-0013).
 */

export type LibrarySort = "recent" | "activity" | "title" | "rating" | "year";

export const LIBRARY_SORTS: readonly { value: LibrarySort; label: string }[] = [
  { value: "recent", label: "Ajout récent" },
  { value: "activity", label: "Activité récente" },
  { value: "title", label: "Titre (A → Z)" },
  { value: "rating", label: "Note (haute → basse)" },
  { value: "year", label: "Année (récente → ancienne)" },
];

export type StatusFilter = WatchStatus | "ALL";

export interface LibraryQuery {
  /** Terme de recherche sur le titre (insensible à la casse et aux accents). */
  readonly search: string;
  readonly status: StatusFilter;
  /** Libellé de genre exact, ou `"ALL"`. */
  readonly genre: string;
  readonly favoritesOnly: boolean;
  readonly sort: LibrarySort;
}

export const DEFAULT_LIBRARY_QUERY: LibraryQuery = {
  search: "",
  status: "ALL",
  genre: "ALL",
  favoritesOnly: false,
  sort: "recent",
};

/** Vrai si la requête n'applique aucun filtre (état par défaut). */
export function isDefaultQuery(q: LibraryQuery): boolean {
  return (
    q.search.trim() === "" &&
    q.status === "ALL" &&
    q.genre === "ALL" &&
    !q.favoritesOnly &&
    q.sort === DEFAULT_LIBRARY_QUERY.sort
  );
}

/** Normalise pour une comparaison insensible à la casse **et aux accents**. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Libellés de genres présents dans la sélection, triés (alimente le filtre). */
export function availableGenres(items: readonly LibraryItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const genre of item.media.genres) set.add(genre.label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

function compare(a: LibraryItem, b: LibraryItem, sort: LibrarySort): number {
  switch (sort) {
    case "title":
      return a.media.title.localeCompare(b.media.title, "fr");
    case "rating":
      // Notés en premier (note décroissante) ; non notés relégués en fin.
      return (b.rating ?? -1) - (a.rating ?? -1);
    case "year":
      return (b.media.year ?? 0) - (a.media.year ?? 0);
    case "activity":
      return Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
    case "recent":
      return Date.parse(b.addedAt) - Date.parse(a.addedAt);
  }
}

/** Filtre puis trie la bibliothèque selon la requête. Ne mute pas l'entrée. */
export function queryLibrary(items: readonly LibraryItem[], q: LibraryQuery): LibraryItem[] {
  const term = normalize(q.search);
  const filtered = items.filter((item) => {
    if (q.status !== "ALL" && item.status !== q.status) return false;
    if (q.favoritesOnly && !item.isFavorite) return false;
    if (q.genre !== "ALL" && !item.media.genres.some((g) => g.label === q.genre)) return false;
    if (term !== "" && !normalize(item.media.title).includes(term)) return false;
    return true;
  });
  return filtered.sort((a, b) => compare(a, b, q.sort));
}
