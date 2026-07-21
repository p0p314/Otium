import type { CollectionTracking } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

/**
 * Suivi d'une œuvre (données serveur). Aucun composant n'appelle l'API directement :
 * ils consomment ce hook (voir CLAUDE.md).
 *
 * L'endpoint répond 404 tant qu'aucun volume n'a été ajouté en bibliothèque — l'œuvre
 * n'existe alors pas encore côté Otium. La page traite ce cas comme un état vide, pas
 * comme une erreur.
 */
export function useCollection(provider: string, externalId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery<CollectionTracking>({
    queryKey: ["collection", provider, externalId],
    queryFn: () => api.getCollectionTracking(provider, externalId),
    enabled: isAuthenticated && provider !== "" && externalId !== "",
    // Un 404 signifie « pas encore suivie » : réessayer n'y changerait rien.
    retry: false,
  });
}
