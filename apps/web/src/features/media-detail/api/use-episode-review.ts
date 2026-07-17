import type { EpisodeReview, SaveEpisodeReviewInput } from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";

const key = (itemId: string, episodeId: string) => ["episode-review", itemId, episodeId] as const;

/** Note/avis de l'utilisateur sur un épisode. Désactivé tant que l'épisode n'est pas résolu. */
export function useEpisodeReview(itemId: string, episodeId: string) {
  return useQuery({
    queryKey: key(itemId, episodeId),
    queryFn: () => api.getEpisodeReview(itemId, episodeId),
    enabled: itemId.length > 0 && episodeId.length > 0,
  });
}

/** Enregistre note et/ou avis d'un épisode ; met à jour le cache sans refetch. */
export function useSaveEpisodeReview(itemId: string, episodeId: string) {
  const queryClient = useQueryClient();
  return useMutation<EpisodeReview | null, Error, SaveEpisodeReviewInput>({
    mutationFn: (input) => api.saveEpisodeReview(itemId, episodeId, input),
    onSuccess: (review) => queryClient.setQueryData(key(itemId, episodeId), review),
  });
}

/** Supprime note et avis d'un épisode ; vide le cache. */
export function useDeleteEpisodeReview(itemId: string, episodeId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => api.deleteEpisodeReview(itemId, episodeId),
    onSuccess: () => queryClient.setQueryData(key(itemId, episodeId), null),
  });
}
