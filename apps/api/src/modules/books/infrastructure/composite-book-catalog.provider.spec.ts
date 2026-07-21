import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "../../../shared/infrastructure/cache/cache.service";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { BookProvider, BookRecord } from "../domain";
import { CompositeBookCatalogProvider } from "./composite-book-catalog.provider";

function record(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    externalId: "g1",
    source: "google-books",
    title: "Dune",
    subtitle: null,
    authors: ["Frank Herbert"],
    description: "Un désert.",
    coverUrl: "https://books.example/c.jpg",
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
    infoUrl: null,
    previewUrl: null,
    averageRating: null,
    ratingsCount: null,
    sources: ["google-books"],
    series: null,
    ...overrides,
  };
}

function fakeProvider(name: string): BookProvider {
  return {
    name,
    searchBooks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getByExternalId: vi.fn().mockResolvedValue(null),
    findByIsbn: vi.fn().mockResolvedValue(null),
  };
}

const config = { get: () => 3600 } as unknown as ConfigService<Env, true>;

/** Aucun livre communautaire : ces tests portent sur les sources distantes. */
function emptyCommunity() {
  return {
    create: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    findByExternalId: vi.fn().mockResolvedValue(null),
    findByIsbn: vi.fn().mockResolvedValue(null),
  };
}

describe("CompositeBookCatalogProvider", () => {
  let google: BookProvider;
  let openLibrary: BookProvider;
  let catalog: CompositeBookCatalogProvider;

  beforeEach(() => {
    google = fakeProvider("google-books");
    openLibrary = fakeProvider("open-library");
    catalog = new CompositeBookCatalogProvider(
      google,
      openLibrary,
      emptyCommunity(),
      new CacheService(),
      config,
    );
  });

  describe("recherche", () => {
    it("n'interroge pas le secours quand la source prioritaire répond", async () => {
      vi.mocked(google.searchBooks).mockResolvedValue({ items: [record()], total: 1 });

      const result = await catalog.search({ query: "Dune", page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.externalRef).toEqual({ provider: "books", externalId: "g1" });
      expect(openLibrary.searchBooks).not.toHaveBeenCalled();
    });

    it("bascule sur le secours quand la source prioritaire ne trouve rien", async () => {
      vi.mocked(openLibrary.searchBooks).mockResolvedValue({
        items: [record({ externalId: "/works/OL1W", source: "open-library", isbn13: null })],
        total: 1,
      });

      const result = await catalog.search({ query: "Dune", page: 1, pageSize: 20 });

      expect(openLibrary.searchBooks).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it("bascule sur le secours quand la source prioritaire est en panne", async () => {
      vi.mocked(google.searchBooks).mockRejectedValue(new Error("503"));
      vi.mocked(openLibrary.searchBooks).mockResolvedValue({ items: [record()], total: 1 });

      const result = await catalog.search({ query: "Dune", page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
    });

    it("échoue proprement quand les deux sources sont indisponibles", async () => {
      vi.mocked(google.searchBooks).mockRejectedValue(new Error("503"));
      vi.mocked(openLibrary.searchBooks).mockRejectedValue(new Error("timeout"));

      await expect(catalog.search({ query: "Dune", page: 1, pageSize: 20 })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("renvoie une page vide sans erreur quand aucune source ne connaît le titre", async () => {
      const result = await catalog.search({ query: "zzzz", page: 1, pageSize: 20 });
      expect(result).toMatchObject({ items: [], total: 0 });
    });

    it("sert la deuxième recherche identique depuis le cache", async () => {
      vi.mocked(google.searchBooks).mockResolvedValue({ items: [record()], total: 1 });

      await catalog.search({ query: "Dune", page: 1, pageSize: 20 });
      await catalog.search({ query: "  dune  ", page: 1, pageSize: 20 });

      expect(google.searchBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe("fiche détaillée", () => {
    it("ne consulte pas le secours pour une fiche déjà complète", async () => {
      vi.mocked(google.getByExternalId).mockResolvedValue(record());

      const details = await catalog.getMediaDetails("BOOK", "g1");

      expect(details.title).toBe("Dune");
      expect(openLibrary.findByIsbn).not.toHaveBeenCalled();
    });

    it("complète les champs manquants via le secours, par ISBN", async () => {
      vi.mocked(google.getByExternalId).mockResolvedValue(record({ description: null }));
      vi.mocked(openLibrary.findByIsbn).mockResolvedValue(
        record({ source: "open-library", description: "Complément", sources: ["open-library"] }),
      );

      const details = await catalog.getMediaDetails("BOOK", "g1");

      expect(openLibrary.findByIsbn).toHaveBeenCalledWith("9782221252055");
      expect(details.overview).toBe("Complément");
      expect(details.book?.sources).toEqual(["google-books", "open-library"]);
    });

    it("sert la fiche du secours seul si la source prioritaire ne connaît pas le livre", async () => {
      vi.mocked(openLibrary.getByExternalId).mockResolvedValue(
        record({ externalId: "/works/OL1W", source: "open-library", sources: ["open-library"] }),
      );

      const details = await catalog.getMediaDetails("BOOK", "/works/OL1W");

      expect(details.book?.sources).toEqual(["open-library"]);
    });

    it("n'échoue pas si le secours tombe pendant le complément", async () => {
      vi.mocked(google.getByExternalId).mockResolvedValue(record({ description: null }));
      vi.mocked(openLibrary.findByIsbn).mockRejectedValue(new Error("503"));

      const details = await catalog.getMediaDetails("BOOK", "g1");

      expect(details.overview).toBeNull();
      expect(details.title).toBe("Dune");
    });

    it("signale un livre introuvable partout", async () => {
      await expect(catalog.getMediaDetails("BOOK", "inconnu")).rejects.toThrow(NotFoundException);
    });

    it("refuse un type de média qui n'est pas un livre", async () => {
      await expect(catalog.getMediaDetails("MOVIE", "1")).rejects.toThrow(NotFoundException);
    });

    it("sert la deuxième consultation depuis le cache", async () => {
      vi.mocked(google.getByExternalId).mockResolvedValue(record());

      await catalog.getMediaDetails("BOOK", "g1");
      await catalog.getMediaDetails("BOOK", "g1");

      expect(google.getByExternalId).toHaveBeenCalledTimes(1);
    });
  });
});
