import type { AddToListInput, MediaSummary } from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

const LISTS_KEY = ["lists"] as const;
const listKey = (listId: string) => ["list", listId] as const;

/** Toutes les listes de l'utilisateur (données serveur). */
export function useLists() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: LISTS_KEY,
    queryFn: () => api.getLists(),
    enabled: isAuthenticated,
  });
}

/** Détail d'une liste (éléments). */
export function useList(listId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: listKey(listId),
    queryFn: () => api.getList(listId),
    enabled: isAuthenticated,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createList({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

export function useRenameList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) =>
      api.renameList(listId, { name }),
    onSuccess: (_data, { listId }) => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      queryClient.invalidateQueries({ queryKey: listKey(listId) });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.deleteList(listId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

export function useAddToList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, media }: { listId: string; media: MediaSummary }) =>
      api.addToList(listId, { media } satisfies AddToListInput),
    onSuccess: (detail) => {
      queryClient.setQueryData(listKey(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}

export function useRemoveFromList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listId,
      externalRef,
    }: {
      listId: string;
      externalRef: { provider: string; externalId: string };
    }) => api.removeFromList(listId, externalRef),
    onSuccess: (detail) => {
      queryClient.setQueryData(listKey(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
    },
  });
}
