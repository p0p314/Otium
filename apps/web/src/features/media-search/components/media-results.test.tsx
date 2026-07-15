import type { MediaSummary } from "@otium/types";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { MediaCard } from "./media-card";
import { MediaResults } from "./media-results";

const dune: MediaSummary = {
  externalRef: { provider: "tmdb", externalId: "1" },
  type: "MOVIE",
  title: "Dune",
  year: 2021,
  posterUrl: "https://img/w342/d.jpg",
  genres: [],
};

/** Monte l'UI dans un routeur mémoire minimal (les cartes contiennent des `<Link>`). */
function renderWithRouter(ui: ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{ui}</>,
  });
  const mediaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/media/$type/$externalId",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, mediaRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("MediaCard", () => {
  it("affiche titre, type et année, avec une affiche accessible", async () => {
    renderWithRouter(<MediaCard media={dune} />);
    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.getByText(/Film · 2021/)).toBeInTheDocument();
    expect(screen.getByAltText("Affiche de Dune")).toBeInTheDocument();
  });
});

describe("MediaResults", () => {
  const base = { items: [], isLoading: false, isError: false, hasQuery: true };

  it("invite à rechercher tant qu'aucune requête n'est saisie", () => {
    render(<MediaResults {...base} hasQuery={false} />);
    expect(screen.getByText(/Recherchez un titre/)).toBeInTheDocument();
  });

  it("montre des squelettes pendant le chargement", () => {
    render(<MediaResults {...base} isLoading />);
    expect(screen.getByLabelText(/Chargement des résultats/)).toBeInTheDocument();
  });

  it("affiche un état vide sans résultat", () => {
    render(<MediaResults {...base} items={[]} />);
    expect(screen.getByText(/Aucun résultat/)).toBeInTheDocument();
  });

  it("liste les médias trouvés", async () => {
    renderWithRouter(<MediaResults {...base} items={[dune]} />);
    expect(await screen.findByText("Dune")).toBeInTheDocument();
  });

  it("signale une erreur de recherche", () => {
    render(<MediaResults {...base} isError />);
    expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument();
  });
});
