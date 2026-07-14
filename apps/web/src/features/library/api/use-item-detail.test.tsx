import type { LibraryItem, Review } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({
  api: { rateMedia: vi.fn(), saveReview: vi.fn() },
}));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useRateMedia, useSaveReview } from "./use-item-detail";

const item = { id: "i1", rating: 8 } as unknown as LibraryItem;
const review: Review = { body: "Top", updatedAt: "2026-01-01T00:00:00.000Z" };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("item detail hooks", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({ id: "u", email: "a@b.com", displayName: "A" }, "tok");
    vi.mocked(api.rateMedia).mockReset();
    vi.mocked(api.saveReview).mockReset();
  });

  it("useRateMedia envoie la note", async () => {
    vi.mocked(api.rateMedia).mockResolvedValue(item);
    const { result } = renderHook(() => useRateMedia("i1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(8);
    });
    await waitFor(() => expect(api.rateMedia).toHaveBeenCalledWith("i1", { rating: 8 }));
  });

  it("useSaveReview envoie le texte", async () => {
    vi.mocked(api.saveReview).mockResolvedValue(review);
    const { result } = renderHook(() => useSaveReview("i1"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ body: "Top" });
    });
    await waitFor(() => expect(api.saveReview).toHaveBeenCalledWith("i1", { body: "Top" }));
  });
});
