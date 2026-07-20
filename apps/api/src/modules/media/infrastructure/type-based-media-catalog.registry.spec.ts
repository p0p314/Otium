import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { MediaCatalogProvider } from "../domain";
import { TypeBasedMediaCatalogRegistry } from "./type-based-media-catalog.registry";

function provider(name: string): MediaCatalogProvider {
  return { name } as MediaCatalogProvider;
}

describe("TypeBasedMediaCatalogRegistry", () => {
  const tmdb = provider("tmdb");
  const other = provider("autre");

  const registry = new TypeBasedMediaCatalogRegistry([
    { types: ["MOVIE"], provider: tmdb },
    { types: ["SERIES"], provider: other },
  ]);

  it("route chaque type vers son fournisseur", () => {
    expect(registry.forType("MOVIE")).toBe(tmdb);
    expect(registry.forType("SERIES")).toBe(other);
  });

  it("expose les types couverts", () => {
    expect(registry.supports("MOVIE")).toBe(true);
    expect(registry.supportedTypes()).toEqual(["MOVIE", "SERIES"]);
  });

  it("échoue explicitement pour un type non couvert", () => {
    const partial = new TypeBasedMediaCatalogRegistry([{ types: ["MOVIE"], provider: tmdb }]);
    expect(partial.supports("SERIES")).toBe(false);
    expect(() => partial.forType("SERIES")).toThrow(NotFoundException);
  });

  it("garde le premier fournisseur déclaré en cas de doublon", () => {
    const duplicated = new TypeBasedMediaCatalogRegistry([
      { types: ["MOVIE"], provider: other },
      { types: ["MOVIE"], provider: tmdb },
    ]);
    expect(duplicated.forType("MOVIE")).toBe(other);
  });
});
