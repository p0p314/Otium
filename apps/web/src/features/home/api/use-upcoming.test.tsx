import type { UpcomingDashboard } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { getUpcoming: vi.fn() } }));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useUpcoming } from "./use-upcoming";

const data = { series: [] } as UpcomingDashboard;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useUpcoming", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(api.getUpcoming).mockReset();
  });

  it("ne charge rien si non connecté", () => {
    const { result } = renderHook(() => useUpcoming(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getUpcoming).not.toHaveBeenCalled();
  });

  it("charge l'agenda une fois connecté", async () => {
    useAuthStore.getState().setSession({ id: "u", email: "a@b.com", displayName: "A" });
    vi.mocked(api.getUpcoming).mockResolvedValue(data);
    const { result } = renderHook(() => useUpcoming(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(data));
  });
});
