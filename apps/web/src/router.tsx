import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { LoginPage } from "./features/auth/login-page";
import { RegisterPage } from "./features/auth/register-page";
import { LibraryPage } from "./features/library/library-page";
import { ItemDetailPage } from "./features/library/item-detail-page";
import { SearchPage } from "./features/media-search/search-page";
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  loginRoute,
  registerRoute,
  libraryRoute,
  itemDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
