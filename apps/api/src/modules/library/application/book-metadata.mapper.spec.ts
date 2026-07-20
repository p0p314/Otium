import { describe, expect, it } from "vitest";
import type { CatalogMediaDetails } from "../../media/domain";
import { toBookMetadata } from "./book-metadata.mapper";

function details(overrides: Partial<CatalogMediaDetails> = {}): CatalogMediaDetails {
  return {
    externalRef: { provider: "books", externalId: "g1" },
    type: "BOOK",
    title: "Dune",
    originalTitle: null,
    posterUrl: null,
    backdropUrl: null,
    overview: "Sur la planète Arrakis.",
    genres: [{ id: "Science-Fiction", label: "Science-Fiction" }],
    rating: 9,
    voteCount: 120,
    releaseDate: "1965",
    year: 1965,
    status: null,
    runtimeMinutes: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    cast: [],
    directors: ["Frank Herbert"],
    productionCompanies: [],
    watchProviders: [],
    book: {
      subtitle: null,
      authors: ["Frank Herbert"],
      publisher: "Robert Laffont",
      publishedDate: "1965",
      pageCount: 592,
      language: "fr",
      isbn10: null,
      isbn13: "9782221252055",
      googleBooksId: "g1",
      openLibraryId: null,
      infoUrl: "https://books.google.fr/books?id=g1",
      previewUrl: null,
      coverUrlLarge: null,
      sources: ["google-books"],
      collection: null,
    },
    ...overrides,
  };
}

describe("toBookMetadata", () => {
  it("retient la pagination — sans elle, la progression ne peut rien calculer", () => {
    expect(toBookMetadata(details())?.pageCount).toBe(592);
  });

  it("puise description, catégories et note au niveau générique du média", () => {
    expect(toBookMetadata(details())).toMatchObject({
      description: "Sur la planète Arrakis.",
      categories: ["Science-Fiction"],
      averageRating: 9,
      ratingsCount: 120,
    });
  });

  it("reprend les données propres au livre", () => {
    expect(toBookMetadata(details())).toMatchObject({
      authors: ["Frank Herbert"],
      publisher: "Robert Laffont",
      isbn13: "9782221252055",
      googleBooksId: "g1",
      sources: ["google-books"],
    });
  });

  it("n'invente rien quand la fiche n'est pas celle d'un livre", () => {
    expect(toBookMetadata(details({ type: "MOVIE", book: null }))).toBeNull();
  });
});
