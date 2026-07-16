import { describe, expect, it } from "vitest";
import type { ImportFile } from "../../domain";
import { TvTimeParser } from "./tvtime.parser";

const MOVIES = `entity_type,movie_name,type,release_date,runtime
movie,Dune,follow,2021-09-15 00:00:00,9300
movie,Dune,watch,2021-09-15 00:00:00,9300
movie,Tenet,follow,2020-08-26 00:00:00,
movie,Tenet,towatch,2020-08-26 00:00:00,9000
episode,Ignore Moi,watch,,`;

const SERIES = `key,series_name,season_number,episode_number,is_for_later,created_at
user-series-x,Chernobyl,,,false,
watch-episode-a,Chernobyl,1,1,,2026-01-10 20:00:00
watch-episode-b,Chernobyl,1,2,,2026-01-12 20:00:00
rewatch-episode-c,Chernobyl,1,2,,2026-03-01 21:00:00
user-series-y,Legion,,,true,`;

function files(): ImportFile[] {
  return [
    { name: "tracking-prod-records.csv", content: MOVIES },
    { name: "tracking-prod-records-v2.csv", content: SERIES },
  ];
}

describe("TvTimeParser", () => {
  const parser = new TvTimeParser();

  it("reconnaît l'export via ses fichiers", () => {
    expect(parser.supports(files())).toBe(true);
    expect(parser.supports([{ name: "autre.csv", content: "" }])).toBe(false);
  });

  it("normalise les films (vu → COMPLETED, à voir → PLANNED, durée en minutes)", () => {
    const movies = parser.parse(files()).medias.filter((m) => m.type === "MOVIE");
    const dune = movies.find((m) => m.title === "Dune");
    const tenet = movies.find((m) => m.title === "Tenet");

    expect(movies).toHaveLength(2); // la ligne entity_type=episode est ignorée
    expect(dune).toMatchObject({ status: "COMPLETED", year: 2021, runtimeMinutes: 155 });
    expect(tenet).toMatchObject({ status: "PLANNED", year: 2020, runtimeMinutes: 150 });
  });

  it("normalise les séries (épisodes vus dédupliqués, à voir via is_for_later)", () => {
    const series = parser.parse(files()).medias.filter((m) => m.type === "SERIES");
    const chernobyl = series.find((m) => m.title === "Chernobyl");
    const legion = series.find((m) => m.title === "Legion");

    expect(chernobyl?.status).toBe("IN_PROGRESS");
    expect(chernobyl?.watchedEpisodes).toEqual([
      { seasonNumber: 1, episodeNumber: 1, watchedAt: new Date("2026-01-10T20:00:00Z") },
      // Revu le 2026-03-01 : la date la plus récente l'emporte sur le premier visionnage.
      { seasonNumber: 1, episodeNumber: 2, watchedAt: new Date("2026-03-01T21:00:00Z") },
    ]);
    expect(legion).toMatchObject({ status: "PLANNED" });
    expect(legion?.watchedEpisodes).toHaveLength(0);
  });
});
