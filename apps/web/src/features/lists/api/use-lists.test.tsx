import type { ListSummary } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({
  api: { getLists: vi.fn(), createList: vi.fn() },
}));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useCreateList, useLists } from "./use-lists";

const list: ListSummary = {
  id: "l1",
  name: "Week-end",
  itemCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("lists hooks", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(api.getLists).mockReset();
    vi.mocked(api.createList).mockReset();
  });

  it("ne charge pas les listes si non connecté", () => {
    const { result } = renderHook(() => useLists(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getLists).not.toHaveBeenCalled();
  });

  it("charge les listes une fois connecté", async () => {
    useAuthStore.getState().setSession({ id: "u", email: "a@b.com", displayName: "A" });
    vi.mocked(api.getLists).mockResolvedValue([list]);
    const { result } = renderHook(() => useLists(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([list]));
  });

  it("crée une liste via le SDK", async () => {
    vi.mocked(api.createList).mockResolvedValue(list);
    const { result } = renderHook(() => useCreateList(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("Week-end");
    });
    expect(api.createList).toHaveBeenCalledWith({ name: "Week-end" });
  });
});
