import { describe, expect, it } from "vitest";
import { isIsbn, normalizeIsbn, parseIsbn } from "./isbn";

describe("normalizeIsbn", () => {
  it("retire tirets et espaces et majuscule la clé de contrôle", () => {
    expect(normalizeIsbn(" 2-221-2520-5x ")).toBe("222125205X");
  });
});

describe("isIsbn", () => {
  it("accepte un ISBN-13 valide", () => {
    expect(isIsbn("9782221252055")).toBe(true);
    expect(isIsbn("978-2-221-25205-5")).toBe(true);
  });

  it("accepte un ISBN-10 valide, y compris avec clé X", () => {
    expect(isIsbn("2070360024")).toBe(true);
    expect(isIsbn("080442957X")).toBe(true);
  });

  it("rejette une clé de contrôle fausse", () => {
    expect(isIsbn("9782221252054")).toBe(false);
    expect(isIsbn("2070360025")).toBe(false);
  });

  it("rejette ce qui n'a pas la bonne longueur", () => {
    expect(isIsbn("1984")).toBe(false);
    expect(isIsbn("Dune")).toBe(false);
  });
});

describe("parseIsbn", () => {
  it("extrait l'ISBN normalisé d'une saisie", () => {
    expect(parseIsbn("  978-2-221-25205-5 ")).toBe("9782221252055");
  });

  it("ne prend pas un titre numérique pour un ISBN", () => {
    expect(parseIsbn("1984")).toBeNull();
    expect(parseIsbn("2001 l'odyssée de l'espace")).toBeNull();
  });
});
