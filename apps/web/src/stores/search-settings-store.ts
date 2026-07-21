import { MediaType, type SearchField } from "@otium/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Périmètre par défaut : tous les types de média couverts par le catalogue. */
const ALL_ENABLED: Record<MediaType, boolean> = { MOVIE: true, SERIES: true, BOOK: true };

interface SearchSettingsState {
  /** Types de médias inclus dans la recherche, indexés par type. */
  enabled: Record<MediaType, boolean>;
  /** Champ interrogé : tout, titre, ou auteur. */
  field: SearchField;
  /** Bascule un type ; garde toujours au moins un type actif. */
  toggle: (type: MediaType) => void;
  setField: (field: SearchField) => void;
}

/**
 * Réglages de recherche (préférence UI, persistée localement — pas une donnée serveur,
 * donc Zustand et non TanStack Query, cf. CLAUDE.md). Généralisé à `MediaType` : ajouter
 * un type de média ne demande plus de toucher au store.
 */
export const useSearchSettingsStore = create<SearchSettingsState>()(
  persist(
    (set) => ({
      enabled: ALL_ENABLED,
      field: "ALL",
      setField: (field) => set({ field }),
      toggle: (type) =>
        set((state) => {
          const next = { ...state.enabled, [type]: !state.enabled[type] };
          // On refuse de tout désactiver : la recherche resterait vide.
          return Object.values(next).some(Boolean) ? { enabled: next } : state;
        }),
    }),
    {
      name: "otium-search-settings",
      version: 1,
      /**
       * v0 stockait deux booléens `movies`/`series`. On les reprend et on active les
       * livres — nouveauté que l'utilisateur découvre plutôt qu'il ne doit chercher.
       */
      migrate: (persisted): SearchSettingsState => {
        const legacy = persisted as { movies?: boolean; series?: boolean } | undefined;
        return {
          enabled: {
            MOVIE: legacy?.movies ?? true,
            SERIES: legacy?.series ?? true,
            BOOK: true,
          },
          field: "ALL",
        } as SearchSettingsState;
      },
    },
  ),
);

/**
 * Types transmis à la recherche. `undefined` quand **tous** sont actifs : l'API interroge
 * alors l'ensemble des catalogues, et la clé de cache reste stable.
 */
export function searchTypeFilter(
  enabled: Record<MediaType, boolean>,
): MediaType[] | undefined {
  const selected = MediaType.options.filter((type) => enabled[type]);
  return selected.length === MediaType.options.length ? undefined : selected;
}
