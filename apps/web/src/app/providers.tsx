import { ThemeProvider } from "@otium/ui";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "../lib/query-client";
import { router } from "../router";
import { isPersistableQuery } from "./query-persistence";

/**
 * Persistance du cache de données dans `localStorage` : au **redémarrage** de l'app, les
 * données de la dernière session s'affichent **immédiatement** (stale-while-revalidate),
 * puis sont rafraîchies en fond — au lieu d'un chargement à froid à chaque ouverture.
 * On ne persiste que les requêtes **réussies** ; le `buster` (id de build) invalide le
 * cache à chaque déploiement pour ne jamais restaurer un schéma périmé.
 */
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "otium-query-cache",
});

/** Compose les providers applicatifs (thème, données serveur persistées, routing). */
export function AppProviders() {
  return (
    <ThemeProvider defaultTheme="system">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000, // 24 h : au-delà, on repart d'un fetch frais.
          buster: __OTIUM_BUILD_ID__,
          dehydrateOptions: {
            // Persiste uniquement les requêtes réussies ET publiques (jamais de PII sur disque).
            shouldDehydrateQuery: (query) =>
              query.state.status === "success" && isPersistableQuery(query.queryKey),
          },
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
