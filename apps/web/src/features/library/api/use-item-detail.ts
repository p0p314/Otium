import type {
  SaveReviewInput,
  SetConsumptionDatesInput,
  UpdateProgressInput,
  WatchStatus,
} from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

const itemKey = (itemId: string) => ["library-item", itemId] as const;
const reviewKey = (itemId: string) => ["review", itemId] as const;

export function useLibraryItem(itemId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: itemKey(itemId),
    queryFn: () => api.getLibraryItem(itemId),
    enabled: isAuthenticated,
  });
}

export function useRateMedia(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rating: number) => api.rateMedia(itemId, { rating }),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKey(itemId), item);
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useSetWatchStatus(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: WatchStatus) => api.setWatchStatus(itemId, { status }),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKey(itemId), item);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["home-dashboard"] });
    },
  });
}

/**
 * Enregistre l'avancement de lecture. Le serveur renvoie l'élément à jour (statut et
 * dates déduits inclus) : on l'écrit directement dans le cache plutôt que de recharger.
 * Les statistiques dépendent de la progression : leur cache est invalidé.
 */
export function useUpdateProgress(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProgressInput) => api.updateProgress(itemId, input),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKey(itemId), item);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/** Fixe les dates de début/fin de consommation saisies par l'utilisateur. */
export function useSetConsumptionDates(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetConsumptionDatesInput) => api.setConsumptionDates(itemId, input),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKey(itemId), item);
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useReview(itemId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reviewKey(itemId),
    queryFn: () => api.getReview(itemId),
    enabled: isAuthenticated,
  });
}

export function useSaveReview(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveReviewInput) => api.saveReview(itemId, input),
    onSuccess: (review) => queryClient.setQueryData(reviewKey(itemId), review),
  });
}

export function useDeleteReview(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteReview(itemId),
    onSuccess: () => queryClient.setQueryData(reviewKey(itemId), null),
  });
}
