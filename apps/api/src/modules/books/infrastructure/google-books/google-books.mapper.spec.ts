import { describe, expect, it } from "vitest";
import { toBookRecord } from "./google-books.mapper";
import type { GoogleVolume } from "./google-books.types";

/** Extrait réel (réduit) d'une réponse `GET /volumes/{id}`. */
const volume: GoogleVolume = {
  id: "B1hSG45JCX4C",
  volumeInfo: {
    title: "Dune",
    subtitle: "Le cycle de Dune",
    authors: ["Frank Herbert"],
    publisher: "Robert Laffont",
    publishedDate: "1965-08-01",
    description: "Sur la planète Arrakis…",
    industryIdentifiers: [
      { type: "ISBN_10", identifier: "2221252055" },
      { type: "ISBN_13", identifier: "9782221252055" },
    ],
    pageCount: 912,
    categories: ["Fiction / Science Fiction"],
    averageRating: 4.5,
    ratingsCount: 210,
    imageLinks: {
      thumbnail: "http://books.google.com/books/content?id=B1&zoom=1&edge=curl",
      large: "http://books.google.com/books/content?id=B1&zoom=3",
    },
    language: "FR",
    infoLink: "https://books.google.fr/books?id=B1",
    previewLink: "https://books.google.fr/books?id=B1&printsec=frontcover",
  },
  accessInfo: { viewability: "PARTIAL" },
};

describe("toBookRecord (Google Books)", () => {
  it("normalise un volume complet", () => {
    const book = toBookRecord(volume);

    expect(book).toMatchObject({
      externalId: "B1hSG45JCX4C",
      source: "google-books",
      title: "Dune",
      subtitle: "Le cycle de Dune",
      authors: ["Frank Herbert"],
      pageCount: 912,
      publisher: "Robert Laffont",
      publishedDate: "1965-08-01",
      isbn10: "2221252055",
      isbn13: "9782221252055",
      googleBooksId: "B1hSG45JCX4C",
      openLibraryId: null,
      sources: ["google-books"],
    });
  });

  it("convertit la note de l'échelle /5 vers /10", () => {
    expect(toBookRecord(volume)?.averageRating).toBe(9);
  });

  it("normalise la langue en minuscules (ISO 639-1)", () => {
    expect(toBookRecord(volume)?.language).toBe("fr");
  });

  it("force HTTPS et retire l'ombre décorative des couvertures", () => {
    const book = toBookRecord(volume);
    expect(book?.coverUrl).toBe("https://books.google.com/books/content?id=B1&zoom=1");
    expect(book?.coverUrlLarge).toBe("https://books.google.com/books/content?id=B1&zoom=3");
  });

  it("n'expose un aperçu que si le volume en propose un", () => {
    expect(toBookRecord(volume)?.previewUrl).toContain("printsec=frontcover");
    const noPreview = { ...volume, accessInfo: { viewability: "NONE" } };
    expect(toBookRecord(noPreview)?.previewUrl).toBeNull();
  });

  it("écarte un ISBN dont la clé de contrôle est fausse", () => {
    const corrupted: GoogleVolume = {
      ...volume,
      volumeInfo: {
        ...volume.volumeInfo,
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9782221252054" }],
      },
    };
    expect(toBookRecord(corrupted)?.isbn13).toBeNull();
  });

  it("remplace les champs absents par null plutôt que undefined", () => {
    const minimal = toBookRecord({ id: "x", volumeInfo: { title: "Sans métadonnées" } });
    expect(minimal).toMatchObject({
      subtitle: null,
      description: null,
      coverUrl: null,
      pageCount: null,
      isbn13: null,
      averageRating: null,
      authors: [],
      categories: [],
    });
  });

  it("rejette un volume sans identifiant ou sans titre", () => {
    expect(toBookRecord({ volumeInfo: { title: "Anonyme" } })).toBeNull();
    expect(toBookRecord({ id: "x", volumeInfo: {} })).toBeNull();
  });
});
