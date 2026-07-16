import type { ImportReport, ResolveImportInput, ResolveImportResult } from "@otium/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Import d'un export RGPD TV Time. Un import de masse touche potentiellement toute
 * la bibliothèque : on invalide l'ensemble du cache serveur à la réussite pour
 * rafraîchir bibliothèque, accueil et statistiques.
 */
export function useImportTvTime() {
  const queryClient = useQueryClient();
  return useMutation<ImportReport, Error, File>({
    mutationFn: (archive) => api.importTvTime(archive),
    onSuccess: () => queryClient.invalidateQueries(),
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
