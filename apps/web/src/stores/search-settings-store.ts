import type { MediaType } from "@otium/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchSettingsState {
  /** Types de médias inclus dans la recherche. */
  movies: boolean;
  series: boolean;
  /** Bascule un type ; garde toujours au moins un type actif. */
  toggle: (type: MediaType) => void;
}

/**
 * Réglages de recherche (préférence UI, persistée localement — pas une donnée serveur,
 * donc Zustand et non TanStack Query, cf. CLAUDE.md). Extensible : livres, etc. plus tard.
 */
export const useSearchSettingsStore = create<SearchSettingsState>()(
  persist(
    (set) => ({
      movies: true,
      series: true,
      toggle: (type) =>
        set((state) => {
          const next = {
            movies: type === "MOVIE" ? !state.movies : state.movies,
            series: type === "SERIES" ? !state.series : state.series,
          };
          // On refuse de tout désactiver : la recherche resterait vide.
          return next.movies || next.series ? next : state;
        }),
    }),
    { name: "otium-search-settings" },
  ),
);

/**
 * Type à transmettre à la recherche : un type précis si un seul est actif, sinon
 * `undefined` (recherche multi-types) quand les deux sont actifs.
 */
export function searchTypeFilter(settings: { movies: boolean; series: boolean }): MediaType | undefined {
  if (settings.movies && settings.series) return undefined;
  return settings.movies ? "MOVIE" : "SERIES";
}
