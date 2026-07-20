import type { SearchMediaResult } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { searchTypeFilter, useSearchSettingsStore } from "../../../stores/search-settings-store";

export const MIN_QUERY_LENGTH = 2;

/**
 * Données serveur de la recherche (TanStack Query). Aucun composant n'appelle l'API
 * directement : ils consomment ce hook (voir CLAUDE.md). Le périmètre (films, séries,
 * livres) suit les réglages de recherche de l'utilisateur.
 */
export function useMediaSearch(query: string) {
  const types = searchTypeFilter(useSearchSettingsStore((state) => state.enabled));
  const trimmed = query.trim();
  return useQuery<SearchMediaResult>({
    queryKey: ["media-search", trimmed, types?.join(",") ?? "all"],
    queryFn: () =>
      api.searchMedia({ q: trimmed, page: 1, pageSize: 20, ...(types ? { types } : {}) }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
