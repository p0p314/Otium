import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ImportReport } from "@otium/types";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { GetImportJobUseCase } from "../src/modules/import/application/get-import-job.usecase";
import type { ImportArchiveInput } from "../src/modules/import/application/import-archive.usecase";
import { ImportArchiveUseCase } from "../src/modules/import/application/import-archive.usecase";
import { IMPORT_JOB_STORE } from "../src/modules/import/application/ports/import-job-store";
import { ResolveImportUseCase } from "../src/modules/import/application/resolve-import.usecase";
import { StartImportUseCase } from "../src/modules/import/application/start-import.usecase";
import { InMemoryImportJobStore } from "../src/modules/import/infrastructure/in-memory-import-job-store";
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
  // Import réel (StartImport + GetImportJob + store en mémoire), rapprochement mocké.
  const execute = vi.fn(async ({ onProgress }: ImportArchiveInput) => {
    onProgress?.({ total: 3, processed: 3, imported: 3, episodesMarked: 5, pending: 0, unmatched: 0 });
    return report;
  });

  beforeAll(async () => {
    const user = User.rehydrate(USER_ID, {
      email: Email.create("a@b.com"),
      passwordHash: "x",
      displayName: "Alice",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        StartImportUseCase,
        GetImportJobUseCase,
        { provide: IMPORT_JOB_STORE, useClass: InMemoryImportJobStore },
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

  it("lance l'import (jobId), puis le job aboutit au rapport via /jobs/:id", async () => {
    const start = await request(server())
      .post("/import/tvtime")
      .set("authorization", `Bearer ${TOKEN}`)
      .attach("file", Buffer.from("PK fake zip"), "tvtime.zip");

    expect(start.status).toBe(201);
    expect(typeof start.body.jobId).toBe("string");
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, format: "tvtime" }),
    );

    // Le traitement est en tâche de fond : on interroge jusqu'à l'achèvement.
    const jobId = start.body.jobId as string;
    let state: { status: string; report: ImportReport | null } = { status: "running", report: null };
    for (let i = 0; i < 20 && state.status === "running"; i++) {
      const res = await request(server())
        .get(`/import/jobs/${jobId}`)
        .set("authorization", `Bearer ${TOKEN}`);
      expect(res.status).toBe(200);
      state = res.body;
    }

    expect(state.status).toBe("done");
    expect(state.report?.episodesMarked).toBe(5);
    expect(state.report?.movies.imported).toBe(2);
  });

  it("renvoie 404 pour un job inconnu", async () => {
    const res = await request(server())
      .get("/import/jobs/inconnu")
      .set("authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(404);
  });
});
