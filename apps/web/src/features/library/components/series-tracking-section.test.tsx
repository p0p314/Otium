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

describe("SeriesTrackingSection — rattrapage des épisodes précédents", () => {
  beforeEach(() => {
    markEpisode.mockReset();
    markEpisodes.mockReset();
    tracking = {
      itemId: "i1",
      totalEpisodes: 3,
      watchedEpisodes: 0,
      nextEpisode: { id: "e1", seasonNumber: 1, number: 1, title: "Épisode 1", watched: false },
      seasons: [{ number: 1, episodes: [episode(1, false), episode(2, false), episode(3, false)] }],
    } as unknown as SeriesTracking;
  });

  it("propose de marquer les précédents et les envoie tous en un clic", async () => {
    render(<SeriesTrackingSection itemId="i1" />);

    // Marquer l'épisode 3 vu alors que 1 et 2 ne le sont pas.
    await userEvent.click(screen.getByRole("checkbox", { name: /Épisode 3/i }));
    expect(markEpisode).toHaveBeenCalledWith({ episodeId: "e3", watched: true });

    // La proposition de rattrapage apparaît puis marque e1 + e2.
    expect(screen.getByText(/2 épisodes précédents non vus/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tout marquer vu/i }));
    expect(markEpisodes).toHaveBeenCalledWith({ episodeIds: ["e1", "e2"], watched: true });
  });

  it("ne propose rien quand aucun épisode précédent n'est en attente", async () => {
    render(<SeriesTrackingSection itemId="i1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Épisode 1/i }));
    expect(markEpisode).toHaveBeenCalledWith({ episodeId: "e1", watched: true });
    expect(screen.queryByText(/précédents? non vus?/i)).not.toBeInTheDocument();
  });
});
