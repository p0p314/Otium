import type { LibraryItem, MediaProgress } from "@otium/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateProgress = vi.fn();

vi.mock("../api/use-item-detail", () => ({
  useUpdateProgress: () => ({ mutate: updateProgress, isPending: false, isError: false }),
}));

import { ReadingProgressControl } from "./reading-progress-control";

function item(progress: MediaProgress | null = null): LibraryItem {
  return {
    id: "item-1",
    media: {
      type: "BOOK",
      title: "Dune",
      year: 1965,
      posterUrl: null,
      genres: [],
      externalRef: { provider: "books", externalId: "g1" },
    },
    status: "IN_PROGRESS",
    rating: null,
    isFavorite: false,
    addedAt: "2026-01-01T00:00:00.000Z",
    lastActivityAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    progress,
  };
}

const atPage75: MediaProgress = {
  unit: "PAGES",
  value: 75,
  total: 300,
  percent: 25,
  remaining: 225,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ReadingProgressControl", () => {
  beforeEach(() => updateProgress.mockReset());

  it("enregistre une progression en pages", async () => {
    render(<ReadingProgressControl item={item()} totalPages={300} />);

    await userEvent.clear(screen.getByLabelText("Page actuelle"));
    await userEvent.type(screen.getByLabelText("Page actuelle"), "120");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateProgress).toHaveBeenCalledWith({ unit: "PAGES", value: 120 });
  });

  it("bascule en pourcentage et enregistre dans cette unité", async () => {
    render(<ReadingProgressControl item={item()} totalPages={300} />);

    await userEvent.click(screen.getByRole("radio", { name: "Pourcentage" }));
    await userEvent.clear(screen.getByLabelText("Pourcentage lu"));
    await userEvent.type(screen.getByLabelText("Pourcentage lu"), "40");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateProgress).toHaveBeenCalledWith({ unit: "PERCENT", value: 40 });
  });

  it("transmet le nombre de pages quand le catalogue l'ignore", async () => {
    render(<ReadingProgressControl item={item(atPage75)} totalPages={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateProgress).toHaveBeenCalledWith({ unit: "PAGES", value: 75, total: 300 });
  });

  it("affiche les valeurs calculées par le serveur sans les recalculer", () => {
    render(<ReadingProgressControl item={item(atPage75)} totalPages={300} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText(/25 % lu/)).toBeInTheDocument();
    expect(screen.getByText(/225 pages restantes/)).toBeInTheDocument();
  });

  it("n'affiche pas de barre tant que la progression est inconnue", () => {
    render(<ReadingProgressControl item={item()} totalPages={null} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("ignore une saisie invalide plutôt que d'envoyer n'importe quoi", async () => {
    render(<ReadingProgressControl item={item()} totalPages={300} />);

    await userEvent.clear(screen.getByLabelText("Page actuelle"));
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateProgress).not.toHaveBeenCalled();
  });
});
