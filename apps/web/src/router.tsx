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

// Page d'import (rarement utilisée) isolée dans son propre chunk (éco-conception).
const ImportPage = lazy(() =>
  import("./features/import/import-page").then((m) => ({ default: m.ImportPage })),
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

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  beforeLoad: requireAuth,
  component: StatsPage,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  beforeLoad: requireAuth,
  component: ImportPage,
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
  statsRoute,
  importRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
