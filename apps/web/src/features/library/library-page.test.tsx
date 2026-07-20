import type { LibraryItem } from "@otium/types";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Le routeur n'est pas monté dans ce test : on réduit `Link` à une ancre simple
// (en filtrant les props spécifiques au routeur pour éviter le bruit DOM).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("./api/use-library", () => ({
  useLibrary: vi.fn(),
  useRemoveFromLibrary: () => ({ mutate: vi.fn() }),
  useToggleFavorite: () => ({ mutate: vi.fn() }),
}));

import { useLibrary } from "./api/use-library";
import { LibraryPage } from "./library-page";

function series(over: Partial<LibraryItem> & { id: string; title: string }): LibraryItem {
  return {
    id: over.id,
    media: {
      type: "SERIES",
      title: over.title,
      year: 2020,
      posterUrl: null,
      genres: over.media?.genres ?? [],
      externalRef: { provider: "tmdb", externalId: over.id },
    },
    status: over.status ?? "PLANNED",
    rating: over.rating ?? null,
    isFavorite: over.isFavorite ?? false,
    addedAt: "2026-01-01T00:00:00.000Z",
    lastActivityAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    progress: null,
  };
}

const items: LibraryItem[] = [
  series({
    id: "bb",
    title: "Breaking Bad",
    status: "IN_PROGRESS",
    isFavorite: true,
    media: { genres: [{ id: "Drame", label: "Drame" }] } as LibraryItem["media"],
  }),
  series({
    id: "fr",
    title: "Friends",
    status: "COMPLETED",
    media: { genres: [{ id: "Comédie", label: "Comédie" }] } as LibraryItem["media"],
  }),
];

function renderPage() {
  vi.mocked(useLibrary).mockReturnValue({ data: items, isLoading: false } as ReturnType<
    typeof useLibrary
  >);
  return render(<LibraryPage />);
}

describe("LibraryPage — recherche avancée", () => {
  it("affiche tous les titres de la catégorie par défaut", () => {
    renderPage();
    expect(screen.getByText("Breaking Bad")).toBeTruthy();
    expect(screen.getByText("Friends")).toBeTruthy();
  });

  it("filtre par titre saisi", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Rechercher un titre dans la bibliothèque"), {
      target: { value: "friends" },
    });
    expect(screen.queryByText("Breaking Bad")).toBeNull();
    expect(screen.getByText("Friends")).toBeTruthy();
  });

  it("filtre par statut", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filtrer par statut"), {
      target: { value: "COMPLETED" },
    });
    expect(screen.queryByText("Breaking Bad")).toBeNull();
    expect(screen.getByText("Friends")).toBeTruthy();
  });

  it("filtre les favoris et se réinitialise", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Favoris/ }));
    expect(screen.getByText("Breaking Bad")).toBeTruthy();
    expect(screen.queryByText("Friends")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    expect(screen.getByText("Friends")).toBeTruthy();
  });

  it("affiche un état vide distinct quand aucun résultat ne correspond", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Rechercher un titre dans la bibliothèque"), {
      target: { value: "zzz-introuvable" },
    });
    expect(screen.getByText("Aucun résultat pour ces filtres.")).toBeTruthy();
  });
});
