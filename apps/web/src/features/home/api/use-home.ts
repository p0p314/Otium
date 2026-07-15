import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

/** Tableau de bord de l'accueil (séries en cours + laissées de côté). */
export function useHomeDashboard() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["home-dashboard"],
    queryFn: () => api.getHomeDashboard(),
    enabled: isAuthenticated,
  });
}
