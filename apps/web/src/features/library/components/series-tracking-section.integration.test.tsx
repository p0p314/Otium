import type { MarkEpisodesInput, SeriesTracking } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/api/use-auth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../../../lib/api", () => ({
  api: { getSeriesTracking: vi.fn(), markEpisode: vi.fn(), markEpisodes: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...p }: { children: unknown }) => <a {...p}>{children as never}</a>,
}));

import { api } from "../../../lib/api";
import { SeriesTrackingSection } from "./series-tracking-section";

// État mutable partagé : reflète le serveur (les mutations renvoient l'état à jour).
let watched: Set<string>;

function ep(n: number) {
  return { id: `e${n}`, seasonNumber: 1, number: n, title: `Épisode ${n}`, watched: watched.has(`e${n}`) };
}
function snapshot(): SeriesTracking {
  const episodes = [ep(1), ep(2), ep(3), ep(4)];
  const next = episodes.find((e) => !e.watched) ?? null;
  return {
    itemId: "i1",
    totalEpisodes: 4,
    watchedEpisodes: episodes.filter((e) => e.watched).length,
    nextEpisode: next,
    seasons: [{ number: 1, episodes }],
  } as unknown as SeriesTracking;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("SeriesTrackingSection (intégration hooks réels)", () => {
  beforeEach(() => {
    watched = new Set();
    vi.mocked(api.getSeriesTracking).mockImplementation(async () => snapshot());
    vi.mocked(api.markEpisode).mockImplementation(async (_id, { episodeId, watched: w }) => {
      if (w) watched.add(episodeId);
      else watched.delete(episodeId);
      return snapshot();
    });
    vi.mocked(api.markEpisodes).mockImplementation(async (_id, { episodeIds, watched: w }: MarkEpisodesInput) => {
      for (const id of episodeIds) {
        if (w) watched.add(id);
        else watched.delete(id);
      }
      return snapshot();
    });
  });

  it("propose puis marque les épisodes précédents après un saut (E4)", async () => {
    render(<SeriesTrackingSection itemId="i1" seriesExternalId="1399" />, { wrapper });
    // On saute directement à E4 (E1–E3 non vus).
    const box = await screen.findByRole("checkbox", { name: /Épisode 4/i });
    await userEvent.click(box);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByText(/3 épisodes précédents/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Tout marquer vu/i }));
    await waitFor(() =>
      expect(api.markEpisodes).toHaveBeenCalledWith("i1", {
        episodeIds: ["e1", "e2", "e3"],
        watched: true,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
