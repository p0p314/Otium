import type { EpisodeDetails } from "@otium/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markEpisode = vi.fn();
let details: EpisodeDetails;

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...p }: { children: unknown }) => <a {...p}>{children as never}</a>,
  useParams: () => ({ type: "SERIES", externalId: "1399", season: "1", episode: "3" }),
}));
vi.mock("./api/use-episode-details", () => ({
  useEpisodeDetails: () => ({ data: details, isLoading: false, isError: false }),
}));
vi.mock("../library/api/use-library", () => ({
  useLibrary: () => ({
    data: [{ id: "item1", media: { type: "SERIES", externalRef: { externalId: "1399" } } }],
  }),
}));
vi.mock("../library/api/use-series-tracking", () => ({
  useSeriesTracking: () => ({
    data: { seasons: [{ number: 1, episodes: [{ id: "s1e3", number: 3, watched: false }] }] },
  }),
  useMarkEpisode: () => ({ mutate: markEpisode, isPending: false }),
}));

import { EpisodeDetailPage } from "./episode-detail-page";

describe("EpisodeDetailPage", () => {
  beforeEach(() => {
    markEpisode.mockReset();
    details = {
      seasonNumber: 1,
      number: 3,
      title: "Le long chemin",
      overview: "Un résumé de l'épisode.",
      airDate: "2014-04-02",
      runtimeMinutes: 43,
      stillUrl: null,
      rating: 8.4,
      cast: [{ name: "Actrice A", character: "Héroïne", profileUrl: null }],
    };
  });

  it("affiche titre, résumé, casting et le bouton « Marquer vu »", async () => {
    render(<EpisodeDetailPage />);

    expect(screen.getByRole("heading", { name: "Le long chemin" })).toBeInTheDocument();
    expect(screen.getByText("Un résumé de l'épisode.")).toBeInTheDocument();
    expect(screen.getByText("Actrice A")).toBeInTheDocument();
    expect(screen.getByText("Héroïne")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Marquer vu/i }));
    expect(markEpisode).toHaveBeenCalledWith({ episodeId: "s1e3", watched: true });
  });
});
