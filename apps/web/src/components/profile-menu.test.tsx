import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Link nécessite un routeur : on le remplace par une ancre simple pour le test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import { ProfileMenu } from "./profile-menu";

describe("ProfileMenu", () => {
  it("ouvre un menu avec Réglages et Statistiques", async () => {
    render(<ProfileMenu displayName="Alice" />);
    const button = screen.getByRole("button", { name: /Menu du profil/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const reglages = screen.getByRole("menuitem", { name: /Réglages/i });
    const stats = screen.getByRole("menuitem", { name: /Statistiques/i });
    expect(reglages).toHaveAttribute("href", "/profile");
    expect(stats).toHaveAttribute("href", "/stats");
  });

  it("se ferme après un clic sur une entrée", async () => {
    render(<ProfileMenu displayName="Alice" />);
    await userEvent.click(screen.getByRole("button", { name: /Menu du profil/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Réglages/i }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
