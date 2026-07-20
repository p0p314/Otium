import type { LibraryItem, WatchStatus } from "@otium/types";
import { describe, expect, it } from "vitest";
import {
  availableGenres,
  DEFAULT_LIBRARY_QUERY,
  isDefaultQuery,
  type LibraryQuery,
  queryLibrary,
} from "./filter-library";

function item(over: Partial<LibraryItem> & { id: string }): LibraryItem {
  const { media, ...rest } = over;
  return {
    status: "PLANNED",
    rating: null,
    isFavorite: false,
    addedAt: "2026-01-01T00:00:00.000Z",
    lastActivityAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    finishedAt: null,
    progress: null,
    ...rest,
    media: {
      type: "SERIES",
      title: "Titre",
      year: 2020,
      posterUrl: null,
      genres: [],
      externalRef: { provider: "tmdb", externalId: over.id },
      ...media,
    },
  };
}

function genres(...labels: string[]) {
  return labels.map((label) => ({ id: label, label }));
}

function query(over: Partial<LibraryQuery> = {}): LibraryQuery {
  return { ...DEFAULT_LIBRARY_QUERY, ...over };
}

describe("queryLibrary", () => {
  it("recherche le titre sans tenir compte de la casse ni des accents", () => {
    const items = [
      item({ id: "a", media: { title: "Le Château ambulant" } as LibraryItem["media"] }),
      item({ id: "b", media: { title: "Breaking Bad" } as LibraryItem["media"] }),
    ];
    expect(queryLibrary(items, query({ search: "chateau" })).map((i) => i.id)).toEqual(["a"]);
    expect(queryLibrary(items, query({ search: "BREAKING" })).map((i) => i.id)).toEqual(["b"]);
  });

  it("filtre par statut", () => {
    const items = [
      item({ id: "seen", status: "COMPLETED" }),
      item({ id: "todo", status: "PLANNED" }),
    ];
    const r = queryLibrary(items, query({ status: "COMPLETED" as WatchStatus }));
    expect(r.map((i) => i.id)).toEqual(["seen"]);
  });

  it("filtre les favoris uniquement", () => {
    const items = [item({ id: "fav", isFavorite: true }), item({ id: "plain" })];
    expect(queryLibrary(items, query({ favoritesOnly: true })).map((i) => i.id)).toEqual(["fav"]);
  });

  it("filtre par genre exact", () => {
    const items = [
      item({ id: "sf", media: { genres: genres("Science-Fiction", "Drame") } as LibraryItem["media"] }),
      item({ id: "com", media: { genres: genres("Comédie") } as LibraryItem["media"] }),
    ];
    expect(queryLibrary(items, query({ genre: "Drame" })).map((i) => i.id)).toEqual(["sf"]);
  });

  it("combine plusieurs filtres (ET logique)", () => {
    const items = [
      item({ id: "match", status: "COMPLETED", isFavorite: true, media: { title: "Dune" } as LibraryItem["media"] }),
      item({ id: "wrongStatus", status: "PLANNED", isFavorite: true, media: { title: "Dune" } as LibraryItem["media"] }),
    ];
    const r = queryLibrary(
      items,
      query({ search: "dune", status: "COMPLETED" as WatchStatus, favoritesOnly: true }),
    );
    expect(r.map((i) => i.id)).toEqual(["match"]);
  });

  it("trie par titre, note, année, ajout et activité", () => {
    const items = [
      item({
        id: "old-added",
        rating: 5,
        addedAt: "2026-01-01T00:00:00.000Z",
        lastActivityAt: "2026-06-01T00:00:00.000Z",
        media: { title: "Zorro", year: 1998 } as LibraryItem["media"],
      }),
      item({
        id: "new-added",
        rating: 9,
        addedAt: "2026-05-01T00:00:00.000Z",
        lastActivityAt: "2026-02-01T00:00:00.000Z",
        media: { title: "Amélie", year: 2021 } as LibraryItem["media"],
      }),
    ];
    expect(queryLibrary(items, query({ sort: "title" })).map((i) => i.id)).toEqual(["new-added", "old-added"]);
    expect(queryLibrary(items, query({ sort: "rating" })).map((i) => i.id)).toEqual(["new-added", "old-added"]);
    expect(queryLibrary(items, query({ sort: "year" })).map((i) => i.id)).toEqual(["new-added", "old-added"]);
    expect(queryLibrary(items, query({ sort: "recent" })).map((i) => i.id)).toEqual(["new-added", "old-added"]);
    expect(queryLibrary(items, query({ sort: "activity" })).map((i) => i.id)).toEqual(["old-added", "new-added"]);
  });

  it("relègue les non notés en fin de tri par note", () => {
    const items = [item({ id: "unrated", rating: null }), item({ id: "rated", rating: 3 })];
    expect(queryLibrary(items, query({ sort: "rating" })).map((i) => i.id)).toEqual(["rated", "unrated"]);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const items = [item({ id: "b" }), item({ id: "a" })];
    const snapshot = items.map((i) => i.id);
    queryLibrary(items, query({ sort: "title" }));
    expect(items.map((i) => i.id)).toEqual(snapshot);
  });
});

describe("availableGenres", () => {
  it("dédoublonne et trie les libellés de genres", () => {
    const items = [
      item({ id: "a", media: { genres: genres("Drame", "Science-Fiction") } as LibraryItem["media"] }),
      item({ id: "b", media: { genres: genres("Comédie", "Drame") } as LibraryItem["media"] }),
    ];
    expect(availableGenres(items)).toEqual(["Comédie", "Drame", "Science-Fiction"]);
  });
});

describe("isDefaultQuery", () => {
  it("détecte l'absence de filtre actif", () => {
    expect(isDefaultQuery(DEFAULT_LIBRARY_QUERY)).toBe(true);
    expect(isDefaultQuery(query({ search: "x" }))).toBe(false);
    expect(isDefaultQuery(query({ favoritesOnly: true }))).toBe(false);
    expect(isDefaultQuery(query({ sort: "title" }))).toBe(false);
  });
});
