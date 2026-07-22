import type { BookRecord } from "../models/book";

/**
 * Instantané des livres populaires d'une source.
 *
 * Le stockage est **délibéré** : la source impose un quota et son jeton est personnel, ce
 * qui interdit un appel à la demande. C'est aussi ce qui permet de continuer à afficher
 * quelque chose quand elle est indisponible — l'instantané précédent reste servi.
 */
export interface TrendingBooksRepository {
  /**
   * Remplace l'instantané d'une source. Atomique : un remplacement interrompu ne doit pas
   * laisser une liste à moitié effacée, ce qui viderait l'écran de découverte.
   */
  replace(source: string, books: readonly BookRecord[]): Promise<void>;
  /** Instantané courant, dans l'ordre du classement. Vide si jamais synchronisé. */
  list(source: string, limit: number): Promise<BookRecord[]>;
}

export const TRENDING_BOOKS_REPOSITORY = Symbol("TRENDING_BOOKS_REPOSITORY");
