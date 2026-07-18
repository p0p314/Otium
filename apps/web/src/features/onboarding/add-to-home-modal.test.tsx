import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddToHomeModal } from "./add-to-home-modal";

describe("AddToHomeModal", () => {
  it("affiche les instructions iOS et Android à l'ouverture", () => {
    render(<AddToHomeModal open platform="ios" onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Installer Otium/i })).toBeInTheDocument();
    expect(screen.getByText("iPhone / iPad (Safari)")).toBeInTheDocument();
    expect(screen.getByText("Android (Chrome)")).toBeInTheDocument();
  });

  it("ne rend rien quand elle est fermée", () => {
    const { container } = render(<AddToHomeModal open={false} platform="android" onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
