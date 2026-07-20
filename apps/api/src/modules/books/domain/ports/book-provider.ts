import type { BookRecord, BookSearchPage } from "../models/book";

export interface BookSearchParams {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Port d'une **source** de livres (Google Books, Open Library, et d'autres demain).
 * Volontairement minimal : trois opérations suffisent au catalogue. Ajouter une source =
 * écrire un adapter, sans toucher au métier ni à la fusion (ADR-0004 / ADR-0016).
 *
 * Contrat d'erreur : une source **indisponible** lève ; une recherche **sans résultat**
 * renvoie une page vide et `getByExternalId`/`findByIsbn` renvoient `null`. Cette
 * distinction permet à l'orchestration de basculer sur le secours à bon escient.
 */
export interface BookProvider {
  readonly name: string;
  searchBooks(params: BookSearchParams): Promise<BookSearchPage>;
  /** Fiche par identifiant propre à la source (`null` si inconnue). */
  getByExternalId(externalId: string): Promise<BookRecord | null>;
  /** Fiche par ISBN normalisé (`null` si la source ne connaît pas ce livre). */
  findByIsbn(isbn: string): Promise<BookRecord | null>;
}

/** Jeton d'injection (DI) de la source **prioritaire** (Google Books en V1). */
export const PRIMARY_BOOK_PROVIDER = Symbol("PRIMARY_BOOK_PROVIDER");

/** Jeton d'injection (DI) de la source de **secours** (Open Library en V1). */
export const FALLBACK_BOOK_PROVIDER = Symbol("FALLBACK_BOOK_PROVIDER");
