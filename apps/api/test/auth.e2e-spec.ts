import { randomUUID } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { Email, USER_REPOSITORY, User, type UserRepository } from "../src/modules/user/domain";
import { PASSWORD_HASHER } from "../src/modules/authentication/domain/ports/password-hasher";
import { SESSION_STORE, type Session } from "../src/modules/authentication/domain/ports/session-store";
import { RegisterUserUseCase } from "../src/modules/authentication/application/register-user.usecase";
import { LoginUserUseCase } from "../src/modules/authentication/application/login-user.usecase";
import { AuthGuard } from "../src/modules/authentication/presentation/auth.guard";
import { AuthController } from "../src/modules/authentication/presentation/auth.controller";

class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.email.equals(email)) return user;
    }
    return null;
  }
  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async existsByEmail(email: Email): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }
  async create(user: User): Promise<User> {
    const id = randomUUID();
    const created = User.rehydrate(id, {
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
    });
    this.byId.set(id, created);
    return created;
  }
}

const fakeHasher = {
  hash: async (plain: string) => `h:${plain}`,
  verify: async (plain: string, hash: string) => hash === `h:${plain}`,
};

class InMemorySessionStore {
  private readonly tokens = new Map<string, string>();
  async create(userId: string): Promise<Session> {
    const token = randomUUID();
    this.tokens.set(token, userId);
    return { token, userId, expiresAt: new Date(Date.now() + 3600_000) };
  }
  async resolve(token: string): Promise<string | null> {
    return this.tokens.get(token) ?? null;
  }
  async revoke(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}

describe("Authentication (e2e)", () => {
  let app: INestApplication;
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionStore();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RegisterUserUseCase,
        LoginUserUseCase,
        AuthGuard,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: PASSWORD_HASHER, useValue: fakeHasher },
        { provide: SESSION_STORE, useValue: sessions },
        { provide: EVENT_PUBLISHER, useValue: { publish: async () => undefined, publishAll: async () => undefined } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const creds = { email: "alice@example.com", password: "supersecret", displayName: "Alice" };

  it("inscription → renvoie l'utilisateur et un jeton (201)", async () => {
    const res = await request(server()).post("/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alice@example.com", displayName: "Alice" });
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("e-mail déjà utilisé → 409", async () => {
    const res = await request(server()).post("/auth/register").send(creds);
    expect(res.status).toBe(409);
  });

  it("mot de passe trop court → 400 (validation Zod)", async () => {
    const res = await request(server())
      .post("/auth/register")
      .send({ email: "x@y.com", password: "court", displayName: "X" });
    expect(res.status).toBe(400);
  });

  it("connexion valide → 200 + jeton ; /me renvoie l'utilisateur", async () => {
    const login = await request(server())
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "supersecret" });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    const me = await request(server()).get("/auth/me").set("authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("alice@example.com");
  });

  it("mauvais mot de passe → 401", async () => {
    const res = await request(server())
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "mauvais-mdp" });
    expect(res.status).toBe(401);
  });

  it("/me sans jeton → 401", async () => {
    expect((await request(server()).get("/auth/me")).status).toBe(401);
  });

  it("déconnexion révoque la session (204) puis /me → 401", async () => {
    const login = await request(server())
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "supersecret" });
    const token = login.body.token as string;

    expect((await request(server()).post("/auth/logout").set("authorization", `Bearer ${token}`)).status).toBe(204);
    expect((await request(server()).get("/auth/me").set("authorization", `Bearer ${token}`)).status).toBe(401);
  });
});
