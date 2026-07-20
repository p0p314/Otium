import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaCover } from "./media-cover";

const SRC = "https://images.example/cover.jpg";

describe("MediaCover", () => {
  it("charge paresseusement par défaut", () => {
    render(<MediaCover src={SRC} alt="Affiche de Dune" />);

    const img = screen.getByAltText("Affiche de Dune");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("charge immédiatement et en priorité les images visibles d'emblée", () => {
    render(<MediaCover src={SRC} alt="Affiche de Dune" priority />);

    const img = screen.getByAltText("Affiche de Dune");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("affiche un repli quand le catalogue n'a pas de couverture", () => {
    const { container } = render(<MediaCover src={null} alt="" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("bascule sur le repli si l'image échoue à charger", () => {
    const { container } = render(<MediaCover src={SRC} alt="Affiche de Dune" />);

    fireEvent.error(screen.getByAltText("Affiche de Dune"));

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("accepte un texte alternatif vide pour une image décorative", () => {
    const { container } = render(<MediaCover src={SRC} alt="" />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
