import { describe, expect, it } from "vitest";
import { extractTitleYear, normalizeTitle, pickBestMatch, scoreMatch } from "./matching";

describe("normalizeTitle", () => {
  it("retire accents, ponctuation et casse", () => {
    expect(normalizeTitle("L'Été Meurtrier !")).toBe("l ete meurtrier");
    expect(normalizeTitle("Spider-Man: No Way Home")).toBe("spider man no way home");
  });
});

describe("extractTitleYear", () => {
  it("extrait l'année entre parenthèses et nettoie le titre", () => {
    expect(extractTitleYear("The 100 (2014)")).toEqual({ title: "The 100", year: 2014 });
  });
  it("extrait une année en suffixe", () => {
    expect(extractTitleYear("Dune 2021")).toEqual({ title: "Dune", year: 2021 });
  });
  it("ne touche pas un titre sans année", () => {
    expect(extractTitleYear("Blade Runner")).toEqual({ title: "Blade Runner", year: null });
  });
  it("conserve une année seule comme titre", () => {
    expect(extractTitleYear("1984")).toEqual({ title: "1984", year: null });
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

  it("rapproche via le titre d'origine quand le titre est localisé", () => {
    // « The 100 » (export EN) vs « Les 100 » (catalogue FR) : le titre d'origine sauve le match.
    const score = scoreMatch(
      { title: "The 100", year: null },
      { externalId: "1", title: "Les 100", originalTitle: "The 100", year: 2014 },
    );
    expect(score).toBe(1);
  });
});

describe("pickBestMatch — titres localisés", () => {
  it("choisit la bonne série via le titre d'origine plutôt qu'un titre localisé proche", () => {
    // Sans titre d'origine, « The 100 Days » (0.67) battrait « Les 100 » (0.33).
    const best = pickBestMatch({ title: "The 100", year: null }, [
      { externalId: "days", title: "The 100 Days", year: 2013 },
      { externalId: "the100", title: "Les 100", originalTitle: "The 100", year: 2014 },
    ]);
    expect(best?.externalId).toBe("the100");
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
