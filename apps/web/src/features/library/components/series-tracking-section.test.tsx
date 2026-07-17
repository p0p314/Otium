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

  it("n'ouvre aucune popup au chargement, même si un trou est déjà présent", () => {
    // E3 déjà vu, E1/E2 non vus : au chargement on ne propose rien (uniquement sur clic).
    tracking = withEpisodes([episode(1, false), episode(2, false), episode(3, true)]);
    render(<SeriesTrackingSection itemId="i1" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ouvre la popup quand un clic crée un trou, puis valide le rattrapage", async () => {
    tracking = withEpisodes([episode(1, false), episode(2, false), episode(3, false)]);
    render(<SeriesTrackingSection itemId="i1" />);

    // On coche E3 alors que E1/E2 ne le sont pas → trou créé.
    await userEvent.click(screen.getByRole("checkbox", { name: /Épisode 3/i }));
    expect(markEpisode).toHaveBeenCalledWith({ episodeId: "e3", watched: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/2 épisodes précédents/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tout marquer vu/i }));
    expect(markEpisodes).toHaveBeenCalledWith({ episodeIds: ["e1", "e2"], watched: true });
  });

  it("ne propose rien quand le clic ne crée pas de trou", async () => {
    tracking = withEpisodes([episode(1, false), episode(2, false)]);
    render(<SeriesTrackingSection itemId="i1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Épisode 1/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("permet de reporter la proposition (Plus tard)", async () => {
    tracking = withEpisodes([episode(1, false), episode(2, false)]);
    render(<SeriesTrackingSection itemId="i1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Épisode 2/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(markEpisodes).not.toHaveBeenCalled();
  });

  it("n'affiche qu'une saison à la fois via le sélecteur", async () => {
    tracking = {
      itemId: "i1",
      totalEpisodes: 2,
      watchedEpisodes: 0,
      nextEpisode: { id: "s1e1", seasonNumber: 1, number: 1, title: "Pilote S1", watched: false },
      seasons: [
        { number: 1, episodes: [{ id: "s1e1", seasonNumber: 1, number: 1, title: "Pilote S1", watched: false }] },
        { number: 2, episodes: [{ id: "s2e1", seasonNumber: 2, number: 1, title: "Reprise S2", watched: false }] },
      ],
    } as unknown as SeriesTracking;
    render(<SeriesTrackingSection itemId="i1" />);

    // Saison de reprise (1) affichée par défaut ; la saison 2 est masquée.
    expect(screen.getByText("Pilote S1")).toBeInTheDocument();
    expect(screen.queryByText("Reprise S2")).not.toBeInTheDocument();

    // Bascule vers la saison 2 via le sélecteur.
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Saison/i }), "2");
    expect(screen.getByText("Reprise S2")).toBeInTheDocument();
    expect(screen.queryByText("Pilote S1")).not.toBeInTheDocument();
  });
});
