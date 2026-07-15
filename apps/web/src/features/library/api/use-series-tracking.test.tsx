import type { SeriesTracking } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({
  api: { getSeriesTracking: vi.fn(), markEpisode: vi.fn() },
}));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useMarkEpisode } from "./use-series-tracking";

const tracking: SeriesTracking = {
  itemId: "i1",
  title: "Test",
  status: "IN_PROGRESS",
  totalEpisodes: 2,
  watchedEpisodes: 1,
  nextEpisode: { id: "e2", seasonNumber: 1, number: 2, title: "Suite", watched: false },
  seasons: [],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useMarkEpisode", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({ id: "u", email: "a@b.com", displayName: "A" });
    vi.mocked(api.markEpisode).mockReset();
  });

  it("envoie l'épisode marqué au SDK", async () => {
    vi.mocked(api.markEpisode).mockResolvedValue(tracking);
    const { result } = renderHook(() => useMarkEpisode("i1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ episodeId: "e1", watched: true });
    });

    await waitFor(() =>
      expect(api.markEpisode).toHaveBeenCalledWith("i1", { episodeId: "e1", watched: true }),
    );
  });
});
