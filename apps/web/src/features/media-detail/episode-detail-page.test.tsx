import type { EpisodeDetails } from "@otium/types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let details: EpisodeDetails;

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...p }: { children: unknown }) => <a {...p}>{children as never}</a>,
  useParams: () => ({ type: "SERIES", externalId: "1399", season: "1", episode: "3" }),
}));
vi.mock("./api/use-episode-details", () => ({
  useEpisodeDetails: () => ({ data: details, isLoading: false, isError: false }),
}));
// Actions utilisateur (vu + note/avis) testées séparément : stub ici.
vi.mock("./components/episode-user-section", () => ({
  EpisodeUserSection: () => <div data-testid="user-section" />,
}));

import { EpisodeDetailPage } from "./episode-detail-page";

describe("EpisodeDetailPage", () => {
  beforeEach(() => {
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

  it("affiche titre, résumé, casting et les actions utilisateur", () => {
    render(<EpisodeDetailPage />);

    expect(screen.getByRole("heading", { name: "Le long chemin" })).toBeInTheDocument();
    expect(screen.getByText("Un résumé de l'épisode.")).toBeInTheDocument();
    expect(screen.getByText("Actrice A")).toBeInTheDocument();
    expect(screen.getByText("Héroïne")).toBeInTheDocument();
    expect(screen.getByTestId("user-section")).toBeInTheDocument();
  });
});
