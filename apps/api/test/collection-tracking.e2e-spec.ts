import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { GetCollectionTrackingUseCase } from "../src/modules/library/application/get-collection-tracking.usecase";
import {
  type CollectionRecord,
  LIBRARY_REPOSITORY,
  type WatchStatus,
} from "../src/modules/library/domain";
import { LibraryController } from "../src/modules/library/presentation/library.controller";
import { USER_REPOSITORY } from "../src/modules/user/domain";
import { User } from "../src/modules/user/domain/entities/user.entity";
import { Email } from "../src/modules/user/domain/value-objects/email";

const TOKEN = "tok";
const USER_ID = "user-1";

function volume(position: number, status: WatchStatus | null) {
  return {
    itemId: status === null ? null : `item-${position}`,
    mediaId: `media-${position}`,
    externalId: `g${position}`,
    title: `One Piece - Tome ${position}`,
    posterUrl: null,
    position,
    status,
  };
}

/** Œuvre de quatre tomes : deux lus, un en cours, un non possédé. */
const record: CollectionRecord = {
  provider: "books",
  externalId: "series:google-books:OP",
  title: "One Piece",
  method: "PROVIDER_SERIES",
  volumes: [volume(1, "COMPLETED"), volume(2, "COMPLETED"), volume(3, "IN_PROGRESS"), volume(4, null)],
};

const notUsed = { execute: async () => undefined };

describe("Collection tracking (e2e)", () => {
  let app: INestApplication;
  let found: CollectionRecord | null;

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set("authorization", `Bearer ${TOKEN}`);

  beforeEach(async () => {
    await app?.close();
    found = record;
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [LibraryController],
      providers: [
        GetCollectionTrackingUseCase,
        AuthGuard,
        { provide: LIBRARY_REPOSITORY, useValue: { findCollection: async () => found } },
        {
          provide: SESSION_STORE,
          useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null) },
        },
        {
          provide: USER_REPOSITORY,
          useValue: { findById: async (id: string) => (id === USER_ID ? user : null) },
        },
      ],
    })
      // Les autres use cases du contrôleur ne sont pas sollicités ici : on les neutralise
      // en bloc plutôt que de les énumérer, ce qui rendrait ce test sensible à tout ajout.
      .useMocker(() => notUsed)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("renvoie l'œuvre, ses volumes et la synthèse d'avancement", async () => {
    const response = await get("/library/collections/books/series%3Agoogle-books%3AOP");

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("One Piece");
    expect(response.body.volumes).toHaveLength(4);
    expect(response.body.progress).toMatchObject({
      totalVolumes: 4,
      ownedVolumes: 3,
      readVolumes: 2,
      percent: 50,
    });
  });

  it("désigne le dernier tome lu et le prochain à lire", async () => {
    const response = await get("/library/collections/books/series%3Agoogle-books%3AOP");

    expect(response.body.progress.lastRead.title).toBe("One Piece - Tome 2");
    // Le tome 3 est commencé : reprendre prime sur avancer.
    expect(response.body.progress.nextSuggested.title).toBe("One Piece - Tome 3");
  });

  it("conserve la couverture et l'identifiant des volumes dans la synthèse", async () => {
    const response = await get("/library/collections/books/series%3Agoogle-books%3AOP");

    // Le domaine restitue les volumes enrichis : la fiche peut lier directement le tome.
    expect(response.body.progress.nextSuggested).toMatchObject({ externalId: "g3" });
  });

  it("renvoie 404 pour une œuvre inconnue", async () => {
    found = null;
    const response = await get("/library/collections/books/inconnue");
    expect(response.status).toBe(404);
  });

  it("exige une session", async () => {
    const response = await request(app.getHttpServer()).get(
      "/library/collections/books/series%3Agoogle-books%3AOP",
    );
    expect(response.status).toBe(401);
  });
});
