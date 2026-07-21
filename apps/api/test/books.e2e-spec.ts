import { Global, type INestApplication, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BooksModule } from "../src/modules/books/books.module";
import { COMMUNITY_BOOK_REPOSITORY } from "../src/modules/books/domain";
import { CompositeBookCatalogProvider } from "../src/modules/books/infrastructure/composite-book-catalog.provider";
import { GetEpisodeDetailsUseCase } from "../src/modules/media/application/queries/get-episode-details.usecase";
import { GetMediaDetailsUseCase } from "../src/modules/media/application/queries/get-media-details.usecase";
import { GetTrendingMediaUseCase } from "../src/modules/media/application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "../src/modules/media/application/queries/search-media.usecase";
import {
  CATALOG_PROVIDER_REGISTRATIONS,
  type CatalogProviderRegistration,
  MEDIA_CATALOG_REGISTRY,
} from "../src/modules/media/domain";
import { TypeBasedMediaCatalogRegistry } from "../src/modules/media/infrastructure/type-based-media-catalog.registry";
import { MediaController } from "../src/modules/media/presentation/media.controller";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { CacheService } from "../src/shared/infrastructure/cache/cache.service";
import { PrismaService } from "../src/shared/infrastructure/prisma/prisma.service";
import { HttpClient } from "../src/shared/infrastructure/http/http-client";

/** Volume Google Books **incomplet** : ni description ni ISBN → déclenche le secours. */
const googleVolume = {
  id: "g1",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    publishedDate: "1965",
    pageCount: 412,
    language: "fr",
    imageLinks: { thumbnail: "http://books.google.com/c.jpg?edge=curl" },
    infoLink: "https://books.google.fr/books?id=g1",
  },
};

/** Réponse Open Library apportant description et ISBN. */
const openLibrarySearch = {
  numFound: 1,
  docs: [
    {
      key: "/works/OL45804W",
      title: "Dune",
      author_name: ["Frank Herbert"],
      first_publish_year: 1965,
      isbn: ["9782221252055"],
      cover_i: 8231856,
      first_sentence: ["Sur la planète Arrakis."],
      language: ["fre"],
    },
  ],
};

/** Route la requête vers la charge utile correspondante, par URL. */
function fakeHttp(routes: { pattern: RegExp; payload: unknown }[]): HttpClient {
  return {
    getJson: vi.fn(async (url: string) => {
      const route = routes.find((r) => r.pattern.test(url));
      if (!route) throw Object.assign(new Error(`404 sur ${url}`), { status: 404 });
      return route.payload;
    }),
  } as unknown as HttpClient;
}

const ENV: Record<string, string | number> = {
  GOOGLE_BOOKS_API_BASE_URL: "https://books.test/v1",
  OPEN_LIBRARY_API_BASE_URL: "https://openlibrary.test",
  BOOKS_CACHE_TTL_SECONDS: 3600,
};

/**
 * En production, config/cache/HTTP sont des modules **globaux** (`@Global`). On reproduit
 * cette visibilité ici, sinon `BooksModule` — importé tel quel, sans adaptation — ne
 * verrait pas ces dépendances.
 */
function technicalModule(http: HttpClient): new () => object {
  @Global()
  @Module({
    providers: [
      CacheService,
      { provide: HttpClient, useValue: http },
      { provide: ConfigService, useValue: { get: (key: string) => ENV[key] } },
      // `BooksModule` importe l'authentification (garde de la création de livre), qui
      // dépend du bus d'événements — global en production.
      { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined, publishAll: async () => undefined } },
      // Idem : `PrismaModule` est global en production. Aucune requête n'est émise ici,
      // le dépôt communautaire étant remplacé par un double.
      { provide: PrismaService, useValue: {} },
    ],
    exports: [CacheService, HttpClient, ConfigService, EVENT_PUBLISHER, PrismaService],
  })
  class TechnicalTestModule {}
  return TechnicalTestModule;
}

