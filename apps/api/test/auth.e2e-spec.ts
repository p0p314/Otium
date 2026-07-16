import { randomUUID } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_PUBLISHER } from "../src/shared/domain";
import { Email, USER_REPOSITORY, User, type UserRepository } from "../src/modules/user/domain";
import { PASSWORD_HASHER } from "../src/modules/authentication/domain/ports/password-hasher";
import {
  SESSION_STORE,
  type Session,
} from "../src/modules/authentication/domain/ports/session-store";
import { RegisterUserUseCase } from "../src/modules/authentication/application/register-user.usecase";
import { LoginUserUseCase } from "../src/modules/authentication/application/login-user.usecase";
import { UpdateProfileUseCase } from "../src/modules/authentication/application/update-profile.usecase";
import { ChangePasswordUseCase } from "../src/modules/authentication/application/change-password.usecase";
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
  async updateProfile(
    userId: string,
    data: { displayName?: string; email?: Email },
  ): Promise<User> {
    const current = this.byId.get(userId)!;
    if (data.displayName !== undefined) current.rename(data.displayName);
    if (data.email !== undefined) current.changeEmail(data.email);
    return current;
  }
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const current = this.byId.get(userId)!;
    this.byId.set(
      userId,
      User.rehydrate(userId, {
        email: current.email,
        passwordHash,
        displayName: current.displayName,
      }),
    );
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
        UpdateProfileUseCase,
        ChangePasswordUseCase,
        AuthGuard,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: PASSWORD_HASHER, useValue: fakeHasher },
        { provide: SESSION_STORE, useValue: sessions },
        {
          provide: EVENT_PUBLISHER,
          useValue: { publish: async () => undefined, publishAll: async () => undefined },
        },
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
  const creds = { email: "alice@example.com", password: "supersecret", displayName: "Alice" };

  it("inscription → renvoie l'utilisateur et un jeton (201)", async () => {
    const res = await request(server()).post("/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alice@example.com", displayName: "Alice" });
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.passwordHash).toBeUndefined();
    // Le jeton est aussi posé dans un cookie httpOnly (durcissement anti-XSS).
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => /otium_session=.+/.test(c) && /HttpOnly/i.test(c))).toBe(true);
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

  it("met à jour le profil via PATCH /me", async () => {
    const login = await request(server())
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "supersecret" });
    const token = login.body.token as string;

    const patch = await request(server())
      .patch("/auth/me")
      .set("authorization", `Bearer ${token}`)
      .send({ displayName: "Alice B." });
    expect(patch.status).toBe(200);
    expect(patch.body.displayName).toBe("Alice B.");

    const me = await request(server()).get("/auth/me").set("authorization", `Bearer ${token}`);
    expect(me.body.displayName).toBe("Alice B.");
  });

  it("change le mot de passe puis reconnecte avec le nouveau", async () => {
    // Utilisateur dédié (l'état est partagé entre tests : on ne touche pas à Alice).
    const reg = await request(server())
      .post("/auth/register")
      .send({ email: "bob@example.com", password: "bob-initial", displayName: "Bob" });
    const token = reg.body.token as string;

    // Mauvais mot de passe actuel → 400 (et surtout pas 401 : on ne déconnecte pas).
    const wrong = await request(server())
      .put("/auth/password")
      .set("authorization", `Bearer ${token}`)
      .send({ currentPassword: "faux-mdp", newPassword: "bob-nouveau-1" });
    expect(wrong.status).toBe(400);

    const ok = await request(server())
      .put("/auth/password")
      .set("authorization", `Bearer ${token}`)
      .send({ currentPassword: "bob-initial", newPassword: "bob-nouveau-1" });
    expect(ok.status).toBe(204);

    const relogin = await request(server())
      .post("/auth/login")
      .send({ email: "bob@example.com", password: "bob-nouveau-1" });
    expect(relogin.status).toBe(200);
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

    expect(
      (await request(server()).post("/auth/logout").set("authorization", `Bearer ${token}`)).status,
    ).toBe(204);
    expect(
      (await request(server()).get("/auth/me").set("authorization", `Bearer ${token}`)).status,
    ).toBe(401);
  });
});
