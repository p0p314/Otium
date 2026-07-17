import { describe, expect, it } from "vitest";
import type { EpisodeRef, SeasonRef, SeriesProgressRecord } from "../domain";
import { buildHomeDashboard, staleInProgressItemIds } from "./home-dashboard.view";

const NOW = new Date("2026-07-15T00:00:00.000Z");
const AIRED = new Date("2026-05-20T00:00:00.000Z"); // 56 j → sorti, mais pas une première récente
const RECENT_AIRED = new Date("2026-07-05T00:00:00.000Z"); // 10 j → première de saison récente
const OLD_AIRED = new Date("2026-01-01T00:00:00.000Z"); // saison diffusée il y a longtemps
const FUTURE = new Date("2026-08-01T00:00:00.000Z");

// Ancienneté du dernier visionnage, relative à NOW.
const RECENT = new Date("2026-07-10T00:00:00.000Z"); // 5 j → actif (à voir)
const PAUSED = new Date("2026-06-01T00:00:00.000Z"); // 44 j → à reprendre
const OLD = new Date("2026-03-01T00:00:00.000Z"); // ~136 j → masquée

function ep(id: string, n: number, airDate: Date | null): EpisodeRef {
  return { id, seasonNumber: 1, number: n, title: `E${n}`, airDate };
}
function oneSeason(episodes: EpisodeRef[]): SeasonRef[] {
  return [{ number: 1, episodes }];
}

function record(over: Partial<SeriesProgressRecord> & { itemId: string }): SeriesProgressRecord {
  return {
    title: `Série ${over.itemId}`,
    posterUrl: null,
    status: "IN_PROGRESS",
    seasons: oneSeason([ep("e1", 1, AIRED), ep("e2", 2, AIRED)]),
    watchedIds: new Set(),
    lastWatchedAt: null,
    ...over,
  };
}

