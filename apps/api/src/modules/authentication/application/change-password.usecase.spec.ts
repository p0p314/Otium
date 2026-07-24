import { beforeEach, describe, expect, it, vi } from "vitest";
import { Email, User, type UserRepository } from "../../user/domain";
import type { PasswordHasher } from "../domain/ports/password-hasher";
import type { SessionStore } from "../domain/ports/session-store";
import { ChangePasswordUseCase } from "./change-password.usecase";
import { InvalidCredentialsError } from "./errors";

const user = User.rehydrate("u1", {
  email: Email.create("a@b.com"),
  passwordHash: "h:current",
  displayName: "A",
});

describe("ChangePasswordUseCase", () => {
  let users: UserRepository;
  let hasher: PasswordHasher;
  let sessions: SessionStore;
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    users = {
      findById: vi.fn().mockResolvedValue(user),
      findByEmail: vi.fn(),
      existsByEmail: vi.fn(),
      create: vi.fn(),
      updateProfile: vi.fn(),
      updatePassword: vi.fn(),
    };
    hasher = {
      hash: vi.fn(async (plain: string) => `h:${plain}`),
      verify: vi.fn(async (plain: string, hash: string) => hash === `h:${plain}`),
    };
    sessions = {
      create: vi.fn(),
      resolve: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new ChangePasswordUseCase(users, hasher, sessions);
  });

  it("change le mot de passe après vérification de l'actuel", async () => {
    await useCase.execute({ userId: "u1", currentPassword: "current", newPassword: "brandnew1" });
    expect(users.updatePassword).toHaveBeenCalledWith("u1", "h:brandnew1");
  });

  it("révoque les autres sessions en conservant la session courante", async () => {
    await useCase.execute({
      userId: "u1",
      currentPassword: "current",
      newPassword: "brandnew1",
      keepSessionToken: "keep-me",
    });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith("u1", "keep-me");
  });

  it("rejette un mot de passe actuel incorrect", async () => {
    await expect(
      useCase.execute({ userId: "u1", currentPassword: "wrong", newPassword: "brandnew1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(users.updatePassword).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });
});
