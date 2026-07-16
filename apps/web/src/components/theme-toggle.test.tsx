import { ThemeProvider } from "@otium/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

// jsdom n'implémente pas startViewTransition : le repli (bascule instantanée) est exercé.
describe("ThemeToggle", () => {
  it("bascule le thème (repli sans View Transitions)", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: /Activer le thème sombre/i });
    await userEvent.click(button);

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: /Activer le thème clair/i })).toBeInTheDocument();
  });
});
