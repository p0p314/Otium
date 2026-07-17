import { describe, expect, it } from "vitest";
import {
  airedCount,
  currentSeasonPremiere,
  hasRecentSeasonPremiere,
  hasUnwatchedAired,
  isComplete,
  nextUnwatched,
  nextUnwatchedAired,
  orderedEpisodes,
  type SeasonRef,
  totalEpisodes,
  upcomingEpisodes,
} from "./series-progress";

const seasons: SeasonRef[] = [
  {
    number: 2,
    episodes: [
      { id: "s2e1", seasonNumber: 2, number: 1, title: "", airDate: null },
      { id: "s2e2", seasonNumber: 2, number: 2, title: "", airDate: null },
    ],
  },
  {
    number: 1,
    episodes: [
      { id: "s1e2", seasonNumber: 1, number: 2, title: "", airDate: null },
      { id: "s1e1", seasonNumber: 1, number: 1, title: "", airDate: null },
    ],
  },
];

describe("progression de série", () => {
  it("ordonne les épisodes par (saison, numéro)", () => {
    expect(orderedEpisodes(seasons).map((e) => e.id)).toEqual(["s1e1", "s1e2", "s2e1", "s2e2"]);
  });

  it("compte le total d'épisodes", () => {
    expect(totalEpisodes(seasons)).toBe(4);
  });

  it("nextUnwatched = premier épisode non vu dans l'ordre", () => {
    expect(nextUnwatched(seasons, new Set(["s1e1"]))?.id).toBe("s1e2");
    expect(nextUnwatched(seasons, new Set())?.id).toBe("s1e1");
    expect(nextUnwatched(seasons, new Set(["s1e1", "s1e2"]))?.id).toBe("s2e1");
  });

  it("nextUnwatched = null quand tout est vu", () => {
    const all = new Set(["s1e1", "s1e2", "s2e1", "s2e2"]);
    expect(nextUnwatched(seasons, all)).toBeNull();
    expect(isComplete(seasons, all)).toBe(true);
  });

  it("série vide n'est pas 'complète'", () => {
    expect(isComplete([], new Set())).toBe(false);
  });
});

describe("dates de diffusion (sorti / à venir)", () => {
  const NOW = new Date("2026-07-15T00:00:00.000Z");
  const past = new Date("2026-07-01T00:00:00.000Z");
  const future = new Date("2026-08-01T00:00:00.000Z");
  const dated: SeasonRef[] = [
    {
      number: 1,
      episodes: [
        { id: "e1", seasonNumber: 1, number: 1, title: "", airDate: past },
        { id: "e2", seasonNumber: 1, number: 2, title: "", airDate: past },
        { id: "e3", seasonNumber: 1, number: 3, title: "", airDate: future },
      ],
    },
  ];

  it("compte uniquement les épisodes sortis (airDate null = sorti)", () => {
    expect(airedCount(dated, NOW)).toBe(2);
    expect(airedCount(seasons, NOW)).toBe(4); // toutes dates nulles → sorties
  });

  it("nextUnwatchedAired ignore les épisodes non encore sortis", () => {
    // e1, e2 vus → prochain non vu est e3 (à venir) → pas de reprise « sortie »
    expect(nextUnwatchedAired(dated, new Set(["e1", "e2"]), NOW)).toBeNull();
    // e1 vu → e2 (sorti) est la reprise
    expect(nextUnwatchedAired(dated, new Set(["e1"]), NOW)?.id).toBe("e2");
  });

  it("hasUnwatchedAired reflète un épisode sorti restant à voir", () => {
    expect(hasUnwatchedAired(dated, new Set(["e1"]), NOW)).toBe(true);
    expect(hasUnwatchedAired(dated, new Set(["e1", "e2"]), NOW)).toBe(false);
  });

  it("upcomingEpisodes liste les diffusions futures, triées", () => {
    expect(upcomingEpisodes(dated, NOW).map((e) => e.id)).toEqual(["e3"]);
    expect(upcomingEpisodes(seasons, NOW)).toEqual([]); // aucune date → rien à venir
  });
});

describe("saison en cours / première récente", () => {
  const NOW = new Date("2026-07-15T00:00:00.000Z");
  const recent = new Date("2026-07-05T00:00:00.000Z"); // 10 j
  const old = new Date("2026-01-01T00:00:00.000Z");
  const future = new Date("2026-08-01T00:00:00.000Z");

  const withSeasons = (s: SeasonRef[]): SeasonRef[] => s;

  it("currentSeasonPremiere = 1er épisode de la dernière saison diffusée", () => {
    const s = withSeasons([
      { number: 1, episodes: [{ id: "s1e1", seasonNumber: 1, number: 1, title: "", airDate: old }] },
      {
        number: 2,
        episodes: [
          { id: "s2e2", seasonNumber: 2, number: 2, title: "", airDate: null },
          { id: "s2e1", seasonNumber: 2, number: 1, title: "", airDate: recent },
        ],
      },
    ]);
    expect(currentSeasonPremiere(s, NOW)?.id).toBe("s2e1");
  });

  it("ignore une saison entièrement à venir pour la saison « en cours »", () => {
    const s = withSeasons([
      { number: 1, episodes: [{ id: "s1e1", seasonNumber: 1, number: 1, title: "", airDate: recent }] },
      { number: 2, episodes: [{ id: "s2e1", seasonNumber: 2, number: 1, title: "", airDate: future }] },
    ]);
    // Saison 2 pas encore diffusée → saison en cours = saison 1.
    expect(currentSeasonPremiere(s, NOW)?.id).toBe("s1e1");
  });

  it("hasRecentSeasonPremiere : vrai si < withinDays, faux au-delà ou sans date", () => {
    const recentS = withSeasons([
      { number: 1, episodes: [{ id: "e1", seasonNumber: 1, number: 1, title: "", airDate: recent }] },
    ]);
    const oldS = withSeasons([
      { number: 1, episodes: [{ id: "e1", seasonNumber: 1, number: 1, title: "", airDate: old }] },
    ]);
    const undatedS = withSeasons([
      { number: 1, episodes: [{ id: "e1", seasonNumber: 1, number: 1, title: "", airDate: null }] },
    ]);
    expect(hasRecentSeasonPremiere(recentS, NOW, 30)).toBe(true);
    expect(hasRecentSeasonPremiere(oldS, NOW, 30)).toBe(false);
    expect(hasRecentSeasonPremiere(undatedS, NOW, 30)).toBe(false); // date inconnue → pas « récent »
  });
});
