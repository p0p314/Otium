import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ImportReport } from "@otium/types";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { ImportArchiveUseCase } from "../src/modules/import/application/import-archive.usecase";
import { ResolveImportUseCase } from "../src/modules/import/application/resolve-import.usecase";
import { ImportController } from "../src/modules/import/presentation/import.controller";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";

const TOKEN = "tok";
const USER_ID = "user-1";

const report: ImportReport = {
  source: "tvtime",
  movies: { parsed: 2, imported: 2, skipped: 0, pending: 0, unmatched: 0 },
  series: { parsed: 1, imported: 1, skipped: 0, pending: 0, unmatched: 0 },
  episodesMarked: 5,
  unmatchedSample: [],
  pending: [],
};

describe("Import (e2e)", () => {
  let app: INestApplication;
  const execute = vi.fn(async () => report);

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportArchiveUseCase, useValue: { execute } },
        { provide: ResolveImportUseCase, useValue: { execute: vi.fn() } },
        AuthGuard,
        {
          provide: SESSION_STORE,
          useValue: { resolve: async (t: string) => (t === TOKEN ? USER_ID : null) },
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

  it("refuse l'accès sans session (401)", async () => {
    expect((await request(server()).post("/import/tvtime")).status).toBe(401);
  });

  it("rejette l'absence de fichier (400)", async () => {
    const res = await request(server())
      .post("/import/tvtime")
      .set("authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(400);
  });

  it("importe l'archive et renvoie le rapport", async () => {
    const res = await request(server())
      .post("/import/tvtime")
      .set("authorization", `Bearer ${TOKEN}`)
      .attach("file", Buffer.from("PK fake zip"), "tvtime.zip");

    expect(res.status).toBe(201);
    expect(res.body.episodesMarked).toBe(5);
    expect(res.body.movies.imported).toBe(2);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, format: "tvtime" }),
    );
  });
});
