import type { BookRecord } from "../models/book";

/** Livre créé par un utilisateur, tel qu'on le persiste. */
export interface NewCommunityBook {
  readonly title: string;
  readonly subtitle: string | null;
  readonly authors: readonly string[];
  readonly description: string | null;
  readonly coverUrl: string | null;
  readonly publishedDate: string | null;
  readonly pageCount: number | null;
  readonly isbn10: string | null;
  readonly isbn13: string | null;
  readonly categories: readonly string[];
  readonly language: string | null;
  readonly publisher: string | null;
}

/**
 * Port des livres **communautaires** : ceux qu'un utilisateur a saisis parce qu'aucun
 * catalogue ne les connaissait. Ils vivent dans la base d'Otium et deviennent aussitôt
 * utilisables comme n'importe quel autre livre — bibliothèque, suivi, statistiques,
 * favoris, recherche.
 */
export interface CommunityBookRepository {
  /** Crée le livre et renvoie sa forme normalisée, identifiant compris. */
  create(book: NewCommunityBook): Promise<BookRecord>;
  /**
   * Recherche par titre et/ou auteur, insensible à la casse. `field` restreint le
   * critère ; `ALL` interroge les deux.
   */
  search(query: string, limit: number, field?: "ALL" | "TITLE" | "AUTHOR"): Promise<BookRecord[]>;
  findByExternalId(externalId: string): Promise<BookRecord | null>;
  findByIsbn(isbn: string): Promise<BookRecord | null>;
  /** Livres communautaires à réexaminer, les plus anciennement créés d'abord. */
  listPending(limit: number): Promise<BookRecord[]>;
  /**
   * Associe un livre communautaire à son équivalent officiel : la **même ligne** change
   * de référence externe et reçoit les métadonnées du catalogue.
   *
   * Rien n'est recréé, donc rien n'est perdu : bibliothèques, notes, avis, favoris,
   * dates, progression et historique pointent sur cet identifiant interne et ne bougent
   * pas. Renvoie `false` si l'ouvrage officiel est **déjà** présent en base — fusionner
   * deux médias déjà suivis est une opération distincte, qu'on ne tente pas ici.
   */
  promote(communityExternalId: string, official: BookRecord): Promise<boolean>;
}

export const COMMUNITY_BOOK_REPOSITORY = Symbol("COMMUNITY_BOOK_REPOSITORY");

/** Fournisseur sous lequel les livres communautaires sont référencés. */
export const COMMUNITY_SOURCE = "community";
