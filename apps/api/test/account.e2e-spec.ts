import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PASSWORD_HASHER } from "../src/modules/authentication/domain/ports/password-hasher";
import { SESSION_STORE } from "../src/modules/authentication/domain/ports/session-store";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { ACCOUNT_GATEWAY, type AccountExport } from "../src/modules/account/domain/account-gateway";
import { DeleteAccountUseCase } from "../src/modules/account/application/delete-account.usecase";
import { ExportAccountUseCase } from "../src/modules/account/application/export-account.usecase";
import { AccountController } from "../src/modules/account/presentation/account.controller";
import { Email, USER_REPOSITORY, User } from "../src/modules/user/domain";

const user = User.rehydrate("u1", {
  email: Email.create("a@b.com"),
  passwordHash: "h:secret",
  displayName: "A",
});

const exportPayload: AccountExport = {
  exportedAt: "2026-01-01T00:00:00.000Z",
  account: { id: "u1", email: "a@b.com", displayName: "A", createdAt: "2026-01-01T00:00:00.000Z" },
  library: [],
  lists: [],
  reviews: [],
  episodeReviews: [],
};

describe("Account (e2e)", () => {
  let app: INestApplication;
  const gateway = { export: vi.fn().mockResolvedValue(exportPayload), delete: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        ExportAccountUseCase,
        DeleteAccountUseCase,
        AuthGuard,
        { provide: ACCOUNT_GATEWAY, useValue: gateway },
        { provide: USER_REPOSITORY, useValue: { findById: async () => user } },
        {
          provide: PASSWORD_HASHER,
          useValue: { verify: async (plain: string, hash: string) => hash === `h:${plain}` },
        },
        { provide: SESSION_STORE, useValue: { resolve: async () => "u1" } },
        { provide: ConfigService, useValue: { get: () => "test" } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = { authorization: "Bearer tok" };

  it("exporte les données en pièce jointe JSON", async () => {
    const res = await request(server()).get("/account/export").set(auth);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain(".json");
    expect(res.body.account.email).toBe("a@b.com");
  });

  it("refuse la suppression sans authentification (401)", async () => {
    const res = await request(server()).delete("/account").send({ password: "secret" });
    expect(res.status).toBe(401);
  });

  it("refuse la suppression avec un mauvais mot de passe (400)", async () => {
    const res = await request(server()).delete("/account").set(auth).send({ password: "wrong" });
    expect(res.status).toBe(400);
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it("supprime le compte avec le bon mot de passe (204) et efface le cookie", async () => {
    const res = await request(server()).delete("/account").set(auth).send({ password: "secret" });
    expect(res.status).toBe(204);
    expect(gateway.delete).toHaveBeenCalledWith("u1");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => /otium_session=;/.test(c))).toBe(true);
  });
});
