import { describe, expect, it } from "vitest";
import type { MediaDescriptor } from "../domain";
import { type EnrichableMedia, enrichMediaPatch } from "./media-enrichment";

function descriptor(overrides: Partial<MediaDescriptor> = {}): MediaDescriptor {
  return {
    externalRef: { provider: "tmdb", externalId: "1" },
    type: "MOVIE",
    title: "Titre du client",
    year: 2020,
    posterUrl: "https://evil.example/track.png",
    genres: ["Action"],
    runtimeMinutes: 120,
    releaseDate: new Date("2020-01-01"),
    ...overrides,
  };
}

const complete: EnrichableMedia = {
  posterUrl: "https://cdn.tmdb/legit.jpg",
  year: 1999,
  genres: ["Drame"],
  runtimeMinutes: 100,
  releaseDate: new Date("1999-01-01"),
};

const empty: EnrichableMedia = {
  posterUrl: null,
  year: null,
  genres: [],
  runtimeMinutes: null,
  releaseDate: null,
};

describe("enrichMediaPatch", () => {
  it("n'écrase jamais un média déjà renseigné (anti-falsification du catalogue)", () => {
    expect(enrichMediaPatch(complete, descriptor())).toEqual({});
  });

  it("ne renvoie jamais le titre, même sur un média vide", () => {
    const patch = enrichMediaPatch(empty, descriptor());
    expect(patch).not.toHaveProperty("title");
  });

  it("complète uniquement les champs vides", () => {
    const patch = enrichMediaPatch(empty, descriptor());
    expect(patch).toEqual({
      posterUrl: "https://evil.example/track.png",
      year: 2020,
      genres: ["Action"],
      runtimeMinutes: 120,
      releaseDate: new Date("2020-01-01"),
    });
  });

  it("complète sélectivement (poster manquant seulement)", () => {
    const partial: EnrichableMedia = { ...complete, posterUrl: null };
    const patch = enrichMediaPatch(partial, descriptor({ posterUrl: "https://cdn/new.jpg" }));
    expect(patch).toEqual({ posterUrl: "https://cdn/new.jpg" });
  });

  it("ignore les valeurs absentes du descriptor", () => {
    const patch = enrichMediaPatch(empty, descriptor({ posterUrl: null, genres: undefined }));
    expect(patch).not.toHaveProperty("posterUrl");
    expect(patch).not.toHaveProperty("genres");
  });
});
