import { describe, expect, it } from "vitest";
import { toCatalogMedia } from "./tmdb.mapper";
import type { TmdbSearchItem } from "./tmdb.types";

const IMG = "https://img/w342";

describe("toCatalogMedia", () => {
  it("mappe un film", () => {
    const item: TmdbSearchItem = {
      id: 438631,
      media_type: "movie",
      title: "Dune",
      release_date: "2021-09-15",
      poster_path: "/dune.jpg",
    };
    expect(toCatalogMedia(item, IMG)).toEqual({
      externalRef: { provider: "tmdb", externalId: "438631" },
      type: "MOVIE",
      title: "Dune",
      year: 2021,
      posterUrl: "https://img/w342/dune.jpg",
      genres: [],
    });
  });

  it("mappe une série (name/first_air_date) sans poster", () => {
    const item: TmdbSearchItem = {
      id: 1399,
      media_type: "tv",
      name: "Game of Thrones",
      first_air_date: "2011-04-17",
      poster_path: null,
    };
    const result = toCatalogMedia(item, IMG);
    expect(result?.type).toBe("SERIES");
    expect(result?.title).toBe("Game of Thrones");
    expect(result?.year).toBe(2011);
    expect(result?.posterUrl).toBeNull();
  });

  it("écarte les personnes et types non supportés", () => {
    expect(toCatalogMedia({ id: 1, media_type: "person", name: "X" }, IMG)).toBeNull();
  });

  it("gère une date absente", () => {
    const result = toCatalogMedia({ id: 2, media_type: "movie", title: "Sans date" }, IMG);
    expect(result?.year).toBeNull();
  });
});
