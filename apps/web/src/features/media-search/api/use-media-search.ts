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
  const field = useSearchSettingsStore((state) => state.field);
  const trimmed = query.trim();
  return useQuery<SearchMediaResult>({
    // Le champ interrogé fait partie de la clé : « Camus » par titre et par auteur ne
    // donnent pas les mêmes résultats.
    queryKey: ["media-search", trimmed, types?.join(",") ?? "all", field],
    queryFn: () =>
      api.searchMedia({ q: trimmed, page: 1, pageSize: 20, field, ...(types ? { types } : {}) }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}
