import { describe, expect, it } from "vitest";
import {
  toCatalogEpisodeDetails,
  toCatalogMedia,
  toCatalogMovieDetails,
  toCatalogTvDetails,
} from "./tmdb.mapper";
import type {
  TmdbEpisodeDetails,
  TmdbMovieDetailsFull,
  TmdbSearchItem,
  TmdbTvDetailsFull,
} from "./tmdb.types";

const IMG = "https://img/w342";
const ROOT = "https://image.tmdb.org/t/p/";

describe("toCatalogMedia", () => {
  it("mappe un film", () => {
    const item: TmdbSearchItem = {
      id: 438631,
      media_type: "movie",
      title: "Dune",
      release_date: "2021-09-15",
      poster_path: "/dune.jpg",
    };
    expect(toCatalogMedia(item, IMG)).toEqual({
      externalRef: { provider: "tmdb", externalId: "438631" },
      type: "MOVIE",
      title: "Dune",
      originalTitle: null,
      year: 2021,
      posterUrl: "https://img/w342/dune.jpg",
      genres: [],
    });
  });

  it("expose le titre d'origine quand il diffère du titre localisé", () => {
    const item: TmdbSearchItem = {
      id: 48866,
      media_type: "tv",
      name: "Les 100",
      original_name: "The 100",
      first_air_date: "2014-03-19",
    };
    expect(toCatalogMedia(item, IMG)?.originalTitle).toBe("The 100");
  });

  it("n'expose pas de titre d'origine identique au titre localisé", () => {
    const item: TmdbSearchItem = {
      id: 1399,
      media_type: "tv",
      name: "Game of Thrones",
      original_name: "Game of Thrones",
    };
    expect(toCatalogMedia(item, IMG)?.originalTitle).toBeNull();
  });

  it("mappe une série (name/first_air_date) sans poster", () => {
    const item: TmdbSearchItem = {
      id: 1399,
      media_type: "tv",
      name: "Game of Thrones",
      first_air_date: "2011-04-17",
      poster_path: null,
    };
    const result = toCatalogMedia(item, IMG);
    expect(result?.type).toBe("SERIES");
    expect(result?.title).toBe("Game of Thrones");
    expect(result?.year).toBe(2011);
    expect(result?.posterUrl).toBeNull();
  });

  it("écarte les personnes et types non supportés", () => {
    expect(toCatalogMedia({ id: 1, media_type: "person", name: "X" }, IMG)).toBeNull();
  });

  it("gère une date absente", () => {
    const result = toCatalogMedia({ id: 2, media_type: "movie", title: "Sans date" }, IMG);
    expect(result?.year).toBeNull();
  });
});

describe("toCatalogMovieDetails", () => {
  const movie: TmdbMovieDetailsFull = {
    id: 438631,
    title: "Dune",
    original_title: "Dune",
    overview: "Paul Atreides…",
    poster_path: "/p.jpg",
    backdrop_path: "/b.jpg",
    vote_average: 7.8,
    vote_count: 1200,
    release_date: "2021-09-15",
    status: "Released",
    runtime: 155,
    genres: [{ id: 878, name: "Science-Fiction" }],
    production_companies: [{ name: "Legendary", logo_path: "/l.png" }],
    credits: {
      cast: [{ name: "Timothée Chalamet", character: "Paul", profile_path: "/tc.jpg", order: 0 }],
      crew: [
        { name: "Denis Villeneuve", job: "Director" },
        { name: "Autre", job: "Producer" },
      ],
    },
    "watch/providers": {
      results: { FR: { flatrate: [{ provider_name: "Netflix", logo_path: "/n.png" }] } },
    },
  };

  it("mappe les champs riches, le réalisateur et les plateformes (FR)", () => {
    const d = toCatalogMovieDetails(movie, ROOT, "FR");
    expect(d.type).toBe("MOVIE");
    expect(d.title).toBe("Dune");
    expect(d.backdropUrl).toBe("https://image.tmdb.org/t/p/w780/b.jpg");
    expect(d.posterUrl).toBe("https://image.tmdb.org/t/p/w342/p.jpg");
    expect(d.rating).toBe(7.8);
    expect(d.runtimeMinutes).toBe(155);
    expect(d.numberOfSeasons).toBeNull();
    expect(d.genres).toEqual([{ id: "878", label: "Science-Fiction" }]);
    expect(d.directors).toEqual(["Denis Villeneuve"]);
    expect(d.cast[0]).toEqual({
      name: "Timothée Chalamet",
      character: "Paul",
      profileUrl: "https://image.tmdb.org/t/p/w185/tc.jpg",
    });
    expect(d.watchProviders).toEqual([
      { name: "Netflix", logoUrl: "https://image.tmdb.org/t/p/w154/n.png" },
    ]);
  });

  it("note nulle quand aucun vote", () => {
    const d = toCatalogMovieDetails({ ...movie, vote_average: 0, vote_count: 0 }, ROOT, "FR");
    expect(d.rating).toBeNull();
  });
});

describe("toCatalogTvDetails", () => {
  it("mappe une série (créateurs, saisons/épisodes)", () => {
    const tv: TmdbTvDetailsFull = {
      id: 1399,
      name: "Game of Thrones",
      original_name: "Game of Thrones",
      number_of_seasons: 8,
      number_of_episodes: 73,
      created_by: [{ name: "David Benioff" }, { name: "D. B. Weiss" }],
      genres: [{ id: 18, name: "Drame" }],
    };
    const d = toCatalogTvDetails(tv, ROOT, "FR");
    expect(d.type).toBe("SERIES");
    expect(d.numberOfSeasons).toBe(8);
    expect(d.numberOfEpisodes).toBe(73);
    expect(d.runtimeMinutes).toBeNull();
    expect(d.directors).toEqual(["David Benioff", "D. B. Weiss"]);
    expect(d.watchProviders).toEqual([]);
  });
});

describe("toCatalogEpisodeDetails", () => {
  const ROOT = "https://image.tmdb.org/t/p/";

  it("mappe résumé, image, note et casting (récurrents + invités, sans doublon)", () => {
    const episode: TmdbEpisodeDetails = {
      season_number: 1,
      episode_number: 3,
      name: "Le long chemin",
      overview: "Un résumé.",
      air_date: "2014-04-02",
      runtime: 43,
      still_path: "/still.jpg",
      vote_average: 8.4,
      credits: { cast: [{ name: "Actrice A", character: "Héroïne", profile_path: "/a.jpg" }] },
      guest_stars: [
        { name: "Invité B", character: "Méchant" },
        { name: "Actrice A", character: "Héroïne" }, // doublon → ignoré
      ],
    };
    const d = toCatalogEpisodeDetails(episode, ROOT);

    expect(d).toMatchObject({
      seasonNumber: 1,
      number: 3,
      title: "Le long chemin",
      overview: "Un résumé.",
      airDate: "2014-04-02",
      runtimeMinutes: 43,
      stillUrl: "https://image.tmdb.org/t/p/w780/still.jpg",
      rating: 8.4,
    });
    expect(d.cast).toEqual([
      { name: "Actrice A", character: "Héroïne", profileUrl: "https://image.tmdb.org/t/p/w185/a.jpg" },
      { name: "Invité B", character: "Méchant", profileUrl: null },
    ]);
  });

  it("gère un épisode sans titre ni note", () => {
    const d = toCatalogEpisodeDetails({ season_number: 2, episode_number: 5, vote_average: 0 }, ROOT);
    expect(d.title).toBe("Épisode 5");
    expect(d.rating).toBeNull();
    expect(d.cast).toEqual([]);
  });
});
