import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaSessionStore } from "./prisma-session-store";

interface SessionRow {
  token: string;
  userId: string;
  expiresAt: Date;
}

function makePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    session: {
      create: vi.fn(async ({ data }: { data: SessionRow }) => data),
      findUnique: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      ...overrides,
    },
  } as unknown as PrismaService;
}

describe("PrismaSessionStore", () => {
  it("crée une session avec un jeton hex et une expiration future", async () => {
    const prisma = makePrisma();
    const store = new PrismaSessionStore(prisma);

    const session = await store.create("user-1");

    expect(session.userId).toBe("user-1");
    expect(session.token).toMatch(/^[0-9a-f]{64}$/);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.session.create).toHaveBeenCalledOnce();
  });

  it("resolve renvoie null pour un jeton vide", async () => {
    const store = new PrismaSessionStore(makePrisma());
    expect(await store.resolve("")).toBeNull();
  });

  it("resolve renvoie l'utilisateur d'un jeton valide", async () => {
    const prisma = makePrisma({
      findUnique: vi.fn(async () => ({
        token: "t",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 60_000),
      })),
    });
    const store = new PrismaSessionStore(prisma);

    expect(await store.resolve("t")).toBe("user-1");
  });

  it("resolve purge et renvoie null pour un jeton expiré", async () => {
    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const prisma = makePrisma({
      findUnique: vi.fn(async () => ({
        token: "t",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1),
      })),
      deleteMany,
    });
    const store = new PrismaSessionStore(prisma);

    expect(await store.resolve("t")).toBeNull();
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: "t" } });
  });

  it("revoke supprime le jeton (idempotent)", async () => {
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const store = new PrismaSessionStore(makePrisma({ deleteMany }));

    await store.revoke("t");

    expect(deleteMany).toHaveBeenCalledWith({ where: { token: "t" } });
  });

  it("revokeAllForUser supprime toutes les sessions de l'utilisateur", async () => {
    const deleteMany = vi.fn(async () => ({ count: 3 }));
    const store = new PrismaSessionStore(makePrisma({ deleteMany }));

    await store.revokeAllForUser("user-1");

    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("revokeAllForUser conserve la session courante (exceptToken)", async () => {
    const deleteMany = vi.fn(async () => ({ count: 2 }));
    const store = new PrismaSessionStore(makePrisma({ deleteMany }));

    await store.revokeAllForUser("user-1", "keep");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", token: { not: "keep" } },
    });
  });
});