describe("buildHomeDashboard", () => {
  it("« à voir » : série commencée et vue récemment (< 1 mois) avec un épisode à voir", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "active", watchedIds: new Set(["e1"]), lastWatchedAt: RECENT })],
      NOW,
    );
    expect(d.series.toWatch.map((s) => s.itemId)).toEqual(["active"]);
    expect(d.series.toResume).toEqual([]);
    expect(d.series.toWatch[0]?.nextEpisode?.id).toBe("e2");
  });

  it("« à commencer » : série jamais commencée avec au moins un épisode sorti", () => {
    const d = buildHomeDashboard([record({ itemId: "fresh", status: "PLANNED" })], NOW);
    expect(d.series.toStart.map((s) => s.itemId)).toEqual(["fresh"]);
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("« à voir » : série « à voir » dont la saison en cours vient de sortir (< 1 mois), rien vu", () => {
    const d = buildHomeDashboard(
      [
        record({
          itemId: "premiere",
          status: "PLANNED",
          seasons: oneSeason([ep("e1", 1, RECENT_AIRED)]),
        }),
      ],
      NOW,
    );
    expect(d.series.toWatch.map((s) => s.itemId)).toEqual(["premiere"]);
    expect(d.series.toStart).toEqual([]);
    expect(d.series.toWatch[0]?.nextEpisode?.id).toBe("e1");
  });

  it("« à voir » : nouvelle saison récente d'une série en cours inactive (sinon masquée)", () => {
    const d = buildHomeDashboard(
      [
        record({
          itemId: "s2",
          status: "IN_PROGRESS",
          watchedIds: new Set(["s1e1"]),
          lastWatchedAt: OLD, // ~136 j → normalement masquée
          seasons: [
            { number: 1, episodes: [ep("s1e1", 1, OLD_AIRED)] },
            {
              number: 2,
              episodes: [{ id: "s2e1", seasonNumber: 2, number: 1, title: "S2E1", airDate: RECENT_AIRED }],
            },
          ],
        }),
      ],
      NOW,
    );
    expect(d.series.toWatch.map((s) => s.itemId)).toEqual(["s2"]);
    expect(d.series.toResume).toEqual([]);
    expect(d.series.toWatch[0]?.nextEpisode?.id).toBe("s2e1");
  });

  it("ne remonte pas une saison en cours sortie il y a plus d'un mois", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "vieux", status: "PLANNED", seasons: oneSeason([ep("e1", 1, AIRED)]) })],
      NOW,
    );
    // Première ancienne (> 1 mois) → reste « à commencer », pas « à voir ».
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toStart.map((s) => s.itemId)).toEqual(["vieux"]);
  });

  it("« à reprendre » : série commencée laissée de côté (1 à 3 mois)", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "paused", watchedIds: new Set(["e1"]), lastWatchedAt: PAUSED })],
      NOW,
    );
    expect(d.series.toResume.map((s) => s.itemId)).toEqual(["paused"]);
    expect(d.series.toWatch).toEqual([]);
  });

  it("masque de l'accueil une série sans visionnage depuis 3 mois", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "old", watchedIds: new Set(["e1"]), lastWatchedAt: OLD })],
      NOW,
    );
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("exclut une série non commencée dont aucun épisode n'est sorti", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "unaired", status: "PLANNED", seasons: oneSeason([ep("e1", 1, FUTURE)]) })],
      NOW,
    );
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("exclut une série commencée dont tous les épisodes sortis sont vus (rien à voir)", () => {
    const d = buildHomeDashboard(
      [
        record({
          itemId: "uptodate",
          watchedIds: new Set(["e1", "e2"]),
          lastWatchedAt: RECENT,
          seasons: oneSeason([ep("e1", 1, AIRED), ep("e2", 2, AIRED), ep("e3", 3, FUTURE)]),
        }),
      ],
      NOW,
    );
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("ignore les séries abandonnées et en pause", () => {
    const d = buildHomeDashboard(
      [
        record({
          itemId: "dropped",
          status: "DROPPED",
          watchedIds: new Set(["e1"]),
          lastWatchedAt: RECENT,
        }),
        record({
          itemId: "paused",
          status: "PAUSED",
          watchedIds: new Set(["e1"]),
          lastWatchedAt: RECENT,
        }),
      ],
      NOW,
    );
    expect(d.series.toWatch).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("« à voir » triée par récence ; « à commencer » séparée et triée par titre", () => {
    const newer = new Date("2026-07-14T00:00:00.000Z");
    const older = new Date("2026-07-05T00:00:00.000Z");
    const d = buildHomeDashboard(
      [
        record({ itemId: "z-neuve", title: "Zorro", status: "PLANNED" }),
        record({ itemId: "active-old", watchedIds: new Set(["e1"]), lastWatchedAt: older }),
        record({ itemId: "a-neuve", title: "Avatar", status: "PLANNED" }),
        record({ itemId: "active-new", watchedIds: new Set(["e1"]), lastWatchedAt: newer }),
      ],
      NOW,
    );
    // Actives (commencées, récentes) → à voir, plus récente en tête.
    expect(d.series.toWatch.map((s) => s.itemId)).toEqual(["active-new", "active-old"]);
    // Jamais commencées → à commencer, triées par titre.
    expect(d.series.toStart.map((s) => s.itemId)).toEqual(["a-neuve", "z-neuve"]);
  });

  it("trie « à reprendre » du plus récemment vu au plus ancien", () => {
    const d = buildHomeDashboard(
      [
        record({ itemId: "older", watchedIds: new Set(["e1"]), lastWatchedAt: OLD_BUT_VISIBLE() }),
        record({ itemId: "newer", watchedIds: new Set(["e1"]), lastWatchedAt: PAUSED }),
      ],
      NOW,
    );
    expect(d.series.toResume.map((s) => s.itemId)).toEqual(["newer", "older"]);
  });
});

// 70 j : dans la fenêtre « à reprendre » (30–90 j), plus ancien que PAUSED (44 j).
function OLD_BUT_VISIBLE(): Date {
  return new Date("2026-05-06T00:00:00.000Z");
}

describe("staleInProgressItemIds", () => {
  it("cible les séries en cours inactives depuis ≥ 3 mois", () => {
    const ids = staleInProgressItemIds(
      [
        record({ itemId: "old", watchedIds: new Set(["e1"]), lastWatchedAt: OLD }),
        record({ itemId: "paused-recent", watchedIds: new Set(["e1"]), lastWatchedAt: PAUSED }),
        record({ itemId: "active", watchedIds: new Set(["e1"]), lastWatchedAt: RECENT }),
      ],
      NOW,
    );
    expect(ids).toEqual(["old"]);
  });

  it("ignore une série déjà en pause ou jamais commencée", () => {
    const ids = staleInProgressItemIds(
      [
        record({ itemId: "already", status: "PAUSED", watchedIds: new Set(["e1"]), lastWatchedAt: OLD }),
        record({ itemId: "fresh", status: "PLANNED" }),
      ],
      NOW,
    );
    expect(ids).toEqual([]);
  });
});
