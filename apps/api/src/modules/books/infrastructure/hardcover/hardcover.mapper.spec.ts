import { describe, expect, it } from "vitest";
import { toBookRecord } from "./hardcover.mapper";
import type { HardcoverBook } from "./hardcover.types";

const livre: HardcoverBook = {
  id: 12345,
  slug: "la-horde-du-contrevent",
  title: "La Horde du Contrevent",
  description: "Une horde remonte le vent.",
  pages: 700,
  release_date: "2004-05-01",
  rating: 4.5,
  ratings_count: 320,
  users_count: 1200,
  image: { url: "https://images.hardcover.app/x.jpg" },
  contributions: [{ author: { name: "Alain Damasio" } }],
};

describe("toBookRecord (Hardcover)", () => {
  it("normalise un livre complet", () => {
    expect(toBookRecord(livre)).toMatchObject({
      externalId: "12345",
      source: "hardcover",
      title: "La Horde du Contrevent",
      authors: ["Alain Damasio"],
      pageCount: 700,
      publishedDate: "2004-05-01",
      infoUrl: "https://hardcover.app/books/la-horde-du-contrevent",
    });
  });

  it("convertit la note de l'échelle /5 vers /10", () => {
    expect(toBookRecord(livre)?.averageRating).toBe(9);
  });

  it("retombe sur l'image mise en cache quand l'image principale manque", () => {
    const sansImage = { ...livre, image: undefined, cached_image: { url: "https://c.jpg" } };
    expect(toBookRecord(sansImage)?.coverUrl).toBe("https://c.jpg");
  });

  it("laisse ISBN et pagination à null — Hardcover les porte sur les éditions", () => {
    // Sans conséquence : cette source sert à découvrir, pas à décrire.
    expect(toBookRecord({ id: 1, title: "T" })).toMatchObject({
      isbn10: null,
      isbn13: null,
      pageCount: null,
    });
  });

  it("tolère l'absence de chaque champ optionnel — l'API est en bêta", () => {
    const minimal = toBookRecord({ id: 1, title: "Titre seul" });
    expect(minimal).toMatchObject({
      authors: [],
      description: null,
      coverUrl: null,
      averageRating: null,
      infoUrl: null,
    });
  });

  it("rejette un livre sans identifiant ou sans titre", () => {
    expect(toBookRecord({ title: "Sans identifiant" })).toBeNull();
    expect(toBookRecord({ id: 1 })).toBeNull();
    expect(toBookRecord({ id: 1, title: "   " })).toBeNull();
  });
});
