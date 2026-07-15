import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

/**
 * Tableau de bord de statistiques de visionnage. `staleTime` long : les stats évoluent
 * lentement, on évite les recalculs/refetch inutiles (éco-conception).
 */
export function useViewingStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["viewing-stats"],
    queryFn: () => api.getViewingStats(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
