import { describe, expect, it } from "vitest";
import { matchCommunityBook } from "./match-community-book";
import type { BookRecord } from "./models/book";

function book(over: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "x",
    source: "community",
    title: "Le Rivage des Syrtes",
    subtitle: null,
    authors: ["Julien Gracq"],
    description: null,
    coverUrl: null,
    coverUrlLarge: null,
    categories: [],
    publishedDate: "1951",
    pageCount: null,
    language: "fr",
    publisher: null,
    isbn10: null,
    isbn13: null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: ["community"],
    series: null,
    ...over,
  };
}

describe("matchCommunityBook", () => {
  describe("ISBN — une identité, pas une ressemblance", () => {
    it("accepte un ISBN identique, même si les titres diffèrent", () => {
      // Éditions et traductions font varier les titres ; l'ISBN ne ment pas.
      const verdict = matchCommunityBook(
        book({ isbn13: "9782072777998" }),
        book({ title: "Le rivage des Syrtes (édition 2018)", isbn13: "9782072777998" }),
      );
      expect(verdict.confidence).toBe("CERTAIN");
    });

    it("rejette deux ISBN différents, même sur un titre identique", () => {
      const verdict = matchCommunityBook(
        book({ isbn13: "9782072777998" }),
        book({ isbn13: "9782221252055" }),
      );
      expect(verdict.confidence).toBe("REJECTED");
    });

    it("normalise les tirets avant de comparer", () => {
      const verdict = matchCommunityBook(
        book({ isbn13: "978-2-07-277799-8" }),
        book({ isbn13: "9782072777998" }),
      );
      expect(verdict.confidence).toBe("CERTAIN");
    });
  });

  describe("à défaut d'ISBN : titre + auteur + année", () => {
    it("accepte titre et auteur identiques", () => {
      expect(matchCommunityBook(book(), book({ source: "google-books" })).confidence).toBe(
        "CERTAIN",
      );
    });

    it("ignore casse, accents et ponctuation", () => {
      const verdict = matchCommunityBook(
        book({ title: "Le Rivage des Syrtes", authors: ["Julien Gracq"] }),
        book({ title: "le rivage des syrtes", authors: ["julien gracq"] }),
      );
      expect(verdict.confidence).toBe("CERTAIN");
    });

    it("tolère un an d'écart — les catalogues datent l'édition, pas l'œuvre", () => {
      expect(
        matchCommunityBook(book({ publishedDate: "1951" }), book({ publishedDate: "1952" }))
          .confidence,
      ).toBe("CERTAIN");
    });

    it("n'exige pas l'année quand l'un des deux l'ignore", () => {
      expect(
        matchCommunityBook(book({ publishedDate: null }), book({ publishedDate: "1951" }))
          .confidence,
      ).toBe("CERTAIN");
    });
  });

  describe("refus — un faux rapprochement coûte bien plus qu'un manqué", () => {
    it("rejette des titres différents", () => {
      expect(matchCommunityBook(book(), book({ title: "Un balcon en forêt" })).confidence).toBe(
        "REJECTED",
      );
    });

    it("rejette un auteur différent sur un titre identique", () => {
      // Le cas « Dune » / « Dune, le mook » : même sujet, autre ouvrage.
      expect(matchCommunityBook(book(), book({ authors: ["Un autre"] })).confidence).toBe(
        "REJECTED",
      );
    });

    it("rejette un livre communautaire sans auteur", () => {
      // Il ne resterait que le titre, et deux ouvrages homonymes existent.
      expect(matchCommunityBook(book({ authors: [] }), book()).confidence).toBe("REJECTED");
    });

    it("rejette un candidat sans auteur", () => {
      expect(matchCommunityBook(book(), book({ authors: [] })).confidence).toBe("REJECTED");
    });

    it("rejette des années trop éloignées", () => {
      expect(
        matchCommunityBook(book({ publishedDate: "1951" }), book({ publishedDate: "1998" }))
          .confidence,
      ).toBe("REJECTED");
    });

    it("rejette un titre vide", () => {
      expect(matchCommunityBook(book({ title: "  " }), book({ title: "  " })).confidence).toBe(
        "REJECTED",
      );
    });
  });

  it("explique sa décision, pour la rendre auditable", () => {
    expect(matchCommunityBook(book(), book({ authors: ["Autre"] })).reason).toContain("auteur");
    expect(
      matchCommunityBook(book({ isbn13: "9782072777998" }), book({ isbn13: "9782072777998" }))
        .reason,
    ).toContain("ISBN");
  });
});
