import { describe, expect, it } from "vitest";
import { normalizeTitle, pickBestMatch, scoreMatch } from "./matching";

describe("normalizeTitle", () => {
  it("retire accents, ponctuation et casse", () => {
    expect(normalizeTitle("L'Été Meurtrier !")).toBe("l ete meurtrier");
    expect(normalizeTitle("Spider-Man: No Way Home")).toBe("spider man no way home");
  });
});

describe("scoreMatch", () => {
  it("titre identique et même année = score maximal", () => {
    expect(
      scoreMatch({ title: "Dune", year: 2021 }, { externalId: "1", title: "Dune", year: 2021 }),
    ).toBeCloseTo(1.15);
  });

  it("pénalise une année éloignée", () => {
    const same = scoreMatch(
      { title: "Dune", year: 2021 },
      { externalId: "1", title: "Dune", year: 2021 },
    );
    const far = scoreMatch(
      { title: "Dune", year: 2021 },
      { externalId: "2", title: "Dune", year: 1984 },
    );
    expect(far).toBeLessThan(same);
  });
});

describe("pickBestMatch", () => {
  const candidates = [
    { externalId: "10", title: "The Batman", year: 2022 },
    { externalId: "11", title: "Batman Begins", year: 2005 },
    { externalId: "12", title: "Batman", year: 1989 },
  ];

  it("choisit le meilleur candidat (titre + année)", () => {
    const best = pickBestMatch({ title: "The Batman", year: 2022 }, candidates);
    expect(best?.externalId).toBe("10");
  });

  it("retourne null sous le seuil (aucun candidat pertinent)", () => {
    const best = pickBestMatch({ title: "Un titre totalement différent", year: 2000 }, [
      { externalId: "99", title: "Autre chose", year: 1990 },
    ]);
    expect(best).toBeNull();
  });

  it("départage à score égal en gardant le premier (pertinence du fournisseur)", () => {
    const best = pickBestMatch({ title: "Dune", year: null }, [
      { externalId: "a", title: "Dune", year: 2021 },
      { externalId: "b", title: "Dune", year: 1984 },
    ]);
    expect(best?.externalId).toBe("a");
  });
});
