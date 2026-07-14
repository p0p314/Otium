import type { MediaSummary } from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

const LIBRARY_KEY = ["library"] as const;

/** Bibliothèque de l'utilisateur (données serveur). Désactivée si non connecté. */
export function useLibrary() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: LIBRARY_KEY,
    queryFn: () => api.getLibrary(),
    enabled: isAuthenticated,
  });
}

export function useAddToLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: MediaSummary) => api.addToLibrary({ media }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIBRARY_KEY }),
  });
}

export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.removeFromLibrary(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIBRARY_KEY }),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) =>
      api.toggleFavorite(itemId, { isFavorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIBRARY_KEY }),
  });
}
