import { describe, expect, it } from "vitest";
import type { EpisodeCandidate, MovieCandidate, UserPreferences } from "./models/notification";
import { planNotifications } from "./notification-planning";

const NOW = new Date("2026-07-22T12:00:00.000Z");

function episode(overrides: Partial<EpisodeCandidate> = {}): EpisodeCandidate {
  return {
    userId: "u1",
    mediaId: "m1",
    provider: "tmdb",
    externalId: "1399",
    seriesTitle: "One Piece",
    posterUrl: "https://img/poster.jpg",
    episodeId: "ep1",
    seasonNumber: 1,
    episodeNumber: 5,
    episodeTitle: "Un nouvel arc",
    airDate: new Date("2026-07-22T00:00:00.000Z"),
    ...overrides,
  };
}

function movie(overrides: Partial<MovieCandidate> = {}): MovieCandidate {
  return {
    userId: "u1",
    mediaId: "mv1",
    provider: "tmdb",
    externalId: "76600",
    title: "Avatar 3",
    posterUrl: "https://img/avatar.jpg",
    releaseDate: new Date("2026-07-29T00:00:00.000Z"),
    ...overrides,
  };
}

const ALL_ON: ReadonlyMap<string, UserPreferences> = new Map();

describe("planNotifications", () => {
  describe("séries", () => {
    it("planifie une notification de nouvel épisode", () => {
      const [n] = planNotifications({
        episodes: [episode()],
        movies: [],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(n?.type).toBe("episode");
      expect(n?.dedupKey).toBe("EPISODE:ep1");
      expect(n?.content.title).toBe("Nouvel épisode disponible !");
      expect(n?.content.body).toContain("One Piece");
      expect(n?.content.url).toBe("/media/SERIES/1399");
    });

    it("traite le premier épisode d'une saison ≥ 2 comme une nouvelle saison", () => {
      const [n] = planNotifications({
        episodes: [episode({ seasonNumber: 5, episodeNumber: 1, seriesTitle: "The Bear" })],
        movies: [],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(n?.type).toBe("season");
      expect(n?.dedupKey).toBe("SEASON:m1:5");
      expect(n?.content.title).toBe("Nouvelle saison disponible !");
      expect(n?.content.body).toContain("Saison 5");
    });

    it("garde le premier épisode de la saison 1 comme un épisode (pas une saison)", () => {
      const [n] = planNotifications({
        episodes: [episode({ seasonNumber: 1, episodeNumber: 1 })],
        movies: [],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(n?.type).toBe("episode");
    });
  });

  describe("films", () => {
    it("planifie un rappel J-7 pour un film à venir dans sept jours", () => {
      const [n] = planNotifications({
        episodes: [],
        movies: [movie({ releaseDate: new Date("2026-07-29T12:00:00.000Z") })],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(n?.type).toBe("movie_reminder");
      expect(n?.dedupKey).toBe("MOVIE_REMINDER:mv1");
      expect(n?.content.body).toBe("Avatar 3 sort dans 7 jours.");
      expect(n?.content.url).toBe("/media/MOVIE/76600");
    });

    it("planifie une sortie du jour pour un film sorti dans la fenêtre récente", () => {
      const [n] = planNotifications({
        episodes: [],
        movies: [movie({ releaseDate: new Date("2026-07-22T06:00:00.000Z") })],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(n?.type).toBe("movie_release");
      expect(n?.dedupKey).toBe("MOVIE_RELEASE:mv1");
      expect(n?.content.body).toBe("Avatar 3 est officiellement sorti.");
    });

    it("ignore un film dont la sortie dépasse la fenêtre de rappel de sept jours", () => {
      const planned = planNotifications({
        episodes: [],
        movies: [movie({ releaseDate: new Date("2026-08-15T00:00:00.000Z") })],
        preferences: ALL_ON,
        now: NOW,
      });

      expect(planned).toHaveLength(0);
    });
  });

  describe("préférences", () => {
    it("filtre chaque canal désactivé indépendamment", () => {
      const preferences = new Map<string, UserPreferences>([
        ["u1", { newEpisodes: false, newSeasons: true, movieReminder: false, movieRelease: true }],
      ]);

      const planned = planNotifications({
        episodes: [
          episode({ episodeId: "epX" }),
          episode({ seasonNumber: 2, episodeNumber: 1, episodeId: "epY" }),
        ],
        movies: [
          movie({ mediaId: "mvA", releaseDate: new Date("2026-07-29T12:00:00.000Z") }),
          movie({ mediaId: "mvB", releaseDate: new Date("2026-07-22T06:00:00.000Z") }),
        ],
        preferences,
        now: NOW,
      });

      const types = planned.map((n) => n.type).sort();
      // newEpisodes off + movieReminder off → il ne reste que season + movie_release.
      expect(types).toEqual(["movie_release", "season"]);
    });
  });

  it("dédoublonne les notifications convergentes (même userId + dedupKey)", () => {
    const planned = planNotifications({
      episodes: [episode(), episode()],
      movies: [],
      preferences: ALL_ON,
      now: NOW,
    });

    expect(planned).toHaveLength(1);
  });

  it("sépare les notifications par utilisateur", () => {
    const planned = planNotifications({
      episodes: [episode({ userId: "u1" }), episode({ userId: "u2" })],
      movies: [],
      preferences: ALL_ON,
      now: NOW,
    });

    expect(planned.map((n) => n.userId).sort()).toEqual(["u1", "u2"]);
  });
});
