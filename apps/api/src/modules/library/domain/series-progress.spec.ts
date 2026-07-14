import { describe, expect, it } from "vitest";
import { isComplete, nextUnwatched, orderedEpisodes, totalEpisodes, type SeasonRef } from "./series-progress";

const seasons: SeasonRef[] = [
  {
    number: 2,
    episodes: [
      { id: "s2e1", seasonNumber: 2, number: 1, title: "" },
      { id: "s2e2", seasonNumber: 2, number: 2, title: "" },
    ],
  },
  {
    number: 1,
    episodes: [
      { id: "s1e2", seasonNumber: 1, number: 2, title: "" },
      { id: "s1e1", seasonNumber: 1, number: 1, title: "" },
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
    // saute un trou : s1e1 et s1e2 vus, s2e1 non vu
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
