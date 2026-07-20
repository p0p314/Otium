import { describe, expect, it } from "vitest";
import { FUTURE_MEDIA_TYPES, MediaType, Rating, WatchStatus } from "./media.js";

describe("Rating (0–10)", () => {
  it("accepte les entiers de 0 à 10", () => {
    expect(Rating.safeParse(0).success).toBe(true);
    expect(Rating.safeParse(10).success).toBe(true);
  });

  it("rejette hors bornes ou non entiers", () => {
    expect(Rating.safeParse(11).success).toBe(false);
    expect(Rating.safeParse(-1).success).toBe(false);
    expect(Rating.safeParse(7.5).success).toBe(false);
  });
});

describe("Enums de média", () => {
  it("MediaType couvre les types actifs (films, séries, livres)", () => {
    expect(MediaType.options).toEqual(["MOVIE", "SERIES", "BOOK"]);
  });

  it("les types encore à venir ne sont pas acceptés par le contrat", () => {
    expect(FUTURE_MEDIA_TYPES).not.toContain("BOOK");
    expect(MediaType.safeParse("MANGA").success).toBe(false);
  });

  it("WatchStatus couvre les états de consommation", () => {
    expect(WatchStatus.options).toContain("IN_PROGRESS");
    expect(WatchStatus.options).toContain("COMPLETED");
  });
});
