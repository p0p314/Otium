import type { MediaType, SearchMediaResult } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Tendances du moment (films/séries) pour la mise en avant sous la recherche.
 * Données publiques et stables sur la journée → cache long (éco-conception).
 */
export function useTrending(type: MediaType) {
  return useQuery<SearchMediaResult>({
    queryKey: ["trending", type],
    queryFn: () => api.getTrending({ type, page: 1, pageSize: 12 }),
    staleTime: 1000 * 60 * 60, // 1 h : les tendances évoluent lentement
  });
}
