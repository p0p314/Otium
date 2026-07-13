import type { MediaSummary } from "@otium/types";
import { render, screen } from "@testing-library/react";
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

describe("MediaCard", () => {
  it("affiche titre, type et année, avec une affiche accessible", () => {
    render(<MediaCard media={dune} />);
    expect(screen.getByText("Dune")).toBeInTheDocument();
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

  it("liste les médias trouvés", () => {
    render(<MediaResults {...base} items={[dune]} />);
    expect(screen.getByText("Dune")).toBeInTheDocument();
  });

  it("signale une erreur de recherche", () => {
    render(<MediaResults {...base} isError />);
    expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument();
  });
});
