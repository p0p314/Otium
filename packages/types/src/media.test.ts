import { describe, expect, it } from "vitest";
import { MediaType, Rating, WatchStatus } from "./media.js";

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
  it("MediaType supporte MOVIE et SERIES en V1", () => {
    expect(MediaType.options).toEqual(["MOVIE", "SERIES"]);
  });

  it("WatchStatus couvre les états de consommation", () => {
    expect(WatchStatus.options).toContain("IN_PROGRESS");
    expect(WatchStatus.options).toContain("COMPLETED");
  });
});
