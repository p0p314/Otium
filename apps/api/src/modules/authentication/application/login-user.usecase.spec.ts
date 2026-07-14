import { beforeEach, describe, expect, it, vi } from "vitest";
import { Email, User, type UserRepository } from "../../user/domain";
import type { PasswordHasher } from "../domain/ports/password-hasher";
import type { SessionStore } from "../domain/ports/session-store";
import { InvalidCredentialsError } from "./errors";
import { LoginUserUseCase } from "./login-user.usecase";

const existingUser = User.rehydrate("user-1", {
  email: Email.create("bob@example.com"),
  passwordHash: "hashed",
  displayName: "Bob",
});

describe("LoginUserUseCase", () => {
  let users: UserRepository;
  let hasher: PasswordHasher;
  let sessions: SessionStore;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      findById: vi.fn(),
      existsByEmail: vi.fn(),
      create: vi.fn(),
    };
    hasher = { hash: vi.fn(), verify: vi.fn().mockResolvedValue(true) };
    sessions = {
      create: vi.fn().mockResolvedValue({
        token: "tok",
        userId: "user-1",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
      resolve: vi.fn(),
      revoke: vi.fn(),
    };
    useCase = new LoginUserUseCase(users, hasher, sessions);
  });

  it("ouvre une session avec des identifiants valides", async () => {
    const result = await useCase.execute({ email: "Bob@Example.com", password: "supersecret" });
    expect(result.user.id).toBe("user-1");
    expect(result.token).toBe("tok");
  });

  it("rejette un mot de passe incorrect", async () => {
    vi.mocked(hasher.verify).mockResolvedValue(false);
    await expect(
      useCase.execute({ email: "bob@example.com", password: "mauvais" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejette un utilisateur inconnu (même erreur, anti-énumération)", async () => {
    vi.mocked(users.findByEmail).mockResolvedValue(null);
    await expect(
      useCase.execute({ email: "inconnu@example.com", password: "supersecret" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
