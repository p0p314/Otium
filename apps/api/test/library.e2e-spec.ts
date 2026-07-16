import { randomUUID } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { MEDIA_CATALOG_PROVIDER } from "../src/modules/media/domain";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  type MediaDescriptor,
  SERIES_TRACKING_REPOSITORY,
} from "../src/modules/library/domain";
import { AddMediaToLibraryUseCase } from "../src/modules/library/application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "../src/modules/library/application/get-home-dashboard.usecase";
import { GetUpcomingUseCase } from "../src/modules/library/application/get-upcoming.usecase";
import { GetLibraryUseCase } from "../src/modules/library/application/get-library.usecase";
import { RemoveFromLibraryUseCase } from "../src/modules/library/application/remove-from-library.usecase";
import { SetWatchStatusUseCase } from "../src/modules/library/application/set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "../src/modules/library/application/toggle-favorite.usecase";
import { GetLibraryItemUseCase } from "../src/modules/library/application/get-library-item.usecase";
import { RateMediaUseCase } from "../src/modules/library/application/rate-media.usecase";
import { LibraryController } from "../src/modules/library/presentation/library.controller";

class InMemoryLibraryRepository implements LibraryRepository {
  private readonly items = new Map<string, LibraryItem & { userId: string }>();

  async add(userId: string, media: MediaDescriptor): Promise<LibraryItem> {
    for (const item of this.items.values()) {
      if (
        item.userId === userId &&
        item.media.externalRef.provider === media.externalRef.provider &&
        item.media.externalRef.externalId === media.externalRef.externalId
      ) {
        return item;
      }
    }
    const item = {
      id: randomUUID(),
      userId,
      media,
      status: "PLANNED" as const,
      rating: null,
      isFavorite: false,
      addedAt: new Date(),
    };
    this.items.set(item.id, item);
    return item;
  }
  async findByUser(userId: string): Promise<LibraryItem[]> {
    return [...this.items.values()].filter((i) => i.userId === userId);
  }
  async findItem(userId: string, itemId: string): Promise<LibraryItem | null> {
    const item = this.items.get(itemId);
    return item && item.userId === userId ? item : null;
  }
  async remove(userId: string, itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (item?.userId === userId) this.items.delete(itemId);
  }
  async setFavorite(_userId: string, itemId: string, isFavorite: boolean): Promise<LibraryItem> {
    const item = this.items.get(itemId)!;
    const updated = { ...item, isFavorite };
    this.items.set(itemId, updated);
    return updated;
  }
  async setStatus(
    _userId: string,
    itemId: string,
    status: LibraryItem["status"],
  ): Promise<LibraryItem> {
    const item = this.items.get(itemId)!;
    const updated = { ...item, status };
    this.items.set(itemId, updated);
    return updated;
  }
  async setRating(_userId: string, itemId: string, rating: number | null): Promise<LibraryItem> {
    const item = this.items.get(itemId)!;
    const updated = { ...item, rating };
    this.items.set(itemId, updated);
    return updated;
  }
  async getMediaId(userId: string, itemId: string): Promise<string | null> {
    const item = this.items.get(itemId);
    return item && item.userId === userId ? `media-${item.media.externalRef.externalId}` : null;
  }
  async backfillMediaMetadata(): Promise<void> {}
  async listUpcomingMovies(): Promise<[]> {
    return [];
  }
}

const TOKEN = "test-token";
const USER_ID = "user-1";
const media = {
  externalRef: { provider: "tmdb", externalId: "438631" },
  type: "MOVIE" as const,
  title: "Dune",
  year: 2021,
  posterUrl: null,
  genres: [],
};

describe("Library (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("alice@example.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        GetLibraryUseCase,
        GetLibraryItemUseCase,
        AddMediaToLibraryUseCase,
        RemoveFromLibraryUseCase,
        ToggleFavoriteUseCase,
        RateMediaUseCase,
        SetWatchStatusUseCase,
        GetHomeDashboardUseCase,
        GetUpcomingUseCase,
        AuthGuard,
        { provide: LIBRARY_REPOSITORY, useClass: InMemoryLibraryRepository },
        {
          provide: SERIES_TRACKING_REPOSITORY,
          useValue: { listTrackedSeries: async () => [], getContext: async () => null },
        },
        {
          provide: MEDIA_CATALOG_PROVIDER,
          useValue: {
            getMediaDetails: async () => {
              throw new Error("no details");
            },
          },
        },
        { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined, publishAll: async () => undefined } },
        {
          provide: SESSION_STORE,
          useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null), create: async () => ({}), revoke: async () => undefined },
        },
        {
          provide: USER_REPOSITORY,
          useValue: { findById: async (id: string) => (id === USER_ID ? user : null) },
        },
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

  it("refuse l'accès sans jeton (401)", async () => {
    expect((await request(server()).get("/library")).status).toBe(401);
  });

  it("ajoute un média (201) puis le liste", async () => {
    const add = await auth(request(server()).post("/library")).send({ media });
    expect(add.status).toBe(201);
    expect(add.body.media.title).toBe("Dune");

    const list = await auth(request(server()).get("/library"));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("expose le tableau de bord et l'agenda « à venir » (structure cloisonnée par type)", async () => {
    const home = await auth(request(server()).get("/library/home"));
    expect(home.status).toBe(200);
    expect(home.body).toEqual({ series: { toResume: [], toStart: [] } });

    const upcoming = await auth(request(server()).get("/library/upcoming"));
    expect(upcoming.status).toBe(200);
    expect(upcoming.body).toEqual({ series: [], movies: [] });
  });

  it("bascule le favori puis retire l'élément", async () => {
    const list = await auth(request(server()).get("/library"));
    const itemId = list.body[0].id as string;

    const fav = await auth(request(server()).patch(`/library/${itemId}/favorite`)).send({
      isFavorite: true,
    });
    expect(fav.status).toBe(200);
    expect(fav.body.isFavorite).toBe(true);

    expect((await auth(request(server()).delete(`/library/${itemId}`))).status).toBe(204);
    expect((await auth(request(server()).get("/library"))).body).toHaveLength(0);
  });
});
