import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AddMediaToLibraryUseCase } from "../src/modules/library/application/add-media-to-library.usecase";
import { GetHomeDashboardUseCase } from "../src/modules/library/application/get-home-dashboard.usecase";
import { GetLibraryItemUseCase } from "../src/modules/library/application/get-library-item.usecase";
import { GetLibraryUseCase } from "../src/modules/library/application/get-library.usecase";
import { GetUpcomingUseCase } from "../src/modules/library/application/get-upcoming.usecase";
import { RateMediaUseCase } from "../src/modules/library/application/rate-media.usecase";
import { RemoveFromLibraryUseCase } from "../src/modules/library/application/remove-from-library.usecase";
import { SetWatchStatusUseCase } from "../src/modules/library/application/set-watch-status.usecase";
import { ToggleFavoriteUseCase } from "../src/modules/library/application/toggle-favorite.usecase";
import {
  SetConsumptionDatesUseCase,
  UpdateProgressUseCase,
} from "../src/modules/library/application/update-progress.usecase";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  type ProgressUpdate,
} from "../src/modules/library/domain";
import { LibraryController } from "../src/modules/library/presentation/library.controller";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { USER_REPOSITORY } from "../src/modules/user/domain";
import { Email } from "../src/modules/user/domain/value-objects/email";
import { User } from "../src/modules/user/domain/entities/user.entity";

const TOKEN = "tok";
const USER_ID = "user-1";
const ITEM_ID = "item-1";

/** Livre de 300 pages, jamais commencé. */
function baseItem(): LibraryItem {
  return {
    id: ITEM_ID,
    media: {
      externalRef: { provider: "books", externalId: "g1" },
      type: "BOOK",
      title: "Dune",
      year: 1965,
      posterUrl: null,
      book: {
        subtitle: null,
        authors: ["Frank Herbert"],
        description: null,
        pageCount: 300,
        publisher: null,
        publishedDate: "1965",
        language: "fr",
        categories: [],
        isbn10: null,
        isbn13: null,
        googleBooksId: "g1",
        openLibraryId: null,
        infoUrl: null,
        previewUrl: null,
        averageRating: null,
        ratingsCount: null,
        coverUrlLarge: null,
        sources: ["google-books"],
      },
    },
    status: "PLANNED",
    rating: null,
    isFavorite: false,
    addedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastActivityAt: new Date("2026-01-01T00:00:00.000Z"),
    startedAt: null,
    finishedAt: null,
    progress: null,
  };
}

/** Dépôt en mémoire : applique les mises à jour comme le ferait Prisma. */
class InMemoryLibraryRepo implements LibraryRepository {
  item: LibraryItem = baseItem();
  entries: ProgressUpdate["entry"][] = [];

  async findItem(userId: string, itemId: string): Promise<LibraryItem | null> {
    return userId === USER_ID && itemId === ITEM_ID ? this.item : null;
  }
  async saveProgress(_u: string, _i: string, update: ProgressUpdate): Promise<LibraryItem> {
    this.entries.push(update.entry);
    this.item = {
      ...this.item,
      progress: update.progress,
      status: update.status,
      startedAt: update.startedAt,
      finishedAt: update.finishedAt,
    };
    return this.item;
  }
  async setConsumptionDates(
    _u: string,
    _i: string,
    dates: { startedAt?: Date | null; finishedAt?: Date | null },
  ): Promise<LibraryItem> {
    this.item = {
      ...this.item,
      ...(dates.startedAt !== undefined ? { startedAt: dates.startedAt } : {}),
      ...(dates.finishedAt !== undefined ? { finishedAt: dates.finishedAt } : {}),
    };
    return this.item;
  }
  async add(): Promise<LibraryItem> {
    return this.item;
  }
  async findByUser(): Promise<LibraryItem[]> {
    return [this.item];
  }
  async remove(): Promise<void> {}
  async setFavorite(): Promise<LibraryItem> {
    return this.item;
  }
  async setStatus(): Promise<LibraryItem> {
    return this.item;
  }
  async setRating(): Promise<LibraryItem> {
    return this.item;
  }
  async getMediaId(): Promise<string | null> {
    return "media-1";
  }
  async backfillMediaMetadata(): Promise<void> {}
  async listUpcomingMovies(): Promise<[]> {
    return [];
  }
}

