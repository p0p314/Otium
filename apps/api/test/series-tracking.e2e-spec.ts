import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { MEDIA_CATALOG_PROVIDER } from "../src/modules/media/domain";
import {
  SERIES_TRACKING_REPOSITORY,
  type PersistableSeason,
  type SeasonRef,
  type SeriesTrackingRepository,
  type TrackingContext,
  type WatchStatus,
} from "../src/modules/library/domain";
import { GetSeriesTrackingUseCase } from "../src/modules/library/application/get-series-tracking.usecase";
import { ToggleEpisodeWatchedUseCase } from "../src/modules/library/application/toggle-episode-watched.usecase";
import { SeriesTrackingController } from "../src/modules/library/presentation/series-tracking.controller";

const TOKEN = "tok";
const USER_ID = "user-1";
const ITEM_ID = "item-1";
const MEDIA_ID = "media-1";

class InMemorySeriesRepo implements SeriesTrackingRepository {
  private seasons: SeasonRef[] = [];
  private watched = new Set<string>();
  private status: WatchStatus = "PLANNED";

  async getContext(userId: string, itemId: string): Promise<TrackingContext | null> {
    if (userId !== USER_ID || itemId !== ITEM_ID) return null;
    return { mediaId: MEDIA_ID, externalId: "1", title: "Test Series", status: this.status };
  }
  async hasEpisodes(): Promise<boolean> {
    return this.seasons.length > 0;
  }
  async saveSeasons(_mediaId: string, seasons: readonly PersistableSeason[]): Promise<void> {
    this.seasons = seasons.map((s) => ({
      number: s.number,
      episodes: s.episodes.map((e) => ({
        id: `s${s.number}e${e.number}`,
        seasonNumber: s.number,
        number: e.number,
        title: e.title,
      })),
    }));
  }
  async getSeasons(): Promise<SeasonRef[]> {
    return this.seasons;
  }
  async getWatchedEpisodeIds(): Promise<Set<string>> {
    return new Set(this.watched);
  }
  async isEpisodeOfMedia(_mediaId: string, episodeId: string): Promise<boolean> {
    return this.seasons.some((s) => s.episodes.some((e) => e.id === episodeId));
  }
  async setEpisodeWatched(_itemId: string, episodeId: string, watched: boolean): Promise<void> {
    if (watched) this.watched.add(episodeId);
    else this.watched.delete(episodeId);
  }
  async setStatus(_itemId: string, status: WatchStatus): Promise<void> {
    this.status = status;
  }
  async listInProgress(): Promise<[]> {
    return [];
  }
}

const provider = {
  name: "fake",
  search: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
  getSeriesDetails: async () => ({
    seasons: [
      {
        number: 1,
        episodes: [
          { seasonNumber: 1, number: 1, title: "Pilote", runtimeMinutes: 42 },
          { seasonNumber: 1, number: 2, title: "Suite", runtimeMinutes: 42 },
        ],
      },
    ],
  }),
};

describe("Series tracking (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [SeriesTrackingController],
      providers: [
        GetSeriesTrackingUseCase,
        ToggleEpisodeWatchedUseCase,
        AuthGuard,
        { provide: SERIES_TRACKING_REPOSITORY, useClass: InMemorySeriesRepo },
        { provide: MEDIA_CATALOG_PROVIDER, useValue: provider },
        { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined, publishAll: async () => undefined } },
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
  const auth = (r: request.Test) => r.set("authorization", `Bearer ${TOKEN}`);

  it("refuse sans session (401)", async () => {
    expect((await request(server()).get(`/library/${ITEM_ID}/series`)).status).toBe(401);
  });

  it("charge le suivi depuis le fournisseur (reprise sur le 1er épisode)", async () => {
    const res = await auth(request(server()).get(`/library/${ITEM_ID}/series`));
    expect(res.status).toBe(200);
    expect(res.body.totalEpisodes).toBe(2);
    expect(res.body.watchedEpisodes).toBe(0);
    expect(res.body.nextEpisode.number).toBe(1);
    expect(res.body.status).toBe("PLANNED");
  });

  it("marque un épisode vu → progression et reprise avancent (IN_PROGRESS)", async () => {
    const res = await auth(request(server()).patch(`/library/${ITEM_ID}/episodes`)).send({
      episodeId: "s1e1",
      watched: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.watchedEpisodes).toBe(1);
    expect(res.body.nextEpisode.id).toBe("s1e2");
    expect(res.body.status).toBe("IN_PROGRESS");
  });

  it("marque le dernier épisode → série terminée (COMPLETED, plus de reprise)", async () => {
    const res = await auth(request(server()).patch(`/library/${ITEM_ID}/episodes`)).send({
      episodeId: "s1e2",
      watched: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.watchedEpisodes).toBe(2);
    expect(res.body.nextEpisode).toBeNull();
    expect(res.body.status).toBe("COMPLETED");
  });
});
