import type {
  ImportJobState,
  ResolveImportInput,
  ResolveImportResult,
  StartImportResult,
} from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Lance un import TV Time **en tâche de fond** : renvoie l'identifiant du job à suivre.
 * Le traitement se poursuit côté serveur, indépendamment de cet onglet (le téléphone
 * peut se verrouiller sans interrompre l'import).
 */
export function useStartImport() {
  return useMutation<StartImportResult, Error, File>({
    mutationFn: (archive) => api.startTvTimeImport(archive),
  });
}

/** Suit l'état d'un job d'import : sonde le serveur toutes les 1,5 s tant qu'il tourne. */
export function useImportJob(jobId: string | null) {
  return useQuery<ImportJobState>({
    queryKey: ["import-job", jobId],
    queryFn: () => api.getImportJob(jobId as string),
    enabled: jobId != null,
    // Sonde tant que l'import tourne ; s'arrête une fois « done »/« error ».
    refetchInterval: (query) => (query.state.data?.status === "running" ? 1500 : false),
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Résout une entrée d'import ambiguë (candidat choisi par l'utilisateur). Comme l'import,
 * cela ajoute un média à la bibliothèque : on invalide le cache serveur à la réussite.
 */
export function useResolveImport() {
  const queryClient = useQueryClient();
  return useMutation<ResolveImportResult, Error, ResolveImportInput>({
    mutationFn: (input) => api.resolveImport(input),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
