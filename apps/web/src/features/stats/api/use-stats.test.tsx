import type { ViewingStats } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { getViewingStats: vi.fn() } }));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useViewingStats } from "./use-stats";

const stats = { totals: { totalMinutes: 120 } } as unknown as ViewingStats;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useViewingStats", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(api.getViewingStats).mockReset();
  });

  it("ne charge pas les stats si non connecté", () => {
    const { result } = renderHook(() => useViewingStats(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getViewingStats).not.toHaveBeenCalled();
  });

  it("charge les stats une fois connecté", async () => {
    useAuthStore.getState().setSession({ id: "u", email: "a@b.com", displayName: "A" });
    vi.mocked(api.getViewingStats).mockResolvedValue(stats);
    const { result } = renderHook(() => useViewingStats(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(stats));
  });
});
