import { describe, expect, it } from "vitest";
import { coverUrl, toBookRecord, toDescription } from "./open-library.mapper";
import type { OpenLibraryDoc } from "./open-library.types";

/** Extrait réel (réduit) d'une réponse `GET /search.json`. */
const doc: OpenLibraryDoc = {
  key: "/works/OL45804W",
  title: "Dune",
  author_name: ["Frank Herbert"],
  first_publish_year: 1965,
  publisher: ["Chilton Books", "Ace Books"],
  number_of_pages_median: 412,
  language: ["fre"],
  isbn: ["0441013597", "9782221252055"],
  cover_i: 8231856,
  subject: ["Science fiction", "Desert", "Fiction", "Politics", "Ecology", "Spice"],
  first_sentence: ["Un début de roman."],
};

describe("toBookRecord (Open Library)", () => {
  it("normalise un document de recherche", () => {
    expect(toBookRecord(doc)).toMatchObject({
      externalId: "/works/OL45804W",
      source: "open-library",
      title: "Dune",
      authors: ["Frank Herbert"],
      publishedDate: "1965",
      pageCount: 412,
      publisher: "Chilton Books",
      openLibraryId: "/works/OL45804W",
      googleBooksId: null,
      infoUrl: "https://openlibrary.org/works/OL45804W",
      sources: ["open-library"],
    });
  });

  it("traduit les codes langue ISO 639-2 vers ISO 639-1", () => {
    expect(toBookRecord(doc)?.language).toBe("fr");
    expect(toBookRecord({ ...doc, language: ["eng"] })?.language).toBe("en");
    expect(toBookRecord({ ...doc, language: ["fr"] })?.language).toBe("fr");
    expect(toBookRecord({ ...doc, language: ["xyz"] })?.language).toBeNull();
  });

  it("range chaque ISBN selon sa longueur", () => {
    const book = toBookRecord(doc);
    expect(book?.isbn10).toBe("0441013597");
    expect(book?.isbn13).toBe("9782221252055");
  });

  it("borne les sujets pour éviter le bruit", () => {
    expect(toBookRecord(doc)?.categories).toHaveLength(5);
  });

  it("compose les URL de couverture aux deux tailles", () => {
    const book = toBookRecord(doc);
    expect(book?.coverUrl).toBe("https://covers.openlibrary.org/b/id/8231856-M.jpg");
    expect(book?.coverUrlLarge).toBe("https://covers.openlibrary.org/b/id/8231856-L.jpg");
  });

  it("n'invente ni note ni aperçu (Open Library n'en fournit pas)", () => {
    expect(toBookRecord(doc)).toMatchObject({
      averageRating: null,
      ratingsCount: null,
      previewUrl: null,
    });
  });

  it("rejette un document sans clé ou sans titre", () => {
    expect(toBookRecord({ title: "Dune" })).toBeNull();
    expect(toBookRecord({ key: "/works/OL1W" })).toBeNull();
  });
});

describe("toDescription", () => {
  it("accepte les deux formes renvoyées par Open Library", () => {
    expect(toDescription("Texte brut")).toBe("Texte brut");
    expect(toDescription({ value: "Texte typé" })).toBe("Texte typé");
    expect(toDescription(undefined)).toBeNull();
    expect(toDescription({ value: "   " })).toBeNull();
  });
});

describe("coverUrl", () => {
  it("ne fabrique pas d'URL sans identifiant d'image", () => {
    expect(coverUrl(undefined, "L")).toBeNull();
  });
});
