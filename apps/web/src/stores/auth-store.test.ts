import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

describe("auth store", () => {
  beforeEach(() => useAuthStore.getState().clear());

  it("commence déconnecté", () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("stocke puis efface la session (utilisateur uniquement, le jeton vit dans le cookie)", () => {
    useAuthStore.getState().setSession({ id: "1", email: "a@b.com", displayName: "A" });
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
