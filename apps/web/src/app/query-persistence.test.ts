import { describe, expect, it } from "vitest";
import { isPersistableQuery } from "./query-persistence";

describe("isPersistableQuery (confidentialité localStorage — VULN-10)", () => {
  it("autorise la persistance des requêtes publiques (catalogue)", () => {
    expect(isPersistableQuery(["media-search", "dune", "all"])).toBe(true);
    expect(isPersistableQuery(["trending", "MOVIE"])).toBe(true);
    expect(isPersistableQuery(["media-details", "MOVIE", "42"])).toBe(true);
    expect(isPersistableQuery(["episode-details", "1", 1, 1])).toBe(true);
  });

  it("refuse la persistance des requêtes personnelles (PII)", () => {
    for (const key of [
      "library",
      "home-dashboard",
      "stats",
      "viewing-stats",
      "upcoming",
      "import-job",
    ]) {
      expect(isPersistableQuery([key])).toBe(false);
    }
  });

  it("refuse une clé vide ou non-string", () => {
    expect(isPersistableQuery([])).toBe(false);
    expect(isPersistableQuery([42])).toBe(false);
  });
});
