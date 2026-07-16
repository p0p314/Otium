import { describe, expect, it } from "vitest";
import type { EpisodeRef, SeasonRef, SeriesProgressRecord } from "../domain";
import { buildHomeDashboard } from "./home-dashboard.view";

const NOW = new Date("2026-07-15T00:00:00.000Z");
const PAST = new Date("2026-07-01T00:00:00.000Z");
const FUTURE = new Date("2026-08-01T00:00:00.000Z");

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
    seasons: oneSeason([ep("e1", 1, PAST), ep("e2", 2, PAST)]),
    watchedIds: new Set(),
    lastWatchedAt: null,
    ...over,
  };
}

describe("buildHomeDashboard", () => {
  it("« à reprendre » : série commencée avec un épisode sorti non vu", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "started", watchedIds: new Set(["e1"]), lastWatchedAt: PAST })],
      NOW,
    );
    expect(d.series.toResume.map((s) => s.itemId)).toEqual(["started"]);
    expect(d.series.toStart).toEqual([]);
    expect(d.series.toResume[0]?.nextEpisode?.id).toBe("e2");
    expect(d.series.toResume[0]?.airedEpisodes).toBe(2);
  });

  it("« à commencer » : série non commencée avec au moins un épisode sorti", () => {
    const d = buildHomeDashboard([record({ itemId: "fresh", status: "PLANNED" })], NOW);
    expect(d.series.toStart.map((s) => s.itemId)).toEqual(["fresh"]);
    expect(d.series.toResume).toEqual([]);
  });

  it("exclut une série non commencée dont aucun épisode n'est sorti", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "unaired", status: "PLANNED", seasons: oneSeason([ep("e1", 1, FUTURE)]) })],
      NOW,
    );
    expect(d.series.toStart).toEqual([]);
    expect(d.series.toResume).toEqual([]);
  });

  it("exclut une série commencée dont tous les épisodes sortis sont vus (rien à reprendre)", () => {
    const d = buildHomeDashboard(
      [
        record({
          itemId: "uptodate",
          watchedIds: new Set(["e1", "e2"]),
          seasons: oneSeason([ep("e1", 1, PAST), ep("e2", 2, PAST), ep("e3", 3, FUTURE)]),
        }),
      ],
      NOW,
    );
    expect(d.series.toResume).toEqual([]);
    expect(d.series.toStart).toEqual([]);
  });

  it("ignore les séries abandonnées", () => {
    const d = buildHomeDashboard(
      [record({ itemId: "dropped", status: "DROPPED", watchedIds: new Set(["e1"]) })],
      NOW,
    );
    expect(d.series.toResume).toEqual([]);
    expect(d.series.toStart).toEqual([]);
  });

  it("trie « à reprendre » du plus récemment vu au plus ancien", () => {
    const older = new Date("2026-07-05T00:00:00.000Z");
    const newer = new Date("2026-07-14T00:00:00.000Z");
    const d = buildHomeDashboard(
      [
        record({ itemId: "older", watchedIds: new Set(["e1"]), lastWatchedAt: older }),
        record({ itemId: "newer", watchedIds: new Set(["e1"]), lastWatchedAt: newer }),
      ],
      NOW,
    );
    expect(d.series.toResume.map((s) => s.itemId)).toEqual(["newer", "older"]);
  });
});
