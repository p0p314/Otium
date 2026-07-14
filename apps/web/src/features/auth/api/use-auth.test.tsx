import type { AuthSession } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { login: vi.fn(), register: vi.fn() } }));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useLogin } from "./use-auth";

const session: AuthSession = {
  user: { id: "u1", email: "a@b.com", displayName: "Alice" },
  token: "tok_123",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLogin", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(api.login).mockReset();
  });

  it("enregistre la session dans le store après une connexion réussie", async () => {
    vi.mocked(api.login).mockResolvedValue(session);
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: "a@b.com", password: "supersecret" });
    });

    await waitFor(() => expect(useAuthStore.getState().token).toBe("tok_123"));
    expect(useAuthStore.getState().user?.displayName).toBe("Alice");
  });
});
