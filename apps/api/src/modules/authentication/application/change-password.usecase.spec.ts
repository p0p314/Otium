import { beforeEach, describe, expect, it, vi } from "vitest";
import { Email, User, type UserRepository } from "../../user/domain";
import type { PasswordHasher } from "../domain/ports/password-hasher";
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
    useCase = new ChangePasswordUseCase(users, hasher);
  });

  it("change le mot de passe après vérification de l'actuel", async () => {
    await useCase.execute({ userId: "u1", currentPassword: "current", newPassword: "brandnew1" });
    expect(users.updatePassword).toHaveBeenCalledWith("u1", "h:brandnew1");
  });

  it("rejette un mot de passe actuel incorrect", async () => {
    await expect(
      useCase.execute({ userId: "u1", currentPassword: "wrong", newPassword: "brandnew1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});
