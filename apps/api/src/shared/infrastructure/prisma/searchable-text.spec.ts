import { describe, expect, it } from "vitest";
import { authorsText } from "./searchable-text";

describe("authorsText", () => {
  it("concatène les auteurs pour l'indexation", () => {
    expect(authorsText(["Albert Camus", "Jean-Paul Sartre"])).toBe(
      "Albert Camus Jean-Paul Sartre",
    );
  });

  it("renvoie null plutôt qu'une chaîne vide sans auteur", () => {
    // Une chaîne vide serait indexée et correspondrait à des recherches larges.
    expect(authorsText([])).toBeNull();
    expect(authorsText(["", "  "])).toBeNull();
  });

  it("conserve la casse : l'index trigramme gère l'insensibilité", () => {
    expect(authorsText(["Camus"])).toBe("Camus");
  });
});
