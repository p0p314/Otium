import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";

/** Agenda « À venir » : épisodes à diffusion future des séries suivies. */
export function useUpcoming() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["upcoming"],
    queryFn: () => api.getUpcoming(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
