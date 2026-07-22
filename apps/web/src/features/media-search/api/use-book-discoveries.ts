import type { SearchMediaResult } from "@otium/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Livres à découvrir (données serveur). Le serveur sert un instantané quotidien : aucun
 * appel à la source externe n'est déclenché par l'affichage.
 *
 * `staleTime` long en conséquence — recharger cette liste plus souvent que le serveur ne
 * la rafraîchit ne produirait que du trafic (éco-conception).
 */
export function useBookDiscoveries(enabled: boolean) {
  return useQuery<SearchMediaResult>({
    queryKey: ["book-discoveries"],
    queryFn: () => api.getBookDiscoveries(),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}
