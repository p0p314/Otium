import { Module } from "@nestjs/common";
import { CompositeBookCatalogProvider } from "./infrastructure/composite-book-catalog.provider";
import { GoogleBooksProvider } from "./infrastructure/google-books/google-books.provider";
import { OpenLibraryProvider } from "./infrastructure/open-library/open-library.provider";
import { FALLBACK_BOOK_PROVIDER, PRIMARY_BOOK_PROVIDER } from "./domain";

/**
 * Catalogue de livres. N'expose qu'une chose : un fournisseur conforme au socle
 * `MediaCatalogProvider`, que le module média enregistre pour le type `BOOK`. Changer
 * l'ordre des sources — ou en ajouter une — se fait **ici seulement** (ADR-0016).
 */
@Module({
  providers: [
    GoogleBooksProvider,
    OpenLibraryProvider,
    { provide: PRIMARY_BOOK_PROVIDER, useExisting: GoogleBooksProvider },
    { provide: FALLBACK_BOOK_PROVIDER, useExisting: OpenLibraryProvider },
    CompositeBookCatalogProvider,
  ],
  exports: [CompositeBookCatalogProvider],
})
export class BooksModule {}
