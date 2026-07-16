import { beforeEach, describe, expect, it, vi } from "vitest";
import { User, type UserRepository } from "../../user/domain";
import type { EventPublisher } from "../../../shared/domain";
import type { PasswordHasher } from "../domain/ports/password-hasher";
import type { Session, SessionStore } from "../domain/ports/session-store";
import { EmailAlreadyUsedError } from "./errors";
import { RegisterUserUseCase } from "./register-user.usecase";

function makeSession(userId: string): Session {
  return { token: "tok_" + userId, userId, expiresAt: new Date("2030-01-01T00:00:00.000Z") };
}

describe("RegisterUserUseCase", () => {
  let users: UserRepository;
  let hasher: PasswordHasher;
  let sessions: SessionStore;
  let events: EventPublisher;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = {
      updateProfile: vi.fn(),
      existsByEmail: vi.fn().mockResolvedValue(false),
      create: vi.fn(async (u: User) =>
        User.rehydrate("user-1", {
          email: u.email,
          passwordHash: u.passwordHash,
          displayName: u.displayName,
        }),
      ),
      findByEmail: vi.fn(),
      findById: vi.fn(),
    };
    hasher = { hash: vi.fn().mockResolvedValue("hashed"), verify: vi.fn() };
    sessions = { create: vi.fn(async (id: string) => makeSession(id)), resolve: vi.fn(), revoke: vi.fn() };
    events = { publish: vi.fn().mockResolvedValue(undefined), publishAll: vi.fn() };
    useCase = new RegisterUserUseCase(users, hasher, sessions, events);
  });

  it("hache le mot de passe, crée l'utilisateur, émet l'événement et ouvre une session", async () => {
    const result = await useCase.execute({
      email: "New@Example.com",
      password: "supersecret",
      displayName: "  Néo  ",
    });

    expect(hasher.hash).toHaveBeenCalledWith("supersecret");
    expect(result.user).toEqual({ id: "user-1", email: "new@example.com", displayName: "Néo" });
    expect(result.token).toBe("tok_user-1");
    expect(events.publish).toHaveBeenCalledOnce();
  });

  it("refuse un e-mail déjà utilisé", async () => {
    vi.mocked(users.existsByEmail).mockResolvedValue(true);
    await expect(
      useCase.execute({ email: "a@b.com", password: "supersecret", displayName: "Bob" }),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("rejette un e-mail invalide (invariant domaine)", async () => {
    await expect(
      useCase.execute({ email: "invalide", password: "supersecret", displayName: "Bob" }),
    ).rejects.toThrow();
  });
});