const notUsed = { execute: async () => undefined };

describe("Reading progress (e2e)", () => {
  let app: INestApplication;
  let repo: InMemoryLibraryRepo;

  const patch = (path: string, body: object) =>
    request(app.getHttpServer()).patch(path).set("authorization", `Bearer ${TOKEN}`).send(body);

  beforeEach(async () => {
    await app?.close();
    repo = new InMemoryLibraryRepo();
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        UpdateProgressUseCase,
        SetConsumptionDatesUseCase,
        AuthGuard,
        { provide: LIBRARY_REPOSITORY, useValue: repo },
        { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined } },
        { provide: SESSION_STORE, useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null) } },
        { provide: USER_REPOSITORY, useValue: { findById: async (id: string) => (id === USER_ID ? user : null) } },
        // Non sollicités par ces tests, mais requis par le contrôleur.
        ...[
          GetLibraryUseCase,
          GetLibraryItemUseCase,
          AddMediaToLibraryUseCase,
          RemoveFromLibraryUseCase,
          ToggleFavoriteUseCase,
          RateMediaUseCase,
          SetWatchStatusUseCase,
          GetHomeDashboardUseCase,
          GetUpcomingUseCase,
        ].map((provide) => ({ provide, useValue: notUsed })),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("enregistre une progression en pages et renvoie les valeurs calculées", async () => {
    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 75 });

    expect(response.status).toBe(200);
    expect(response.body.progress).toMatchObject({
      unit: "PAGES",
      value: 75,
      total: 300,
      percent: 25,
      remaining: 225,
    });
  });

  it("passe le livre « en cours » et date le début de lecture", async () => {
    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 10 });

    expect(response.body.status).toBe("IN_PROGRESS");
    expect(response.body.startedAt).not.toBeNull();
    expect(response.body.finishedAt).toBeNull();
  });

  it("passe le livre « terminé » à la dernière page", async () => {
    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 300 });

    expect(response.body.status).toBe("COMPLETED");
    expect(response.body.finishedAt).not.toBeNull();
  });

  it("borne une progression au-delà du nombre de pages connu", async () => {
    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 5000 });

    expect(response.body.progress.value).toBe(300);
    expect(response.body.progress.percent).toBe(100);
  });

  it("journalise le delta lu, et lui seul", async () => {
    await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 100 });
    await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 180 });
    // Retour en arrière (correction de saisie) : aucun avancement journalisé.
    await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 150 });

    expect(repo.entries).toEqual([
      { from: 0, to: 100, occurredAt: expect.any(Date) },
      { from: 100, to: 180, occurredAt: expect.any(Date) },
      null,
    ]);
  });

  it("accepte le suivi en pourcentage", async () => {
    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PERCENT", value: 60 });

    expect(response.body.progress).toMatchObject({ unit: "PERCENT", value: 60, percent: 60, remaining: 40 });
  });

  it("refuse une progression continue sur un film", async () => {
    repo.item = { ...repo.item, media: { ...repo.item.media, type: "MOVIE" } };

    const response = await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: 10 });

    expect(response.status).toBe(400);
  });

  it("rejette une saisie invalide (400)", async () => {
    expect((await patch(`/library/${ITEM_ID}/progress`, { unit: "PAGES", value: -1 })).status).toBe(400);
    expect((await patch(`/library/${ITEM_ID}/progress`, { unit: "CHAPTERS", value: 1 })).status).toBe(400);
  });

  it("renvoie 404 sur un élément qui n'appartient pas à l'utilisateur", async () => {
    const response = await patch("/library/autre/progress", { unit: "PAGES", value: 10 });
    expect(response.status).toBe(404);
  });

  it("enregistre les dates de lecture saisies à la main", async () => {
    const response = await patch(`/library/${ITEM_ID}/dates`, {
      startedAt: "2026-03-01T00:00:00.000Z",
      finishedAt: "2026-03-20T00:00:00.000Z",
    });

    expect(response.status).toBe(200);
    expect(response.body.startedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(response.body.finishedAt).toBe("2026-03-20T00:00:00.000Z");
  });

  it("exige une session", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/library/${ITEM_ID}/progress`)
      .send({ unit: "PAGES", value: 10 });
    expect(response.status).toBe(401);
  });
});
