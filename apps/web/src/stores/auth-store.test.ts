import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

describe("auth store", () => {
  beforeEach(() => useAuthStore.getState().clear());

  it("commence déconnecté", () => {
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("stocke puis efface la session", () => {
    useAuthStore.getState().setSession({ id: "1", email: "a@b.com", displayName: "A" }, "tok");
    expect(useAuthStore.getState().token).toBe("tok");
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