/** Livre saisi par un utilisateur, tel que le dépôt le renverrait. */
const communityBook = {
  externalId: "own-1",
  source: "community",
  title: "Carnet de voyage en Ardèche",
  subtitle: null,
  authors: ["Camille Roy"],
  description: null,
  coverUrl: null,
  coverUrlLarge: null,
  categories: [],
  publishedDate: "1998",
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
};

describe("Books catalog (e2e)", () => {
  let app: INestApplication;
  let http: HttpClient;
  let community: { search: ReturnType<typeof vi.fn>; findByExternalId: ReturnType<typeof vi.fn> };

  const build = async (routes: { pattern: RegExp; payload: unknown }[]) => {
    http = fakeHttp(routes);
    community = {
      search: vi.fn().mockResolvedValue([]),
      findByExternalId: vi.fn().mockResolvedValue(null),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [technicalModule(http), BooksModule],
      controllers: [MediaController],
      providers: [
        SearchMediaUseCase,
        GetMediaDetailsUseCase,
        { provide: GetTrendingMediaUseCase, useValue: { execute: vi.fn() } },
        { provide: GetEpisodeDetailsUseCase, useValue: { execute: vi.fn() } },
        {
          provide: CATALOG_PROVIDER_REGISTRATIONS,
          useFactory: (books: CompositeBookCatalogProvider): CatalogProviderRegistration[] => [
            { types: ["BOOK"], provider: books },
          ],
          inject: [CompositeBookCatalogProvider],
        },
        { provide: MEDIA_CATALOG_REGISTRY, useClass: TypeBasedMediaCatalogRegistry },
      ],
    })
      .overrideProvider(COMMUNITY_BOOK_REPOSITORY)
      .useValue({ ...community, create: vi.fn(), findByIsbn: vi.fn() })
      .compile();
    const application = moduleRef.createNestApplication();
    await application.init();
    return application;
  };

  afterAll(async () => {
    await app?.close();
  });

  describe("recherche", () => {
    beforeEach(async () => {
      await app?.close();
      app = await build([{ pattern: /books\.test/, payload: { totalItems: 1, items: [googleVolume] } }]);
    });

    it("GET /media/search?types=BOOK renvoie des livres normalisés", async () => {
      const response = await request(app.getHttpServer())
        .get("/media/search")
        .query({ q: "Dune", types: "BOOK" });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        type: "BOOK",
        title: "Dune",
        year: 1965,
        externalRef: { provider: "books", externalId: "g1" },
      });
    });

    it("n'interroge pas Open Library quand Google Books répond", async () => {
      await request(app.getHttpServer()).get("/media/search").query({ q: "Dune", types: "BOOK" });

      const urls = vi.mocked(http.getJson).mock.calls.map((call) => call[0]);
      expect(urls.every((url) => url.includes("books.test"))).toBe(true);
    });
  });

  it("regroupe les tomes d'une même œuvre en une seule entrée", async () => {
    await app?.close();
    const tome = (n: number) => ({
      id: `op${n}`,
      volumeInfo: {
        title: `One Piece - Édition originale - Tome ${n}`,
        authors: ["Eiichiro Oda"],
        seriesInfo: {
          bookDisplayNumber: String(n),
          volumeSeries: [{ seriesId: "OP", seriesBookType: "COLLECTED_EDITION" }],
        },
      },
    });
    app = await build([
      {
        pattern: /books\.test/,
        payload: { totalItems: 3, items: [tome(2), tome(1), tome(3)] },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get("/media/search")
      .query({ q: "One Piece", types: "BOOK" });

    expect(response.status).toBe(200);
    // Les trois tomes ne polluent plus la liste : ils vivent dans leur œuvre…
    expect(response.body.items).toEqual([]);
    expect(response.body.collections).toHaveLength(1);
    const collection = response.body.collections[0];
    expect(collection).toMatchObject({
      title: "One Piece - Édition originale",
      volumeCount: 3,
      authors: ["Eiichiro Oda"],
    });
    // …triés par rang, quel que soit l'ordre de réponse du fournisseur.
    expect(collection.volumes.map((v: { title: string }) => v.title)).toEqual([
      "One Piece - Édition originale - Tome 1",
      "One Piece - Édition originale - Tome 2",
      "One Piece - Édition originale - Tome 3",
    ]);
  });

  it("n'expose aucune œuvre quand les résultats ne forment pas de série", async () => {
    await app?.close();
    app = await build([
      { pattern: /books\.test/, payload: { totalItems: 1, items: [googleVolume] } },
    ]);

    const response = await request(app.getHttpServer())
      .get("/media/search")
      .query({ q: "Dune", types: "BOOK" });

    expect(response.status).toBe(200);
    expect(response.body.collections).toBeUndefined();
  });

  it("bascule sur Open Library quand Google Books est indisponible", async () => {
    await app?.close();
    app = await build([{ pattern: /openlibrary\.test/, payload: openLibrarySearch }]);

    const response = await request(app.getHttpServer())
      .get("/media/search")
      .query({ q: "Dune", types: "BOOK" });

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toMatchObject({ type: "BOOK", title: "Dune" });
  });

  it("fusionne les deux sources sur la fiche détaillée", async () => {
    await app?.close();
    app = await build([
      { pattern: /books\.test\/v1\/volumes\/g1/, payload: googleVolume },
      { pattern: /openlibrary\.test/, payload: openLibrarySearch },
    ]);

    const response = await request(app.getHttpServer()).get("/media/BOOK/g1");

    expect(response.status).toBe(200);
    // Google Books reste prioritaire sur ce qu'il connaît…
    expect(response.body).toMatchObject({ type: "BOOK", title: "Dune" });
    expect(response.body.book).toMatchObject({
      pageCount: 412,
      identifiers: { googleBooksId: "g1" },
      sources: ["google-books", "open-library"],
    });
    // …et Open Library comble description et ISBN manquants.
    expect(response.body.overview).toBe("Sur la planète Arrakis.");
    expect(response.body.book.identifiers.isbn13).toBe("9782221252055");
  });

  describe("livres communautaires", () => {
    it("les fait remonter en tête des résultats", async () => {
      await app?.close();
      app = await build([
        { pattern: /books\.test/, payload: { totalItems: 1, items: [googleVolume] } },
      ]);
      community.search.mockResolvedValue([communityBook]);

      const response = await request(app.getHttpServer())
        .get("/media/search")
        .query({ q: "Ardèche", types: "BOOK" });

      expect(response.status).toBe(200);
      // Saisi précisément parce qu'aucun catalogue ne le connaissait : le cacher derrière
      // eux serait absurde.
      expect(response.body.items[0]).toMatchObject({
        title: "Carnet de voyage en Ardèche",
        externalRef: { provider: "books", externalId: "own-1" },
      });
    });

    it("sert leur fiche sans appeler le réseau", async () => {
      await app?.close();
      app = await build([]);
      community.findByExternalId.mockResolvedValue(communityBook);

      const response = await request(app.getHttpServer()).get("/media/BOOK/own-1");

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Carnet de voyage en Ardèche");
      // Une lecture en base coûte bien moins qu'un appel distant : on n'en fait aucun.
      expect(http.getJson).not.toHaveBeenCalled();
    });

    it("répondent même quand les deux catalogues distants sont en panne", async () => {
      await app?.close();
      app = await build([]);
      community.search.mockResolvedValue([communityBook]);

      const response = await request(app.getHttpServer())
        .get("/media/search")
        .query({ q: "Ardèche", types: "BOOK" });

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
    });
  });

  it("renvoie 404 quand aucune source ne connaît le livre", async () => {
    await app?.close();
    app = await build([]);

    const response = await request(app.getHttpServer()).get("/media/BOOK/inconnu");
    expect(response.status).toBe(404);
  });
});
