import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Email, User, type UserRepository } from "../../user/domain";
import { EmailAlreadyUsedError } from "./errors";
import { UpdateProfileUseCase } from "./update-profile.usecase";

const existing = User.rehydrate("u1", {
  email: Email.create("old@example.com"),
  passwordHash: "h",
  displayName: "Ancien",
});

describe("UpdateProfileUseCase", () => {
  let users: UserRepository;
  let useCase: UpdateProfileUseCase;

  beforeEach(() => {
    users = {
      findById: vi.fn().mockResolvedValue(existing),
      findByEmail: vi.fn(),
      existsByEmail: vi.fn().mockResolvedValue(false),
      create: vi.fn(),
      updateProfile: vi.fn(async (id: string, data: { displayName?: string; email?: Email }) =>
        User.rehydrate(id, {
          email: data.email ?? existing.email,
          passwordHash: "h",
          displayName: data.displayName ?? existing.displayName,
        }),
      ),
      updatePassword: vi.fn(),
    };
    useCase = new UpdateProfileUseCase(users);
  });

  it("met à jour le nom affiché", async () => {
    const result = await useCase.execute({ userId: "u1", displayName: "Nouveau" });
    expect(result).toEqual({ id: "u1", email: "old@example.com", displayName: "Nouveau" });
    expect(users.updateProfile).toHaveBeenCalledWith("u1", { displayName: "Nouveau" });
  });

  it("change l'e-mail s'il est libre", async () => {
    const result = await useCase.execute({ userId: "u1", email: "new@example.com" });
    expect(result.email).toBe("new@example.com");
    expect(users.existsByEmail).toHaveBeenCalled();
  });

  it("n'échoue pas si l'e-mail est inchangé (pas de contrôle d'unicité)", async () => {
    await useCase.execute({ userId: "u1", email: "old@example.com" });
    expect(users.existsByEmail).not.toHaveBeenCalled();
  });

  it("rejette un e-mail déjà utilisé", async () => {
    vi.mocked(users.existsByEmail).mockResolvedValue(true);
    await expect(
      useCase.execute({ userId: "u1", email: "taken@example.com" }),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
  });

  it("échoue si l'utilisateur est introuvable", async () => {
    vi.mocked(users.findById).mockResolvedValue(null);
    await expect(useCase.execute({ userId: "x", displayName: "X" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
