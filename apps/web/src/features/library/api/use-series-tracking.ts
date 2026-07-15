import type { MarkEpisodeInput } from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

const trackingKey = (itemId: string) => ["series-tracking", itemId] as const;

export function useSeriesTracking(itemId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: trackingKey(itemId),
    queryFn: () => api.getSeriesTracking(itemId),
    enabled: isAuthenticated,
  });
}

export function useMarkEpisode(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkEpisodeInput) => api.markEpisode(itemId, input),
    onSuccess: (tracking) => {
      // La réponse contient l'état à jour → on met le cache à jour sans refetch.
      queryClient.setQueryData(trackingKey(itemId), tracking);
      // Le statut de l'élément et la progression d'accueil ont pu changer.
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["home-dashboard"] });
    },
  });
}
