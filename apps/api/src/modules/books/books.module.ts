import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { CreateBookUseCase } from "./application/create-book.usecase";
import { CompositeBookCatalogProvider } from "./infrastructure/composite-book-catalog.provider";
import { GoogleBooksProvider } from "./infrastructure/google-books/google-books.provider";
import { OpenLibraryProvider } from "./infrastructure/open-library/open-library.provider";
import { PrismaCommunityBookRepository } from "./infrastructure/community/community-book.repository";
import { BooksController } from "./presentation/books.controller";
import {
  COMMUNITY_BOOK_REPOSITORY,
  FALLBACK_BOOK_PROVIDER,
  PRIMARY_BOOK_PROVIDER,
} from "./domain";

/**
 * Catalogue de livres. N'expose qu'une chose : un fournisseur conforme au socle
 * `MediaCatalogProvider`, que le module média enregistre pour le type `BOOK`. Changer
 * l'ordre des sources — ou en ajouter une — se fait **ici seulement** (ADR-0016).
 */
@Module({
  imports: [AuthenticationModule], // AuthGuard de la création de livre
  controllers: [BooksController],
  providers: [
    CreateBookUseCase,
    { provide: COMMUNITY_BOOK_REPOSITORY, useClass: PrismaCommunityBookRepository },
    GoogleBooksProvider,
    OpenLibraryProvider,
    { provide: PRIMARY_BOOK_PROVIDER, useExisting: GoogleBooksProvider },
    { provide: FALLBACK_BOOK_PROVIDER, useExisting: OpenLibraryProvider },
    CompositeBookCatalogProvider,
  ],
  exports: [CompositeBookCatalogProvider],
})
export class BooksModule {}
