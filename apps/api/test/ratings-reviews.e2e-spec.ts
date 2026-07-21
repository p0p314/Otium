import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { MEDIA_CATALOG_REGISTRY, SERIES_CATALOG_PROVIDER } from "../src/modules/media/domain";
import { singleProviderRegistry } from "./support/catalog-registry.fake";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import {
  LIBRARY_REPOSITORY,
  REVIEW_REPOSITORY,
  SERIES_TRACKING_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  type Review,
  type ReviewRepository,
} from "../src/modules/library/domain";
import { GetLibraryUseCase } from "../src/modules/library/application/get-library.usecase";
import { GetLibraryItemUseCase } from "../src/modules/library/application/get-library-item.usecase";
import { AddMediaToLibraryUseCase } from "../src/modules/library/application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "../src/modules/library/application/get-home-dashboard.usecase";
import { GetCollectionTrackingUseCase } from "../src/modules/library/application/get-collection-tracking.usecase";
import { GetUpcomingUseCase } from "../src/modules/library/application/get-upcoming.usecase";
import { RefreshTrackedSeriesUseCase } from "../src/modules/library/application/refresh-tracked-series.usecase";
import { RemoveFromLibraryUseCase } from "../src/modules/library/application/remove-from-library.usecase";
import { SetWatchStatusUseCase } from "../src/modules/library/application/set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "../src/modules/library/application/toggle-favorite.usecase";
import { RateMediaUseCase } from "../src/modules/library/application/rate-media.usecase";
import {
  DeleteReviewUseCase,
  GetReviewUseCase,
  SaveReviewUseCase,
} from "../src/modules/library/application/review.usecases";
import {
  SetConsumptionDatesUseCase,
  UpdateProgressUseCase,
} from "../src/modules/library/application/update-progress.usecase";
import { LibraryController } from "../src/modules/library/presentation/library.controller";
import { ReviewController } from "../src/modules/library/presentation/review.controller";

const TOKEN = "tok";
const USER_ID = "user-1";
const ITEM_ID = "item-1";

const baseItem: LibraryItem = {
  id: ITEM_ID,
  media: {
    externalRef: { provider: "tmdb", externalId: "1" },
    type: "MOVIE",
    title: "Dune",
    year: 2021,
    posterUrl: null,
  },
  status: "PLANNED",
  rating: null,
  isFavorite: false,
  addedAt: new Date(),
  lastActivityAt: new Date(),
  startedAt: null,
  finishedAt: null,
  progress: null,
};

class FakeLibraryRepo implements LibraryRepository {
  private item = { ...baseItem };
  async add(): Promise<LibraryItem> {
    return this.item;
  }
  async saveProgress(): Promise<LibraryItem> {
    throw new Error("non utilisé dans ce test");
  }
  async setConsumptionDates(): Promise<LibraryItem> {
    throw new Error("non utilisé dans ce test");
  }
  async findCollection(): Promise<null> {
    return null;
  }
  async findByUser(): Promise<LibraryItem[]> {
    return [this.item];
  }
  async findItem(userId: string, itemId: string): Promise<LibraryItem | null> {
    return userId === USER_ID && itemId === ITEM_ID ? this.item : null;
  }
  async remove(): Promise<void> {}
  async setFavorite(): Promise<LibraryItem> {
    return this.item;
  }
  async setStatus(_u: string, _i: string, status: LibraryItem["status"]): Promise<LibraryItem> {
    this.item = { ...this.item, status };
    return this.item;
  }
  async setRating(_u: string, _i: string, rating: number | null): Promise<LibraryItem> {
    this.item = { ...this.item, rating };
    return this.item;
  }
  async getMediaId(userId: string, itemId: string): Promise<string | null> {
    return userId === USER_ID && itemId === ITEM_ID ? "media-1" : null;
  }
  async backfillMediaMetadata(): Promise<void> {}
  async listUpcomingMovies(): Promise<[]> {
    return [];
  }
}

