import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useSearchSettingsStore } from "../../../stores/search-settings-store";
import { SearchFieldFilter } from "./search-field-filter";

describe("SearchFieldFilter", () => {
  beforeEach(() => useSearchSettingsStore.setState({ field: "ALL" }));

  it("part de « Tout », le mode le plus tolérant", () => {
    render(<SearchFieldFilter />);
    expect(screen.getByRole("radio", { name: "Tout" })).toBeChecked();
  });

  it("bascule sur la recherche par auteur", async () => {
    render(<SearchFieldFilter />);

    await userEvent.click(screen.getByRole("radio", { name: "Auteur" }));

    expect(useSearchSettingsStore.getState().field).toBe("AUTHOR");
    expect(screen.getByRole("radio", { name: "Auteur" })).toBeChecked();
  });

  it("n'autorise qu'un champ à la fois", async () => {
    render(<SearchFieldFilter />);

    await userEvent.click(screen.getByRole("radio", { name: "Auteur" }));
    await userEvent.click(screen.getByRole("radio", { name: "Titre" }));

    expect(useSearchSettingsStore.getState().field).toBe("TITLE");
    expect(screen.getByRole("radio", { name: "Auteur" })).not.toBeChecked();
  });

  it("est annoncé comme un choix exclusif, pas comme des bascules", () => {
    render(<SearchFieldFilter />);
    expect(screen.getByRole("radiogroup", { name: "Champ de recherche" })).toBeInTheDocument();
  });
});
