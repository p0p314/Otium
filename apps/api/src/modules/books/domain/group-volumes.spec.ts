import { describe, expect, it } from "vitest";
import { groupVolumes } from "./group-volumes";
import type { BookRecord, BookSeriesRef } from "./models/book";

function book(over: Partial<BookRecord> & { title: string }): BookRecord {
  return {
    externalId: over.title,
    source: "google-books",
    subtitle: null,
    authors: ["Hajime Isayama"],
    description: null,
    coverUrl: null,
    coverUrlLarge: null,
    categories: [],
    publishedDate: null,
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
    sources: ["google-books"],
    series: null,
    ...over,
  };
}

const serie = (id: string, position: number | null): BookSeriesRef => ({
  id,
  source: "google-books",
  position,
  kind: "COLLECTED_EDITION",
});

describe("groupVolumes", () => {
  it("regroupe les volumes partageant la série du fournisseur", () => {
    const { groups, standalone } = groupVolumes([
      book({ title: "One Piece - Tome 1", series: serie("OP", 1) }),
      book({ title: "One Piece - Tome 2", series: serie("OP", 2) }),
      book({ title: "One Piece - Tome 3", series: serie("OP", 3) }),
    ]);

    expect(standalone).toEqual([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ title: "One Piece", method: "PROVIDER_SERIES" });
    expect(groups[0]?.volumes).toHaveLength(3);
  });

  it("regroupe par titre + auteur quand le fournisseur ne donne pas la série", () => {
    const { groups } = groupVolumes([
      book({ title: "Fullmetal Alchemist - tome 05", authors: ["Hiromu Arakawa"] }),
      book({ title: "Fullmetal Alchemist - tome 06", authors: ["Hiromu Arakawa"] }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      title: "Fullmetal Alchemist",
      method: "TITLE_AND_AUTHOR",
    });
  });

  it("trie les volumes par rang, ceux sans rang en dernier", () => {
    const { groups } = groupVolumes([
      book({ title: "L'Attaque des Titans T27", series: serie("AOT", 27) }),
      book({ title: "L'Attaque des Titans - Hors-série", series: serie("AOT", null) }),
      book({ title: "L'Attaque des Titans T02", series: serie("AOT", 2) }),
    ]);

    expect(groups[0]?.volumes.map((v) => v.title)).toEqual([
      "L'Attaque des Titans T02",
      "L'Attaque des Titans T27",
      "L'Attaque des Titans - Hors-série",
    ]);
  });

  describe("refus de regrouper", () => {
    it("ne regroupe pas deux titres homonymes d'auteurs différents", () => {
      const { groups, standalone } = groupVolumes([
        book({ title: "L'Attaque des Titans T02", authors: ["Hajime Isayama"] }),
        book({ title: "L'Attaque des Titans T03", authors: ["Arnaud Jahan"] }),
      ]);

      expect(groups).toEqual([]);
      expect(standalone).toHaveLength(2);
    });

    it("ne regroupe pas un livre sans auteur connu", () => {
      const { groups, standalone } = groupVolumes([
        book({ title: "Naruto, tome 1", authors: [] }),
        book({ title: "Naruto, tome 2", authors: [] }),
      ]);

      expect(groups).toEqual([]);
      expect(standalone).toHaveLength(2);
    });

    it("laisse isolés les livres sans numéro de tome", () => {
      const { groups, standalone } = groupVolumes([
        book({ title: "Dune", authors: ["Frank Herbert"] }),
        book({ title: "Dune, le mook", authors: ["Frank Herbert"] }),
      ]);

      expect(groups).toEqual([]);
      expect(standalone).toHaveLength(2);
    });

    it("ne mélange pas deux méthodes de rattachement", () => {
      // Un volume rattaché par le fournisseur et un autre par son titre restent séparés :
      // rien ne garantit qu'ils désignent la même œuvre.
      const { groups, standalone } = groupVolumes([
        book({ title: "Naruto, tome 1", series: serie("NAR", 1), authors: ["Masashi Kishimoto"] }),
        book({ title: "Naruto, tome 2", authors: ["Masashi Kishimoto"] }),
      ]);

      expect(groups).toEqual([]);
      expect(standalone).toHaveLength(2);
    });
  });

  it("défait un groupe réduit à un seul volume", () => {
    // Une « œuvre » d'un tome ajoute un niveau de navigation pour rien.
    const { groups, standalone } = groupVolumes([
      book({ title: "One Piece - Tome 1", series: serie("OP", 1) }),
      book({ title: "Autre chose", authors: ["Quelqu'un"] }),
    ]);

    expect(groups).toEqual([]);
    expect(standalone.map((b) => b.title)).toEqual(["Autre chose", "One Piece - Tome 1"]);
  });

  it("préserve l'ordre de pertinence : une œuvre prend le rang de son premier volume", () => {
    const { groups, standalone } = groupVolumes([
      book({ title: "Un roman isolé", authors: ["Autrice"] }),
      book({ title: "One Piece - Tome 5", series: serie("OP", 5) }),
      book({ title: "One Piece - Tome 1", series: serie("OP", 1) }),
    ]);

    expect(standalone.map((b) => b.title)).toEqual(["Un roman isolé"]);
    expect(groups).toHaveLength(1);
    // Trié par rang à l'intérieur du groupe, malgré l'ordre d'arrivée.
    expect(groups[0]?.volumes.map((v) => v.title)).toEqual([
      "One Piece - Tome 1",
      "One Piece - Tome 5",
    ]);
  });

  it("accepte une liste vide", () => {
    expect(groupVolumes([])).toEqual({ groups: [], standalone: [] });
  });
});
