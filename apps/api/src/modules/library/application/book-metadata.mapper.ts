import type { CatalogMediaDetails } from "../../media/domain";
import type { BookMetadata, CollectionDescriptor } from "../domain";

/**
 * Extrait les métadonnées de livre à persister depuis la fiche catalogue. Les données
 * puisent à **deux** niveaux, par construction du modèle générique (ADR-0003) : le bloc
 * `book` porte ce qui est propre au livre (ISBN, pagination, éditeur), tandis que
 * description, catégories et note moyenne vivent au niveau `Media` commun.
 *
 * Renvoie `null` si la fiche n'est pas celle d'un livre — l'appelant n'a alors rien à
 * persister.
 */
/**
 * Extrait l'œuvre à laquelle rattacher le volume. `null` quand le catalogue n'a pas
 * établi d'appartenance — on ne devine pas ici, le rattachement se décide en amont.
 */
export function toCollectionDescriptor(
  details: CatalogMediaDetails,
): CollectionDescriptor | null {
  const collection = details.book?.collection;
  if (!collection) return null;
  return {
    provider: collection.provider,
    externalId: collection.id,
    title: collection.title,
    method: collection.method,
    position: collection.position,
  };
}

export function toBookMetadata(details: CatalogMediaDetails): BookMetadata | null {
  const book = details.book;
  if (!book) return null;
  return {
    subtitle: book.subtitle,
    authors: [...book.authors],
    description: details.overview,
    pageCount: book.pageCount,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    language: book.language,
    categories: details.genres.map((genre) => genre.label),
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    googleBooksId: book.googleBooksId,
    openLibraryId: book.openLibraryId,
    infoUrl: book.infoUrl,
    previewUrl: book.previewUrl,
    averageRating: details.rating,
    ratingsCount: details.voteCount,
    coverUrlLarge: book.coverUrlLarge,
    sources: [...book.sources],
  };
}
