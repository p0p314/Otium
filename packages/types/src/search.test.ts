import { describe, expect, it } from "vitest";
import { SearchMediaQuery } from "./search.js";

describe("SearchMediaQuery", () => {
  it("accepte une sélection multi-types en query string (`types=MOVIE,BOOK`)", () => {
    const parsed = SearchMediaQuery.parse({ q: "Dune", types: "MOVIE,BOOK" });
    expect(parsed.types).toEqual(["MOVIE", "BOOK"]);
  });

  it("accepte aussi un tableau (clients non-HTTP)", () => {
    expect(SearchMediaQuery.parse({ q: "Dune", types: ["BOOK"] }).types).toEqual(["BOOK"]);
  });

  it("reste rétro-compatible avec `type` au singulier", () => {
    const parsed = SearchMediaQuery.parse({ q: "Dune", type: "MOVIE" });
    expect(parsed.type).toBe("MOVIE");
    expect(parsed.types).toBeUndefined();
  });

  it("rejette un type inconnu plutôt que de l'ignorer", () => {
    expect(SearchMediaQuery.safeParse({ q: "Dune", types: "MOVIE,VINYL" }).success).toBe(false);
    expect(SearchMediaQuery.safeParse({ q: "Dune", types: "" }).success).toBe(false);
  });

  it("applique pagination et taille de page par défaut", () => {
    expect(SearchMediaQuery.parse({ q: "Dune" })).toMatchObject({ page: 1, pageSize: 20 });
  });
});
