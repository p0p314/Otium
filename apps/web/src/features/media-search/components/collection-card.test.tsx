import type { CollectionSummary, MediaSummary } from "@otium/types";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CollectionCard } from "./collection-card";

function volume(position: number): MediaSummary {
  return {
    type: "BOOK",
    title: `One Piece - Tome ${position}`,
    year: 2000 + position,
    posterUrl: null,
    genres: [],
    externalRef: { provider: "books", externalId: `g${position}` },
  };
}

const collection: CollectionSummary = {
  externalRef: { provider: "books", externalId: "series:google-books:OP" },
  title: "One Piece",
  coverUrl: null,
  authors: ["Eiichiro Oda"],
  volumeCount: 3,
  positions: [1, 2, 3],
  volumes: [volume(1), volume(2), volume(3)],
};

/** Les cartes de tome contiennent des liens : il faut un routeur pour les rendre. */
function renderCard(node: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <>{node}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router as never} />);
}

describe("CollectionCard", () => {
  it("résume l'œuvre au lieu d'énumérer ses tomes", async () => {
    renderCard(<CollectionCard collection={collection} />);

    expect(await screen.findByText("One Piece")).toBeInTheDocument();
    expect(screen.getByText("Eiichiro Oda")).toBeInTheDocument();
    expect(screen.getByText(/3 tomes trouvés · tomes 1 à 3/)).toBeInTheDocument();
    // Repliée, la carte n'affiche aucun tome : c'est tout l'intérêt du regroupement.
    expect(screen.queryByText("One Piece - Tome 1")).not.toBeInTheDocument();
  });

  it("déplie les tomes à la demande", async () => {
    renderCard(<CollectionCard collection={collection} />);

    await userEvent.click(await screen.findByRole("button", { expanded: false }));

    expect(screen.getByText("One Piece - Tome 1")).toBeInTheDocument();
    expect(screen.getByText("One Piece - Tome 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
  });

  it("replie les tomes au second clic", async () => {
    renderCard(<CollectionCard collection={collection} />);

    const toggle = await screen.findByRole("button", { expanded: false });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { expanded: true }));

    expect(screen.queryByText("One Piece - Tome 1")).not.toBeInTheDocument();
  });

  it("rend l'action fournie sur chaque tome déplié", async () => {
    renderCard(
      <CollectionCard
        collection={collection}
        renderAction={(media) => <button type="button">Ajouter {media.title}</button>}
      />,
    );

    await userEvent.click(await screen.findByRole("button", { expanded: false }));

    expect(
      screen.getByRole("button", { name: "Ajouter One Piece - Tome 2" }),
    ).toBeInTheDocument();
  });

  it("n'affiche l'étendue que si les rangs sont connus", async () => {
    renderCard(<CollectionCard collection={{ ...collection, positions: [] }} />);

    expect(await screen.findByText(/3 tomes trouvés/)).toBeInTheDocument();
    expect(screen.queryByText(/tomes 1 à 3/)).not.toBeInTheDocument();
  });

  it("accorde le singulier pour un tome unique", async () => {
    renderCard(
      <CollectionCard
        collection={{ ...collection, volumeCount: 1, positions: [4], volumes: [volume(4)] }}
      />,
    );

    expect(await screen.findByText(/1 tome trouvé · tome 4/)).toBeInTheDocument();
  });
});
