import { normalizeIsbn } from "./isbn";
import type { BookRecord } from "./models/book";

/**
 * Fusion d'une fiche prioritaire avec une fiche de secours (**fonction pure**, ADR-0016).
 *
 * Règle unique et non négociable : **une donnée de la source prioritaire n'est jamais
 * écrasée**. Le secours ne fait que combler les trous (`null` ou tableau vide). Les
 * sources ayant réellement contribué sont tracées dans `sources`, ce qui rend la fusion
 * auditable depuis la fiche affichée.
 */

/** Garde la valeur prioritaire dès qu'elle existe ; sinon celle du secours. */
function keep<T>(primary: T | null, fallback: T | null): T | null {
  return primary ?? fallback;
}

/** Idem pour les listes : le secours ne sert que si la liste prioritaire est vide. */
function keepList(primary: readonly string[], fallback: readonly string[]): readonly string[] {
  return primary.length > 0 ? primary : fallback;
}

export function mergeBooks(primary: BookRecord, fallback: BookRecord | null): BookRecord {
  if (!fallback) return primary;
  return {
    // Identité : celle de la source prioritaire, toujours (un changement d'identifiant
    // casserait les références déjà enregistrées en bibliothèque).
    externalId: primary.externalId,
    source: primary.source,
    // Un titre vide n'a aucune valeur d'usage : dans ce seul cas, le secours prend la main.
    title: primary.title.trim() ? primary.title : fallback.title,
    subtitle: keep(primary.subtitle, fallback.subtitle),
    authors: keepList(primary.authors, fallback.authors),
    description: keep(primary.description, fallback.description),
    coverUrl: keep(primary.coverUrl, fallback.coverUrl),
    coverUrlLarge: keep(primary.coverUrlLarge, fallback.coverUrlLarge),
    categories: keepList(primary.categories, fallback.categories),
    publishedDate: keep(primary.publishedDate, fallback.publishedDate),
    pageCount: keep(primary.pageCount, fallback.pageCount),
    language: keep(primary.language, fallback.language),
    publisher: keep(primary.publisher, fallback.publisher),
    isbn10: keep(primary.isbn10, fallback.isbn10),
    isbn13: keep(primary.isbn13, fallback.isbn13),
    googleBooksId: keep(primary.googleBooksId, fallback.googleBooksId),
    openLibraryId: keep(primary.openLibraryId, fallback.openLibraryId),
    infoUrl: keep(primary.infoUrl, fallback.infoUrl),
    previewUrl: keep(primary.previewUrl, fallback.previewUrl),
    averageRating: keep(primary.averageRating, fallback.averageRating),
    ratingsCount: keep(primary.ratingsCount, fallback.ratingsCount),
    sources: [...new Set([...primary.sources, ...fallback.sources])],
  };
}

/**
 * Une fiche est « complète » si elle porte les informations sans lesquelles l'expérience
 * se dégrade nettement : couverture, description et ISBN. En dessous, on interroge le
 * secours — au-dessus, on s'en abstient (un appel réseau évité, éco-conception).
 */
export function needsFallback(book: BookRecord | null): boolean {
  if (!book) return true;
  return book.coverUrl === null || book.description === null || book.isbn13 === null;
}

/** Clé de rapprochement : ISBN-13, puis ISBN-10, puis titre + premier auteur normalisés. */
export function identityKey(book: BookRecord): string {
  if (book.isbn13) return `isbn13:${normalizeIsbn(book.isbn13)}`;
  if (book.isbn10) return `isbn10:${normalizeIsbn(book.isbn10)}`;
  const author = book.authors[0] ?? "";
  return `title:${slug(book.title)}|${slug(author)}`;
}

/** Normalisation typographique : casse, accents et ponctuation ne doivent pas séparer deux fois le même livre. */
function slug(value: string): string {
  return value
    .normalize("NFD")
    // Retire les diacritiques (plage Unicode des marques combinantes).
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Déduplique une liste de fiches en fusionnant celles qui désignent le même livre.
 * L'ordre d'entrée fait foi : la première occurrence garde sa place et sa priorité.
 */
export function dedupeBooks(books: readonly BookRecord[]): BookRecord[] {
  const byKey = new Map<string, BookRecord>();
  for (const book of books) {
    const key = identityKey(book);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeBooks(existing, book) : book);
  }
  return [...byKey.values()];
}
