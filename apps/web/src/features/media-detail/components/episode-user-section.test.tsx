import type { EpisodeReview } from "@otium/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markEpisode = vi.fn();
const saveReview = vi.fn();
const deleteReview = vi.fn();
let review: EpisodeReview | null;

vi.mock("../../library/api/use-library", () => ({
  useLibrary: () => ({
    data: [{ id: "item1", media: { type: "SERIES", externalRef: { externalId: "1399" } } }],
  }),
}));
vi.mock("../../library/api/use-series-tracking", () => ({
  useSeriesTracking: () => ({
    data: { seasons: [{ number: 1, episodes: [{ id: "s1e3", number: 3, watched: false }] }] },
  }),
  useMarkEpisode: () => ({ mutate: markEpisode, isPending: false }),
}));
vi.mock("../api/use-episode-review", () => ({
  useEpisodeReview: () => ({ data: review, isLoading: false }),
  useSaveEpisodeReview: () => ({ mutate: saveReview, isPending: false, isError: false }),
  useDeleteEpisodeReview: () => ({ mutate: deleteReview, isPending: false, isError: false }),
}));

import { EpisodeUserSection } from "./episode-user-section";

describe("EpisodeUserSection", () => {
  beforeEach(() => {
    markEpisode.mockReset();
    saveReview.mockReset();
    deleteReview.mockReset();
    review = null;
  });

  it("marque l'épisode vu", async () => {
    render(<EpisodeUserSection externalId="1399" season={1} episode={3} />);
    await userEvent.click(screen.getByRole("button", { name: /Marquer vu/i }));
    expect(markEpisode).toHaveBeenCalledWith({ episodeId: "s1e3", watched: true });
  });

  it("enregistre une note seule (sans avis)", async () => {
    render(<EpisodeUserSection externalId="1399" season={1} episode={3} />);
    await userEvent.selectOptions(screen.getByLabelText("Note"), "8");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(saveReview).toHaveBeenCalledWith({ rating: 8, body: null });
  });

  it("enregistre un avis seul (sans note)", async () => {
    render(<EpisodeUserSection externalId="1399" season={1} episode={3} />);
    await userEvent.type(screen.getByLabelText("Mon avis"), "Superbe épisode");
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(saveReview).toHaveBeenCalledWith({ rating: null, body: "Superbe épisode" });
  });
});
