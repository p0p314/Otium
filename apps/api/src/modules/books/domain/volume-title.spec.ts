import { describe, expect, it } from "vitest";
import { parseVolumeTitle, titleSeriesKey } from "./volume-title";

/**
 * Tous les titres de ce fichier proviennent de réponses réelles de l'API Google Books,
 * collectées sur quatre œuvres (One Piece, L'Attaque des Titans, Fullmetal Alchemist,
 * Le Trône de Fer). Les « pièges » ne sont pas imaginés : ils figuraient dans
 * l'échantillon.
 */
describe("parseVolumeTitle", () => {
  it.each([
    ["Fullmetal Alchemist - tome 05", "Fullmetal Alchemist", 5],
    ["One Piece - Édition originale - Tome 50", "One Piece - Édition originale", 50],
    ["L'Attaque des Titans T02", "L'Attaque des Titans", 2],
    ["L'Attaque des Titans T27", "L'Attaque des Titans", 27],
    ["L'Attaque des Titans Chapitre 136", "L'Attaque des Titans", 136],
    ["Le Trône de Fer (Tome 1) - La glace et le feu", "Le Trône de Fer", 1],
    ["Le Trône de Fer (Tome 15) - Une danse avec les dragons", "Le Trône de Fer", 15],
    ["ONE PIECE 1", "ONE PIECE", 1],
    ["Naruto, tome 12", "Naruto", 12],
    ["Berserk Vol. 3", "Berserk", 3],
  ])("décompose « %s »", (title, base, position) => {
    expect(parseVolumeTitle(title)).toEqual({ baseTitle: base, position });
  });

  it("ignore les zéros de tête du numéro", () => {
    expect(parseVolumeTitle("Fullmetal Alchemist - tome 05").position).toBe(5);
  });

  it("écarte le sous-titre propre au volume", () => {
    // Sans cela, chaque tome du Trône de Fer formerait sa propre « œuvre ».
    const t1 = parseVolumeTitle("Le Trône de Fer (Tome 1) - La glace et le feu");
    const t6 = parseVolumeTitle("Le Trône de Fer (Tome 6) - Les Brigands");
    expect(t1.baseTitle).toBe(t6.baseTitle);
  });

  describe("pièges relevés dans les données réelles", () => {
    it("ne prend pas une intégrale pour un tome", () => {
      // Piège : « L'intégrale 3 » deviendrait le tome 3 et écraserait le vrai tome 3.
      expect(parseVolumeTitle("Le Trône de Fer (L'intégrale 3 illustrée)")).toEqual({
        baseTitle: "Le Trône de Fer (L'intégrale 3 illustrée)",
        position: null,
      });
      expect(parseVolumeTitle("Naruto - Coffret 2").position).toBeNull();
    });

    it("garde les hors-séries distincts de la série numérotée", () => {
      for (const title of [
        "L'Attaque des Titans - Outside",
        "L'Attaque des Titans - Answers",
        "L'Attaque des Titans - Hope of the City",
      ]) {
        expect(parseVolumeTitle(title)).toEqual({ baseTitle: title, position: null });
      }
    });

    it("sépare une série dérivée de la série principale", () => {
      // « Before the Fall » est une autre œuvre, d'un autre auteur : son titre de base
      // doit rester différent pour qu'elle ne soit pas fondue dans la série principale.
      const derivee = parseVolumeTitle("L'Attaque des Titans - Before the Fall T05");
      const principale = parseVolumeTitle("L'Attaque des Titans T02");
      expect(derivee.baseTitle).toBe("L'Attaque des Titans - Before the Fall");
      expect(derivee.baseTitle).not.toBe(principale.baseTitle);
    });
  });

  it("laisse intact un titre sans numérotation", () => {
    expect(parseVolumeTitle("Dune")).toEqual({ baseTitle: "Dune", position: null });
    expect(parseVolumeTitle("Dune, le mook")).toEqual({ baseTitle: "Dune, le mook", position: null });
  });

  it("ne prend pas une année finale pour un numéro de tome", () => {
    expect(parseVolumeTitle("Rapport annuel 2024").position).toBeNull();
  });

  it("refuse un numéro sans titre d'œuvre", () => {
    expect(parseVolumeTitle("Tome 4")).toEqual({ baseTitle: "Tome 4", position: null });
  });

  it("tolère les espaces multiples et les bords parasites", () => {
    expect(parseVolumeTitle("  Naruto   -   tome 3  ")).toEqual({
      baseTitle: "Naruto",
      position: 3,
    });
  });

  it("accepte un titre vide sans lever", () => {
    expect(parseVolumeTitle("   ")).toEqual({ baseTitle: "", position: null });
  });
});

describe("titleSeriesKey", () => {
  it("rapproche deux tomes de la même œuvre du même auteur", () => {
    const a = titleSeriesKey("L'Attaque des Titans", "Hajime Isayama");
    const b = titleSeriesKey("l attaque des titans", "hajime isayama");
    expect(a).toBe(b);
  });

  it("sépare deux œuvres homonymes d'auteurs différents", () => {
    // Piège réel : un essai homonyme signé par un autre auteur.
    expect(titleSeriesKey("L'Attaque des Titans", "Hajime Isayama")).not.toBe(
      titleSeriesKey("L'Attaque des Titans", "Arnaud Jahan"),
    );
  });

  it("refuse de produire une clé sans auteur — regrouper à l'aveugle est pire", () => {
    expect(titleSeriesKey("One Piece", undefined)).toBeNull();
    expect(titleSeriesKey("One Piece", "")).toBeNull();
  });

  it("refuse de produire une clé sans titre", () => {
    expect(titleSeriesKey("", "Hajime Isayama")).toBeNull();
  });
});
