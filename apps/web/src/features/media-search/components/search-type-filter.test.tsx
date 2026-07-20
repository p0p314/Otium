import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";
import { SearchTypeFilter } from "./search-type-filter";

const ALL = { MOVIE: true, SERIES: true, BOOK: true };

describe("SearchTypeFilter", () => {
  beforeEach(() => useSearchSettingsStore.setState({ enabled: ALL }));

  it("présente un bouton par type, tous actifs par défaut", () => {
    render(<SearchTypeFilter />);

    for (const label of ["Séries", "Films", "Livres"]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("désactive un type au clic", async () => {
    render(<SearchTypeFilter />);

    await userEvent.click(screen.getByRole("button", { name: "Livres" }));

    expect(screen.getByRole("button", { name: "Livres" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(useSearchSettingsStore.getState().enabled.BOOK).toBe(false);
  });

  it("réactive un type au second clic", async () => {
    render(<SearchTypeFilter />);

    await userEvent.click(screen.getByRole("button", { name: "Films" }));
    await userEvent.click(screen.getByRole("button", { name: "Films" }));

    expect(useSearchSettingsStore.getState().enabled.MOVIE).toBe(true);
  });

  it("empêche de désactiver le dernier type actif", async () => {
    useSearchSettingsStore.setState({ enabled: { MOVIE: false, SERIES: false, BOOK: true } });
    render(<SearchTypeFilter />);

    const lastOne = screen.getByRole("button", { name: "Livres" });
    expect(lastOne).toBeDisabled();
    expect(lastOne).toHaveAttribute("title", "Au moins un type doit rester sélectionné");

    await userEvent.click(lastOne);
    expect(useSearchSettingsStore.getState().enabled.BOOK).toBe(true);
  });

  it("est annoncé comme un groupe de bascules, pas un choix exclusif", () => {
    render(<SearchTypeFilter />);
    expect(screen.getByRole("group", { name: "Types de médias recherchés" })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});
