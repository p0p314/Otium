import { ThemeProvider } from "@otium/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage } from "./home";

describe("HomePage", () => {
  it("affiche le titre d'accroche", () => {
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Suivez tout ce que vous/i);
  });

  it("propose une action de démarrage", () => {
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: /commencer/i })).toBeInTheDocument();
  });
});
