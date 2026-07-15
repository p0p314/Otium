import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: SearchMediaUseCase, useValue: { execute } },
        { provide: GetTrendingMediaUseCase, useValue: { execute: trendingExecute } },
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
});
