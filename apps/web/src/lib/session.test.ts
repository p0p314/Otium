import type { AuthUser } from "@otium/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const me = vi.fn();
vi.mock("./api", () => ({ api: { me } }));

const user: AuthUser = { id: "u1", email: "a@b.com", displayName: "Alice" };

describe("ensureSessionLoaded", () => {
  beforeEach(() => {
    vi.resetModules(); // réinitialise la promesse de bootstrap mémorisée
    me.mockReset();
  });

  it("restaure l'utilisateur depuis le cookie (/auth/me)", async () => {
    me.mockResolvedValue(user);
    const { ensureSessionLoaded } = await import("./session");
    const { useAuthStore } = await import("../stores/auth-store");

    await ensureSessionLoaded();

    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("bascule en anonyme si le cookie est absent/expiré (401)", async () => {
    me.mockRejectedValue(new Error("401"));
    const { ensureSessionLoaded } = await import("./session");
    const { useAuthStore } = await import("../stores/auth-store");

    await ensureSessionLoaded();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("ne résout la session qu'une fois (idempotent)", async () => {
    me.mockResolvedValue(user);
    const { ensureSessionLoaded } = await import("./session");

    await Promise.all([ensureSessionLoaded(), ensureSessionLoaded()]);
    await ensureSessionLoaded();

    expect(me).toHaveBeenCalledTimes(1);
  });
});
