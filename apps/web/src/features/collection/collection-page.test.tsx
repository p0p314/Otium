import type { CollectionTracking, CollectionVolume } from "@otium/types";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { data: CollectionTracking | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("./api/use-collection", () => ({ useCollection: () => state }));
vi.mock("@tanstack/react-router", async () => {
  // Seul `useParams` est neutralisé : le reste du routeur sert au rendu des liens.
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return { ...actual, useParams: () => ({ provider: "books", externalId: "OP" }) };
});

import { CollectionPage } from "./collection-page";

function volume(position: number, status: CollectionVolume["status"]): CollectionVolume {
  return {
    itemId: status === null ? null : `item-${position}`,
    externalId: `g${position}`,
    title: `One Piece - Tome ${position}`,
    posterUrl: null,
    position,
    status,
  };
}

const tracking: CollectionTracking = {
  provider: "books",
  externalId: "OP",
  title: "One Piece",
  volumes: [volume(1, "COMPLETED"), volume(2, "COMPLETED"), volume(3, "IN_PROGRESS"), volume(4, null)],
  progress: {
    totalVolumes: 4,
    ownedVolumes: 3,
    readVolumes: 2,
    percent: 50,
    lastRead: volume(2, "COMPLETED"),
    nextSuggested: volume(3, "IN_PROGRESS"),
  },
};

function renderPage() {
  const rootRoute = createRootRoute({ component: () => <CollectionPage /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router as never} />);
}

describe("CollectionPage", () => {
  beforeEach(() => {
    state.data = tracking;
    state.isLoading = false;
    state.isError = false;
  });

  it("affiche la synthèse d'avancement calculée par le serveur", async () => {
    renderPage();

    expect(await screen.findByText("One Piece")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/2 tomes lus sur 4 connus · 50 %/)).toBeInTheDocument();
  });

  it("désigne le dernier tome lu et le prochain conseillé", async () => {
    renderPage();

    // Le titre du tome apparaît aussi dans la grille : on cible l'indicateur lui-même.
    const lastRead = (await screen.findByText("Dernier tome lu")).parentElement;
    expect(lastRead).toHaveTextContent("Tome 2");
    expect(lastRead).toHaveTextContent("One Piece - Tome 2");
    expect(
      screen.getByRole("link", { name: /Continuer : One Piece - Tome 3/ }),
    ).toBeInTheDocument();
  });

  it("distingue un tome absent de la bibliothèque", async () => {
    renderPage();

    // Un tome connu mais non ajouté doit le dire, plutôt que d'afficher un statut vide.
    expect(await screen.findByText("Pas dans la bibliothèque")).toBeInTheDocument();
  });

  it("annonce l'achèvement quand plus rien n'est à lire", async () => {
    state.data = {
      ...tracking,
      progress: { ...tracking.progress, percent: 100, readVolumes: 4, nextSuggested: null },
    };
    renderPage();

    expect(await screen.findByText(/Tous les tomes connus sont lus/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Continuer/ })).not.toBeInTheDocument();
  });

  it("traite l'œuvre non suivie comme un état vide, pas comme une panne", async () => {
    // L'API répond 404 tant qu'aucun tome n'a été ajouté : ce n'est pas une erreur.
    state.data = undefined;
    state.isError = true;
    renderPage();

    expect(
      await screen.findByText(/n'est pas encore dans votre bibliothèque/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rechercher un tome" })).toBeInTheDocument();
  });
});