class FakeReviewRepo implements ReviewRepository {
  private store = new Map<string, Review>();
  async get(userId: string, mediaId: string): Promise<Review | null> {
    return this.store.get(`${userId}:${mediaId}`) ?? null;
  }
  async save(userId: string, mediaId: string, body: string): Promise<Review> {
    const review = { body, updatedAt: new Date() };
    this.store.set(`${userId}:${mediaId}`, review);
    return review;
  }
  async delete(userId: string, mediaId: string): Promise<void> {
    this.store.delete(`${userId}:${mediaId}`);
  }
}

describe("Ratings & reviews (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [LibraryController, ReviewController],
      providers: [
        GetLibraryUseCase,
        GetLibraryItemUseCase,
        AddMediaToLibraryUseCase,
        RemoveFromLibraryUseCase,
        ToggleFavoriteUseCase,
        RateMediaUseCase,
        UpdateProgressUseCase,
        SetConsumptionDatesUseCase,
        SetWatchStatusUseCase,
        GetHomeDashboardUseCase,
        GetUpcomingUseCase,
        GetCollectionTrackingUseCase,
        RefreshTrackedSeriesUseCase,
        GetReviewUseCase,
        SaveReviewUseCase,
        DeleteReviewUseCase,
        AuthGuard,
        { provide: LIBRARY_REPOSITORY, useClass: FakeLibraryRepo },
        {
          provide: SERIES_TRACKING_REPOSITORY,
          useValue: {
            listTrackedSeries: async () => [],
            getContext: async () => null,
            listSeriesNeedingSync: async () => [],
            markEpisodesSynced: async () => undefined,
          },
        },
        // Catalogue indisponible : vérifie que l'ajout/la notation restent fonctionnels
        // malgré l'échec de l'enrichissement (dégradation gracieuse).
        {
          provide: MEDIA_CATALOG_REGISTRY,
          useValue: singleProviderRegistry({
            name: "fake",
            search: async () => {
              throw new Error("no details");
            },
            getMediaDetails: async () => {
              throw new Error("no details");
            },
          }),
        },
        {
          provide: SERIES_CATALOG_PROVIDER,
          useValue: {
            getSeriesDetails: async () => {
              throw new Error("no details");
            },
          },
        },
        { provide: REVIEW_REPOSITORY, useClass: FakeReviewRepo },
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

  it("note un média puis la reflète dans le détail", async () => {
    const rate = await auth(request(server()).patch(`/library/${ITEM_ID}/rating`)).send({
      rating: 8,
    });
    expect(rate.status).toBe(200);
    expect(rate.body.rating).toBe(8);

    const detail = await auth(request(server()).get(`/library/${ITEM_ID}`));
    expect(detail.body.rating).toBe(8);
  });

  it("note 0 efface la note", async () => {
    const rate = await auth(request(server()).patch(`/library/${ITEM_ID}/rating`)).send({
      rating: 0,
    });
    expect(rate.body.rating).toBeNull();
  });

  it("écrit, lit puis supprime un avis", async () => {
    expect((await auth(request(server()).get(`/library/${ITEM_ID}/review`))).body.review).toBeNull();

    const put = await auth(request(server()).put(`/library/${ITEM_ID}/review`)).send({
      body: "Chef-d'œuvre.",
    });
    expect(put.status).toBe(200);
    expect(put.body.body).toBe("Chef-d'œuvre.");

    expect((await auth(request(server()).get(`/library/${ITEM_ID}/review`))).body.review.body).toBe(
      "Chef-d'œuvre.",
    );

    expect((await auth(request(server()).delete(`/library/${ITEM_ID}/review`))).status).toBe(204);
    expect(
      (await auth(request(server()).get(`/library/${ITEM_ID}/review`))).body.review,
    ).toBeNull();
  });

  it("rejette un avis vide (400)", async () => {
    const res = await auth(request(server()).put(`/library/${ITEM_ID}/review`)).send({ body: "" });
    expect(res.status).toBe(400);
  });
});
