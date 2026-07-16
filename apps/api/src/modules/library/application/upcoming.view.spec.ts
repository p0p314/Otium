import { describe, expect, it } from "vitest";
import type { EpisodeRef, SeasonRef, SeriesProgressRecord } from "../domain";
import { buildUpcoming } from "./upcoming.view";

const NOW = new Date("2026-07-15T00:00:00.000Z");
const d = (iso: string) => new Date(iso);

function ep(id: string, n: number, airDate: Date | null): EpisodeRef {
  return { id, seasonNumber: 1, number: n, title: `E${n}`, airDate };
}
function rec(
  itemId: string,
  episodes: EpisodeRef[],
  status: SeriesProgressRecord["status"] = "IN_PROGRESS",
): SeriesProgressRecord {
  const seasons: SeasonRef[] = [{ number: 1, episodes }];
  return {
    itemId,
    title: `Série ${itemId}`,
    posterUrl: null,
    status,
    seasons,
    watchedIds: new Set(),
    lastWatchedAt: null,
  };
}

describe("buildUpcoming", () => {
  it("liste les épisodes à diffusion future, triés par date croissante", () => {
    const result = buildUpcoming(
      [
        rec("a", [ep("a1", 1, d("2026-07-01T00:00:00Z")), ep("a2", 2, d("2026-09-01T00:00:00Z"))]),
        rec("b", [ep("b1", 1, d("2026-08-01T00:00:00Z"))]),
      ],
      [],
      NOW,
    );
    expect(result.series.map((e) => `${e.itemId}:${e.number}`)).toEqual(["b:1", "a:2"]);
    expect(result.series[0]?.airDate).toBe(d("2026-08-01T00:00:00Z").toISOString());
  });

  it("exclut les séries abandonnées et les épisodes sans date / déjà sortis", () => {
    const result = buildUpcoming(
      [
        rec("dropped", [ep("x", 1, d("2026-08-01T00:00:00Z"))], "DROPPED"),
        rec("noDate", [ep("y", 1, null)]),
        rec("aired", [ep("z", 1, d("2026-07-01T00:00:00Z"))]),
      ],
      [],
      NOW,
    );
    expect(result.series).toEqual([]);
  });

  it("liste les films à venir, cloisonnés et triés par date de sortie", () => {
    const result = buildUpcoming(
      [],
      [
        { itemId: "m2", title: "Avatar 3", posterUrl: null, releaseDate: d("2026-12-19T00:00:00Z") },
        { itemId: "m1", title: "Dune 3", posterUrl: null, releaseDate: d("2026-10-01T00:00:00Z") },
      ],
      NOW,
    );
    expect(result.movies.map((m) => m.itemId)).toEqual(["m1", "m2"]);
    expect(result.movies[0]?.releaseDate).toBe(d("2026-10-01T00:00:00Z").toISOString());
    expect(result.series).toEqual([]);
  });
});
