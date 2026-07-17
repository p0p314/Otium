import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/** Fiche détaillée d'un épisode (catalogue). Données quasi statiques → cache long. */
export function useEpisodeDetails(externalId: string, season: number, episode: number) {
  return useQuery({
    queryKey: ["episode-details", externalId, season, episode],
    queryFn: () => api.getEpisodeDetails(externalId, season, episode),
    staleTime: 30 * 60_000,
    enabled: Number.isFinite(season) && Number.isFinite(episode),
  });
}
