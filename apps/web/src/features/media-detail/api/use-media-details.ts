import type { MediaDetails, MediaType } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Fiche détaillée d'un média (données catalogue TMDB). Publique et stable dans le temps
 * → cache long (éco-conception : évite les recalculs et appels réseau répétés).
 */
export function useMediaDetails(type: MediaType, externalId: string) {
  return useQuery<MediaDetails>({
    queryKey: ["media-details", type, externalId],
    queryFn: () => api.getMediaDetails(type, externalId),
    staleTime: 1000 * 60 * 60, // 1 h
    enabled: Boolean(type) && Boolean(externalId),
  });
}
