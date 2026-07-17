import type { SeriesTracking } from "@otium/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markEpisode = vi.fn();
const markEpisodes = vi.fn();
let tracking: SeriesTracking;

vi.mock("../api/use-series-tracking", () => ({
  useSeriesTracking: () => ({ data: tracking, isLoading: false, isError: false }),
  useMarkEpisode: () => ({ mutate: markEpisode, isPending: false }),
  useMarkEpisodes: () => ({ mutate: markEpisodes, isPending: false }),
}));

import { SeriesTrackingSection } from "./series-tracking-section";

function episode(n: number, watched: boolean) {
  return { id: `e${n}`, seasonNumber: 1, number: n, title: `Épisode ${n}`, watched };
}
function withEpisodes(episodes: ReturnType<typeof episode>[]): SeriesTracking {
  const next = episodes.find((e) => !e.watched) ?? null;
  return {
    itemId: "i1",
    totalEpisodes: episodes.length,
    watchedEpisodes: episodes.filter((e) => e.watched).length,
    nextEpisode: next,
    seasons: [{ number: 1, episodes }],
  } as unknown as SeriesTracking;
}

describe("SeriesTrackingSection — rattrapage des épisodes précédents", () => {
  beforeEach(() => {
    markEpisode.mockReset();
    markEpisodes.mockReset();
  });

  it("propose le rattrapage dès qu'un trou existe (épisode vu après des non-vus)", async () => {
    // E3 vu, E1/E2 non vus → trou de 2 épisodes à rattraper.
    tracking = withEpisodes([episode(1, false), episode(2, false), episode(3, true)]);
    render(<SeriesTrackingSection itemId="i1" />);

    expect(screen.getByText(/2 épisodes précédents non vus/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tout marquer vu/i }));
    expect(markEpisodes).toHaveBeenCalledWith({ episodeIds: ["e1", "e2"], watched: true });
  });

  it("ne propose rien quand la progression est continue (aucun trou)", () => {
    tracking = withEpisodes([episode(1, true), episode(2, true), episode(3, false)]);
    render(<SeriesTrackingSection itemId="i1" />);
    expect(screen.queryByText(/précédents? non vus?/i)).not.toBeInTheDocument();
  });

  it("permet d'ignorer la proposition", async () => {
    tracking = withEpisodes([episode(1, false), episode(2, true)]);
    render(<SeriesTrackingSection itemId="i1" />);
    expect(screen.getByText(/1 épisode précédent non vu/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ignorer" }));
    expect(screen.queryByText(/précédents? non vus?/i)).not.toBeInTheDocument();
    expect(markEpisodes).not.toHaveBeenCalled();
  });
});
