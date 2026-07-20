import { describe, expect, it } from "vitest";
import { dedupeBooks, identityKey, mergeBooks, needsFallback } from "./merge-books";
import type { BookRecord } from "./models/book";

function book(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "g1",
    source: "google-books",
    title: "Dune",
    subtitle: null,
    authors: ["Frank Herbert"],
    description: "Un désert, une épice.",
    coverUrl: "https://books.example/cover.jpg",
    coverUrlLarge: null,
    categories: ["Science-Fiction"],
    publishedDate: "1965",
    pageCount: 412,
    language: "fr",
    publisher: "Robert Laffont",
    isbn10: null,
    isbn13: "9782221252055",
    googleBooksId: "g1",
    openLibraryId: null,
    infoUrl: "https://books.google.com/g1",
    previewUrl: null,
    averageRating: 8.6,
    ratingsCount: 120,
    sources: ["google-books"],
    ...overrides,
  };
}

const openLibrary = (overrides: Partial<BookRecord> = {}): BookRecord =>
  book({
    externalId: "OL1W",
    source: "open-library",
    googleBooksId: null,
    openLibraryId: "/works/OL1W",
    sources: ["open-library"],
    ...overrides,
  });

describe("mergeBooks", () => {
  it("ne remplace jamais une donnée déjà fournie par la source prioritaire", () => {
    const merged = mergeBooks(
      book({ description: "Description Google" }),
      openLibrary({ description: "Description Open Library", pageCount: 999 }),
    );

    expect(merged.description).toBe("Description Google");
    expect(merged.pageCount).toBe(412);
  });

  it("complète uniquement les champs manquants", () => {
    const merged = mergeBooks(
      book({ description: null, coverUrl: null, subtitle: null }),
      openLibrary({
        description: "Description Open Library",
        coverUrl: "https://ol.example/cover.jpg",
        subtitle: "Le cycle de Dune",
      }),
    );

    expect(merged.description).toBe("Description Open Library");
    expect(merged.coverUrl).toBe("https://ol.example/cover.jpg");
    expect(merged.subtitle).toBe("Le cycle de Dune");
  });

  it("conserve l'identité de la source prioritaire", () => {
    const merged = mergeBooks(book(), openLibrary());
    expect(merged.externalId).toBe("g1");
    expect(merged.source).toBe("google-books");
  });

  it("complète une liste vide mais ne fusionne pas deux listes renseignées", () => {
    const withAuthors = mergeBooks(book({ authors: [] }), openLibrary({ authors: ["F. Herbert"] }));
    expect(withAuthors.authors).toEqual(["F. Herbert"]);

    const kept = mergeBooks(book(), openLibrary({ authors: ["F. Herbert"] }));
    expect(kept.authors).toEqual(["Frank Herbert"]);
  });

  it("trace les sources ayant contribué, sans doublon", () => {
    expect(mergeBooks(book(), openLibrary()).sources).toEqual(["google-books", "open-library"]);
    expect(mergeBooks(book(), book()).sources).toEqual(["google-books"]);
  });

  it("renvoie la fiche prioritaire telle quelle sans secours", () => {
    const primary = book();
    expect(mergeBooks(primary, null)).toBe(primary);
  });

  it("récupère le titre du secours si le prioritaire est vide", () => {
    expect(mergeBooks(book({ title: "  " }), openLibrary({ title: "Dune" })).title).toBe("Dune");
  });
});

describe("needsFallback", () => {
  it("réclame le secours en l'absence de fiche", () => {
    expect(needsFallback(null)).toBe(true);
  });

  it("réclame le secours si couverture, description ou ISBN manquent", () => {
    expect(needsFallback(book({ coverUrl: null }))).toBe(true);
    expect(needsFallback(book({ description: null }))).toBe(true);
    expect(needsFallback(book({ isbn13: null }))).toBe(true);
  });

  it("s'abstient d'appeler le secours sur une fiche complète", () => {
    expect(needsFallback(book())).toBe(false);
  });
});

describe("identityKey", () => {
  it("privilégie l'ISBN-13 et ignore les tirets", () => {
    expect(identityKey(book({ isbn13: "978-2-221-25205-5" }))).toBe("isbn13:9782221252055");
  });

  it("retombe sur l'ISBN-10 puis sur titre + auteur", () => {
    expect(identityKey(book({ isbn13: null, isbn10: "2221252055" }))).toBe("isbn10:2221252055");
    expect(identityKey(book({ isbn13: null, isbn10: null }))).toBe("title:dune|frank herbert");
  });

  it("rapproche deux graphies du même titre (casse, accents, ponctuation)", () => {
    const a = book({ isbn13: null, isbn10: null, title: "L'Étranger", authors: ["Camus"] });
    const b = book({ isbn13: null, isbn10: null, title: "l etranger", authors: ["camus"] });
    expect(identityKey(a)).toBe(identityKey(b));
  });
});

describe("dedupeBooks", () => {
  it("fusionne les doublons en gardant l'ordre et la priorité d'entrée", () => {
    const result = dedupeBooks([
      book({ description: null }),
      openLibrary({ description: "Complément" }),
      book({ externalId: "g2", isbn13: "9780441013593", title: "Messiah" }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.externalId).toBe("g1");
    expect(result[0]?.description).toBe("Complément");
    expect(result[1]?.title).toBe("Messiah");
  });
});
