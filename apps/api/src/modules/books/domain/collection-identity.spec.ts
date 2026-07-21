import { describe, expect, it } from "vitest";
import { BOOKS_PROVIDER, providerSeriesKey, titleSeriesGroupKey } from "./collection-identity";
import { groupVolumes } from "./group-volumes";
import type { BookRecord } from "./models/book";
import { toCatalogMediaDetails } from "./to-catalog";

function book(over: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "g1",
    source: "google-books",
    title: "One Piece - Tome 1",
    subtitle: null,
    authors: ["Eiichiro Oda"],
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
    googleBooksId: "g1",
    openLibraryId: null,
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: ["google-books"],
    series: { id: "XnfZ", source: "google-books", position: 1, kind: "COLLECTED_EDITION" },
    ...over,
  };
}

describe("identité d'une œuvre", () => {
  it("préfixe la clé par la source du fournisseur", () => {
    expect(providerSeriesKey("google-books", "XnfZ")).toBe("series:google-books:XnfZ");
  });

  it("distingue une œuvre déduite du titre d'une œuvre déclarée par le fournisseur", () => {
    expect(titleSeriesGroupKey("one piece|eiichiro oda")).not.toBe(
      providerSeriesKey("google-books", "one piece|eiichiro oda"),
    );
  });

  /**
   * Régression : l'identité est construite au regroupement **et** à l'ajout d'un volume.
   * Tant que les deux la fabriquaient séparément, elles ont divergé — la recherche
   * pointait vers `books / series:google-books:XnfZ`, la base enregistrait
   * `google-books / XnfZ`, et aucune fiche d'œuvre ne se retrouvait.
   */
  it("produit la même identité au regroupement et sur la fiche d'un volume", () => {
    const { groups } = groupVolumes([book(), book({ externalId: "g2", title: "One Piece - Tome 2" })]);
    const depuisRecherche = groups[0]?.key;

    const depuisFiche = toCatalogMediaDetails(book()).book?.collection;

    expect(depuisFiche?.id).toBe(depuisRecherche);
    expect(depuisFiche?.provider).toBe(BOOKS_PROVIDER);
  });

  it("référence l'œuvre sous le même fournisseur que ses volumes", () => {
    const details = toCatalogMediaDetails(book());
    expect(details.book?.collection?.provider).toBe(details.externalRef.provider);
  });
});
