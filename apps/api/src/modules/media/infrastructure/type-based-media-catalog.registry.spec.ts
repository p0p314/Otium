import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { MediaCatalogProvider } from "../domain";
import { TypeBasedMediaCatalogRegistry } from "./type-based-media-catalog.registry";

function provider(name: string): MediaCatalogProvider {
  return { name } as MediaCatalogProvider;
}

describe("TypeBasedMediaCatalogRegistry", () => {
  const tmdb = provider("tmdb");
  const books = provider("books");

  const registry = new TypeBasedMediaCatalogRegistry([
    { types: ["MOVIE", "SERIES"], provider: tmdb },
    { types: ["BOOK"], provider: books },
  ]);

  it("route chaque type vers son fournisseur", () => {
    expect(registry.forType("MOVIE")).toBe(tmdb);
    expect(registry.forType("SERIES")).toBe(tmdb);
    expect(registry.forType("BOOK")).toBe(books);
  });

  it("expose les types couverts", () => {
    expect(registry.supports("BOOK")).toBe(true);
    expect(registry.supportedTypes()).toEqual(["MOVIE", "SERIES", "BOOK"]);
  });

  it("échoue explicitement pour un type non couvert", () => {
    const partial = new TypeBasedMediaCatalogRegistry([{ types: ["MOVIE"], provider: tmdb }]);
    expect(partial.supports("BOOK")).toBe(false);
    expect(() => partial.forType("BOOK")).toThrow(NotFoundException);
  });

  it("garde le premier fournisseur déclaré en cas de doublon", () => {
    const duplicated = new TypeBasedMediaCatalogRegistry([
      { types: ["BOOK"], provider: books },
      { types: ["BOOK"], provider: tmdb },
    ]);
    expect(duplicated.forType("BOOK")).toBe(books);
  });
});
