import type { SearchMediaResult } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export const MIN_QUERY_LENGTH = 2;

/**
 * Données serveur de la recherche (TanStack Query). Aucun composant n'appelle l'API
 * directement : ils consomment ce hook (voir CLAUDE.md).
 */
export function useMediaSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<SearchMediaResult>({
    queryKey: ["media-search", trimmed],
    queryFn: () => api.searchMedia({ q: trimmed, page: 1, pageSize: 20 }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
