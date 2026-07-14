import type { LibraryItem } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({
  api: { getLibrary: vi.fn(), addToLibrary: vi.fn() },
}));

import { api } from "../../../lib/api";
import { useAuthStore } from "../../../stores/auth-store";
import { useAddToLibrary, useLibrary } from "./use-library";

const media = {
  externalRef: { provider: "tmdb", externalId: "1" },
  type: "MOVIE" as const,
  title: "Dune",
  year: 2021,
  posterUrl: null,
  genres: [],
};

const item: LibraryItem = {
  id: "i1",
  media,
  status: "PLANNED",
  rating: null,
  isFavorite: false,
  addedAt: "2026-01-01T00:00:00.000Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("library hooks", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(api.getLibrary).mockReset();
    vi.mocked(api.addToLibrary).mockReset();
  });

  it("useLibrary ne charge rien tant que l'utilisateur n'est pas connecté", () => {
    renderHook(() => useLibrary(), { wrapper });
    expect(api.getLibrary).not.toHaveBeenCalled();
  });

  it("useAddToLibrary envoie le média au SDK", async () => {
    vi.mocked(api.addToLibrary).mockResolvedValue(item);
    const { result } = renderHook(() => useAddToLibrary(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(media);
    });

    await waitFor(() => expect(api.addToLibrary).toHaveBeenCalledWith({ media }));
  });
});
