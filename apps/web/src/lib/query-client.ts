import { onlineManager, QueryClient } from "@tanstack/react-query";

// Otium est une application « toujours en ligne » (elle parle à sa propre API). Certains
// navigateurs/webviews émettent des événements `offline` parasites qui poussent TanStack
// Query à suspendre les requêtes (fetchStatus "paused"). On neutralise l'écoute
// online/offline et on force l'état "en ligne" pour éviter toute mise en pause automatique.
// (Complété par `networkMode: "always"` ci-dessous.)
onlineManager.setEventListener(() => () => {});
onlineManager.setOnline(true);

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
