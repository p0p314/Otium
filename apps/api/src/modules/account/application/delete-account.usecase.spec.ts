import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidCredentialsError } from "../../authentication/application/errors";
import type { PasswordHasher } from "../../authentication/domain/ports/password-hasher";
import { Email, User, type UserRepository } from "../../user/domain";
import type { AccountGateway } from "../domain/account-gateway";
import { DeleteAccountUseCase } from "./delete-account.usecase";

const user = User.rehydrate("u1", {
  email: Email.create("a@b.com"),
  passwordHash: "h:current",
  displayName: "A",
});

describe("DeleteAccountUseCase", () => {
  let users: UserRepository;
  let hasher: PasswordHasher;
  let gateway: AccountGateway;
  let useCase: DeleteAccountUseCase;

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
      hash: vi.fn(),
      verify: vi.fn(async (plain: string, hash: string) => hash === `h:${plain}`),
    };
    gateway = { export: vi.fn(), delete: vi.fn().mockResolvedValue(undefined) };
    useCase = new DeleteAccountUseCase(users, hasher, gateway);
  });

  it("supprime le compte après vérification du mot de passe", async () => {
    await useCase.execute({ userId: "u1", password: "current" });
    expect(gateway.delete).toHaveBeenCalledWith("u1");
  });

  it("rejette un mot de passe incorrect sans supprimer", async () => {
    await expect(useCase.execute({ userId: "u1", password: "wrong" })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it("lève NotFound si l'utilisateur n'existe pas", async () => {
    vi.mocked(users.findById).mockResolvedValue(null);
    await expect(useCase.execute({ userId: "x", password: "current" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
