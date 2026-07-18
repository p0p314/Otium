import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddToHomeModal } from "./add-to-home-modal";

describe("AddToHomeModal", () => {
  it("iOS : met en avant la procédure Safari, Android replié en secours", () => {
    render(<AddToHomeModal open platform="ios" onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Installer Otium/i })).toBeInTheDocument();
    expect(screen.getByText("iPhone / iPad (Safari)")).toBeInTheDocument();
    // Android n'est pas mis en avant (pas de section titrée), mais reste accessible.
    expect(screen.queryByText("Android (Chrome)")).toBeNull();
    expect(screen.getByText(/Vous êtes plutôt sur Android/i)).toBeInTheDocument();
  });

  it("Android : met en avant la procédure Chrome, iOS replié en secours", () => {
    render(<AddToHomeModal open platform="android" onClose={vi.fn()} />);
    expect(screen.getByText("Android (Chrome)")).toBeInTheDocument();
    expect(screen.queryByText("iPhone / iPad (Safari)")).toBeNull();
    expect(screen.getByText(/Vous êtes plutôt sur iPhone/i)).toBeInTheDocument();
  });

  it("plateforme inconnue : affiche les deux procédures", () => {
    render(<AddToHomeModal open platform="other" onClose={vi.fn()} />);
    expect(screen.getByText("iPhone / iPad (Safari)")).toBeInTheDocument();
    expect(screen.getByText("Android (Chrome)")).toBeInTheDocument();
    expect(screen.queryByText(/Vous êtes plutôt sur/i)).toBeNull();
  });

  it("ne rend rien quand elle est fermée", () => {
    const { container } = render(<AddToHomeModal open={false} platform="android" onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
