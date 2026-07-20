import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GetEpisodeDetailsUseCase } from "../src/modules/media/application/queries/get-episode-details.usecase";
import { GetMediaDetailsUseCase } from "../src/modules/media/application/queries/get-media-details.usecase";
import { GetTrendingMediaUseCase } from "../src/modules/media/application/queries/get-trending-media.usecase";
import { SearchMediaUseCase } from "../src/modules/media/application/queries/search-media.usecase";
import { MediaController } from "../src/modules/media/presentation/media.controller";

const catalogResult = {
  items: [
    {
      externalRef: { provider: "tmdb", externalId: "1" },
      type: "MOVIE" as const,
      title: "Dune",
      year: 2021,
      posterUrl: "https://img/w342/d.jpg",
      genres: [],
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe("MediaController (e2e)", () => {
  let app: INestApplication;
  const execute = vi.fn(async () => catalogResult);
  const trendingExecute = vi.fn(async () => catalogResult);
  const detailsResult = {
    externalRef: { provider: "tmdb", externalId: "438631" },
    type: "MOVIE" as const,
    title: "Dune",
    originalTitle: "Dune",
    posterUrl: null,
    backdropUrl: null,
    overview: "…",
    genres: [],
    rating: 7.8,
    voteCount: 1200,
    releaseDate: "2021-09-15",
    year: 2021,
    status: "Released",
    runtimeMinutes: 155,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    cast: [],
    directors: ["Denis Villeneuve"],
    productionCompanies: [],
    watchProviders: [],
  };
  const detailsExecute = vi.fn(async () => detailsResult);
  const episodeResult = {
    seasonNumber: 1,
    number: 3,
    title: "Le long chemin",
    overview: "…",
    airDate: "2014-04-02",
    runtimeMinutes: 43,
    stillUrl: null,
    rating: 8.4,
    cast: [{ name: "Actrice A", character: "Héroïne", profileUrl: null }],
  };
  const episodeExecute = vi.fn(async () => episodeResult);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: SearchMediaUseCase, useValue: { execute } },
        { provide: GetTrendingMediaUseCase, useValue: { execute: trendingExecute } },
        { provide: GetMediaDetailsUseCase, useValue: { execute: detailsExecute } },
        { provide: GetEpisodeDetailsUseCase, useValue: { execute: episodeExecute } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /media/search renvoie les résultats mappés", async () => {
    const response = await request(app.getHttpServer()).get("/media/search").query({ q: "Dune" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].externalRef).toEqual({ provider: "tmdb", externalId: "1" });
    expect(execute).toHaveBeenCalledWith({ q: "Dune", page: 1, pageSize: 20 });
  });

  it("GET /media/search sans q renvoie 400", async () => {
    const response = await request(app.getHttpServer()).get("/media/search");
    expect(response.status).toBe(400);
  });

  it("GET /media/trending renvoie les tendances mappées", async () => {
    const response = await request(app.getHttpServer())
      .get("/media/trending")
      .query({ type: "MOVIE" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(trendingExecute).toHaveBeenCalledWith({ type: "MOVIE", page: 1, pageSize: 20 });
  });

  it("GET /media/:type/:externalId renvoie la fiche détaillée", async () => {
    const response = await request(app.getHttpServer()).get("/media/MOVIE/438631");

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Dune");
    expect(response.body.directors).toEqual(["Denis Villeneuve"]);
    expect(detailsExecute).toHaveBeenCalledWith({ type: "MOVIE", externalId: "438631" });
  });

  it("GET /media/series/:id/season/:s/episode/:e renvoie la fiche épisode", async () => {
    const response = await request(app.getHttpServer()).get("/media/series/1399/season/1/episode/3");

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Le long chemin");
    expect(response.body.cast[0].name).toBe("Actrice A");
    expect(episodeExecute).toHaveBeenCalledWith({
      externalId: "1399",
      seasonNumber: 1,
      episodeNumber: 3,
    });
  });

  it("GET /media/:type/:externalId rejette un type inconnu (400)", async () => {
    // `BOOK` est désormais un type valide : on vérifie le rejet d'une valeur hors enum.
    const response = await request(app.getHttpServer()).get("/media/VINYL/1");
    expect(response.status).toBe(400);
  });
});
