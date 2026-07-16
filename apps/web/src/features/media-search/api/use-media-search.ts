import type { SearchMediaResult } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { searchTypeFilter, useSearchSettingsStore } from "../../../stores/search-settings-store";

export const MIN_QUERY_LENGTH = 2;

/**
 * Données serveur de la recherche (TanStack Query). Aucun composant n'appelle l'API
 * directement : ils consomment ce hook (voir CLAUDE.md). Le périmètre (films/séries)
 * suit les réglages de recherche de l'utilisateur.
 */
export function useMediaSearch(query: string) {
  const type = searchTypeFilter(useSearchSettingsStore());
  const trimmed = query.trim();
  return useQuery<SearchMediaResult>({
    queryKey: ["media-search", trimmed, type ?? "all"],
    queryFn: () =>
      api.searchMedia({ q: trimmed, page: 1, pageSize: 20, ...(type ? { type } : {}) }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
