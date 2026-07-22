import type { BookRecord } from "../../domain";
import type { HardcoverBook } from "./hardcover.types";

export const HARDCOVER_SOURCE = "hardcover";

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Convertit un livre Hardcover vers le modèle normalisé. Renvoie `null` sans identifiant
 * ni titre : une fiche sans identité n'est pas exploitable.
 *
 * Hardcover ne fournit **ni ISBN ni pagination fiable** au niveau du livre (ils vivent sur
 * les éditions) : ces champs restent `null`. C'est sans conséquence ici — cette source
 * sert à *découvrir* des titres, pas à les décrire ; l'ouverture d'une fiche passe par
 * Google Books et Open Library, qui les renseignent.
 */
export function toBookRecord(book: HardcoverBook): BookRecord | null {
  const id = book.id !== undefined ? String(book.id) : null;
  const title = text(book.title);
  if (!id || !title) return null;

  const cover = text(book.image?.url) ?? text(book.cached_image?.url);
  const authors = (book.contributions ?? [])
    .map((contribution) => text(contribution.author?.name))
    .filter((name): name is string => name !== null);

  return {
    externalId: id,
    source: HARDCOVER_SOURCE,
    title,
    subtitle: null,
    authors,
    description: text(book.description),
    coverUrl: cover,
    coverUrlLarge: cover,
    categories: [],
    publishedDate: text(book.release_date),
    pageCount: book.pages && book.pages > 0 ? book.pages : null,
    language: null,
    publisher: null,
    isbn10: null,
    isbn13: null,
    googleBooksId: null,
    openLibraryId: null,
    infoUrl: book.slug ? `https://hardcover.app/books/${book.slug}` : null,
    previewUrl: null,
    // Hardcover note sur 5 ; Otium raisonne sur 10 partout (contrat `Rating`).
    averageRating: book.rating != null ? book.rating * 2 : null,
    ratingsCount: book.ratings_count ?? null,
    sources: [HARDCOVER_SOURCE],
    series: null,
  };
}
