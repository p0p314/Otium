import { describe, expect, it } from "vitest";
import type { SeriesProgressRecord } from "../domain";
import { buildHomeDashboard } from "./home-dashboard.view";

const seasons = [
  {
    number: 1,
    episodes: [
      { id: "e1", seasonNumber: 1, number: 1, title: "Pilote" },
      { id: "e2", seasonNumber: 1, number: 2, title: "Suite" },
    ],
  },
];

function record(itemId: string, lastWatchedAt: Date | null): SeriesProgressRecord {
  return {
    itemId,
    title: `Série ${itemId}`,
    posterUrl: null,
    status: "IN_PROGRESS",
    seasons,
    watchedIds: new Set(["e1"]),
    lastWatchedAt,
  };
}

const NOW = new Date("2026-07-15T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("buildHomeDashboard", () => {
  it("classe les séries récentes en « à continuer » et les anciennes en « laissées de côté »", () => {
    const dashboard = buildHomeDashboard(
      [record("recent", daysAgo(3)), record("stale", daysAgo(40))],
      NOW,
    );

    expect(dashboard.continueWatching.map((s) => s.itemId)).toEqual(["recent"]);
    expect(dashboard.staleSeries.map((s) => s.itemId)).toEqual(["stale"]);
  });

  it("expose la reprise et la progression", () => {
    const [series] = buildHomeDashboard([record("s1", daysAgo(1))], NOW).continueWatching;
    expect(series?.nextEpisode?.id).toBe("e2");
    expect(series?.watchedEpisodes).toBe(1);
    expect(series?.totalEpisodes).toBe(2);
    expect(series?.lastWatchedAt).toBe(daysAgo(1).toISOString());
  });

  it("trie « à continuer » du plus récent au plus ancien", () => {
    const dashboard = buildHomeDashboard(
      [record("older", daysAgo(10)), record("newer", daysAgo(2))],
      NOW,
    );
    expect(dashboard.continueWatching.map((s) => s.itemId)).toEqual(["newer", "older"]);
  });

  it("trie « laissées de côté » de la plus délaissée à la moins délaissée", () => {
    const dashboard = buildHomeDashboard(
      [record("recentStale", daysAgo(35)), record("veryStale", daysAgo(90))],
      NOW,
    );
    expect(dashboard.staleSeries.map((s) => s.itemId)).toEqual(["veryStale", "recentStale"]);
  });
});
