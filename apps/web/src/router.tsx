import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { lazy } from "react";
import { LoginPage } from "./features/auth/login-page";
import { RegisterPage } from "./features/auth/register-page";
import { LibraryPage } from "./features/library/library-page";
import { ItemDetailPage } from "./features/library/item-detail-page";
import { ListsPage } from "./features/lists/lists-page";
import { ListDetailPage } from "./features/lists/list-detail-page";
import { MediaDetailPage } from "./features/media-detail/media-detail-page";
import { SearchPage } from "./features/media-search/search-page";

// Chargée à la demande : isole recharts dans un chunk séparé (éco-conception).
const StatsPage = lazy(() =>
  import("./features/stats/stats-page").then((m) => ({ default: m.StatsPage })),
);

// Page profil (profil / import / réglages) isolée dans son propre chunk (éco-conception).
const ProfilePage = lazy(() =>
  import("./features/profile/profile-page").then((m) => ({ default: m.ProfilePage })),
);

// Fiche d'œuvre (série de tomes) isolée dans son propre chunk (éco-conception).
const CollectionPage = lazy(() =>
  import("./features/collection/collection-page").then((m) => ({ default: m.CollectionPage })),
);

// Fiche épisode (résumé, casting) isolée dans son propre chunk (éco-conception).
const EpisodeDetailPage = lazy(() =>
  import("./features/media-detail/episode-detail-page").then((m) => ({
    default: m.EpisodeDetailPage,
  })),
);
import { RootLayout } from "./routes/root-layout";
import { HomePage } from "./routes/home";
import { useAuthStore } from "./stores/auth-store";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const requireAuth = () => {
  if (useAuthStore.getState().user === null) {
    throw redirect({ to: "/login" });
  }
};

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  beforeLoad: requireAuth,
  component: LibraryPage,
});

const itemDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library/$itemId",
  beforeLoad: requireAuth,
  component: ItemDetailPage,
});

const listsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lists",
  beforeLoad: requireAuth,
  component: ListsPage,
});

const listDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lists/$listId",
  beforeLoad: requireAuth,
  component: ListDetailPage,
});

// Fiche média publique (accessible depuis la recherche sans être connecté).
const mediaDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media/$type/$externalId",
  component: MediaDetailPage,
});

const episodeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media/$type/$externalId/season/$season/episode/$episode",
  component: EpisodeDetailPage,
});

// Fiche d'une œuvre suivie : réservée aux connectés, elle lit la bibliothèque.
const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collection/$provider/$externalId",
  beforeLoad: requireAuth,
  component: CollectionPage,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  beforeLoad: requireAuth,
  component: StatsPage,
});

/** Onglet du profil ouvrable via l'URL (ex. lien « Importer maintenant » → onglet Import). */
type ProfileTab = "profile" | "import";

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>): { tab?: ProfileTab } => {
    const tab = search.tab;
    return tab === "import" || tab === "profile" ? { tab } : {};
  },
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  loginRoute,
  registerRoute,
  libraryRoute,
  itemDetailRoute,
  listsRoute,
  listDetailRoute,
  mediaDetailRoute,
  collectionRoute,
  episodeDetailRoute,
  statsRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
