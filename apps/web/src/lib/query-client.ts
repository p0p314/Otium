import { QueryClient } from "@tanstack/react-query";

/**
 * Client TanStack Query partagé. `staleTime` non nul = moins de refetch =
 * moins d'appels réseau (éco-conception — voir CLAUDE.md).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Ne pas suspendre les requêtes sur le signal navigator.onLine (peu fiable
      // dans certains webviews) : l'app parle à sa propre API.
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});
