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
    expect(book?.coverUrl).toMatch(/^https:/);
    expect(book?.coverUrl).not.toContain("edge=curl");
  });

  it("garde la vignette légère et n'agrandit que la couverture de la fiche", () => {
    const book = toBookRecord(volume);
    // Mesuré : `zoom=2` coûte ~2,5× le poids et la latence de `zoom=1`. On l'accepte pour
    // l'unique image d'une fiche, pas pour les vingt vignettes d'une grille.
    expect(book?.coverUrl).toContain("zoom=1");
    expect(book?.coverUrlLarge).toContain("zoom=2");
  });

  it("laisse l'URL intacte si elle ne porte pas de paramètre de zoom", () => {
    const sansZoom = toBookRecord({
      id: "x",
      volumeInfo: {
        title: "Sans zoom",
        imageLinks: { thumbnail: "https://books.google.com/books/content?id=X" },
      },
    });
    expect(sansZoom?.coverUrl).toBe("https://books.google.com/books/content?id=X");
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

  describe("appartenance à une œuvre", () => {
    /** Extrait réel d'un tome de manga (mesuré sur l'API). */
    const tome = (over: Record<string, unknown> = {}): GoogleVolume => ({
      id: "t1",
      volumeInfo: {
        title: "One Piece - Édition originale - Tome 50",
        seriesInfo: {
          shortSeriesBookTitle: "De nouveau face au mur",
          bookDisplayNumber: "50",
          volumeSeries: [
            { seriesId: "XnfZFwAAABCGYM", seriesBookType: "COLLECTED_EDITION", orderNumber: 49 },
          ],
        },
        ...over,
      },
    });

    it("retient l'identifiant de série et le rang du volume", () => {
      expect(toBookRecord(tome())?.series).toEqual({
        id: "XnfZFwAAABCGYM",
        source: "google-books",
        position: 50,
        kind: "COLLECTED_EDITION",
      });
    });

    it("préfère le numéro affiché à `orderNumber`, décalé d'un rang", () => {
      // `orderNumber` vaut 49 pour le tome 50 : c'est un index, pas un numéro de tome.
      expect(toBookRecord(tome())?.series?.position).toBe(50);
    });

    it("distingue la parution en chapitres de l'édition reliée", () => {
      const chapitre = tome({
        seriesInfo: {
          bookDisplayNumber: "859",
          volumeSeries: [{ seriesId: "AdWDHAAAABCDyM", seriesBookType: "SERIAL" }],
        },
      });
      expect(toBookRecord(chapitre)?.series).toMatchObject({
        id: "AdWDHAAAABCDyM",
        kind: "SERIAL",
      });
    });

    it("accepte une série sans rang (hors-série)", () => {
      const horsSerie = tome({
        seriesInfo: { volumeSeries: [{ seriesId: "XnfZFwAAABCGYM", orderNumber: 0 }] },
      });
      expect(toBookRecord(horsSerie)?.series).toMatchObject({ position: null, kind: "UNKNOWN" });
    });

    it("ne rattache rien quand le volume n'appartient à aucune série", () => {
      expect(toBookRecord(volume)?.series).toBeNull();
    });

    it("ne rattache rien sans identifiant de série exploitable", () => {
      const sansId = tome({ seriesInfo: { bookDisplayNumber: "3", volumeSeries: [{}] } });
      expect(toBookRecord(sansId)?.series).toBeNull();
    });
  });

  it("rejette un volume sans identifiant ou sans titre", () => {
    expect(toBookRecord({ volumeInfo: { title: "Anonyme" } })).toBeNull();
    expect(toBookRecord({ id: "x", volumeInfo: {} })).toBeNull();
  });
});
