import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ViewingStats } from "@otium/types";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { GetViewingStatsUseCase } from "../src/modules/stats/application/get-viewing-stats.usecase";
import { StatsController } from "../src/modules/stats/presentation/stats.controller";

const TOKEN = "tok";
const USER_ID = "user-1";

const stats: ViewingStats = {
  totals: {
    moviesCompleted: 4,
    seriesCompleted: 2,
    seriesInProgress: 1,
    seriesDropped: 0,
    episodesWatched: 37,
    totalMinutes: 2100,
    movieMinutes: 600,
    seriesMinutes: 1500,
    averageRating: 7.8,
  },
  breakdown: { movies: 5, series: 3 },
  topGenres: [{ label: "Drame", count: 6 }],
  activityByMonth: [{ month: "2026-07", minutes: 300 }],
  activityByYear: [{ year: 2026, minutes: 2100 }],
  records: {
    busiestMonth: { month: "2026-07", minutes: 300 },
    longestSeries: { title: "Chernobyl", episodes: 5 },
  },
};

describe("Stats (e2e)", () => {
  let app: INestApplication;
  const execute = vi.fn(async () => stats);

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: GetViewingStatsUseCase, useValue: { execute } },
        AuthGuard,
        { provide: SESSION_STORE, useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null) } },
        { provide: USER_REPOSITORY, useValue: { findById: async (id: string) => (id === USER_ID ? user : null) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it("refuse l'accès sans session (401)", async () => {
    expect((await request(server()).get("/stats")).status).toBe(401);
  });

  it("renvoie le tableau de bord de statistiques", async () => {
    const res = await request(server()).get("/stats").set("authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.totals.totalMinutes).toBe(2100);
    expect(res.body.records.longestSeries.title).toBe("Chernobyl");
    expect(execute).toHaveBeenCalledWith(USER_ID);
  });
});
