import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  type BookProvider,
  type BookRecord,
  COMMUNITY_BOOK_REPOSITORY,
  type CommunityBookRepository,
  FALLBACK_BOOK_PROVIDER,
  matchCommunityBook,
  PRIMARY_BOOK_PROVIDER,
} from "../domain";

/**
 * Nombre de livres réexaminés par exécution. Borne volontaire : la synchronisation
 * s'exécute à l'occasion d'une requête utilisateur, elle ne doit pas déclencher des
 * centaines d'appels réseau d'un coup (éco-conception). Le reliquat sera repris à
 * l'échéance suivante.
 */
export const RECONCILE_BATCH_SIZE = 10;

/**
 * Candidats examinés par source. Le mieux classé n'est pas toujours le bon ouvrage —
 * une édition, un guide ou une étude peuvent le devancer. La règle de rapprochement étant
 * stricte, examiner quelques candidats augmente le taux de réussite sans risque.
 */
const CANDIDATES_PER_SOURCE = 5;

export interface ReconcileReport {
  readonly examined: number;
  readonly promoted: number;
  /** Examinés sans rapprochement : aucun candidat sûr, ou équivalent déjà suivi. */
  readonly unmatched: number;
}

/**
 * Recherche, pour chaque livre saisi par un utilisateur, s'il est désormais disponible
 * chez un fournisseur officiel — et l'y rattache le cas échéant (chantier 4).
 *
 * L'opération est **transparente** : le livre garde son identifiant interne, donc sa
 * place en bibliothèque, sa note, son avis, ses favoris, ses dates, sa progression et son
 * historique. Seules ses métadonnées s'enrichissent.
 *
 * La règle de rapprochement est pure et volontairement stricte (`matchCommunityBook`) :
 * en cas de doute, on ne rapproche pas. Un rapprochement manqué ne coûte rien — le livre
 * sera réexaminé ; un rapprochement erroné remplacerait l'ouvrage d'un utilisateur par un
 * autre, en emportant tout ce qu'il y a attaché.
 */
@Injectable()
export class ReconcileCommunityBooksUseCase {
  private readonly logger = new Logger(ReconcileCommunityBooksUseCase.name);

  constructor(
    @Inject(COMMUNITY_BOOK_REPOSITORY) private readonly books: CommunityBookRepository,
    @Inject(PRIMARY_BOOK_PROVIDER) private readonly primary: BookProvider,
    @Inject(FALLBACK_BOOK_PROVIDER) private readonly fallback: BookProvider,
  ) {}

  async execute(): Promise<ReconcileReport> {
    const pending = await this.books.listPending(RECONCILE_BATCH_SIZE);
    let promoted = 0;

    for (const own of pending) {
      // `findOfficial` n'en renvoie qu'un dont la règle a jugé qu'il désigne le même
      // ouvrage : il n'y a plus rien à décider ici.
      const candidate = await this.findOfficial(own);
      if (!candidate) {
        this.logger.debug(`« ${own.title} » : aucun équivalent officiel sûr`);
        continue;
      }

      if (await this.books.promote(own.externalId, candidate)) {
        promoted += 1;
        this.logger.log(`« ${own.title} » rattaché au catalogue.`);
      } else {
        // L'ouvrage officiel est déjà suivi : on laisse le livre communautaire tel quel
        // plutôt que de fusionner deux médias et leurs bibliothèques.
        this.logger.debug(`« ${own.title} » : équivalent officiel déjà présent, ignoré`);
      }
    }

    return { examined: pending.length, promoted, unmatched: pending.length - promoted };
  }

  /**
   * Cherche l'équivalent officiel : par ISBN quand on en a un — c'est une identité —
   * sinon par titre et auteur. La source prioritaire d'abord, le secours ensuite.
   *
   * Une source indisponible n'interrompt pas la synchronisation : le livre sera réexaminé
   * à la prochaine échéance.
   */
  private async findOfficial(own: BookRecord): Promise<BookRecord | null> {
    const isbn = own.isbn13 ?? own.isbn10;
    for (const provider of [this.primary, this.fallback]) {
      try {
        const candidates = isbn
          ? [await provider.findByIsbn(isbn)]
          : await this.searchByTitleAndAuthor(provider, own);
        // Tous les candidats sont soumis à la règle : le mieux classé par le fournisseur
        // n'est pas toujours le bon ouvrage, et la règle est assez stricte pour trancher
        // sans risque. N'en examiner qu'un ferait manquer des rapprochements légitimes.
        for (const candidate of candidates) {
          if (candidate && matchCommunityBook(own, candidate).confidence === "CERTAIN") {
            return candidate;
          }
        }
      } catch (error) {
        this.logger.debug(`Source « ${provider.name} » indisponible : ${(error as Error).message}`);
      }
    }
    return null;
  }

  private async searchByTitleAndAuthor(
    provider: BookProvider,
    own: BookRecord,
  ): Promise<BookRecord[]> {
    // Sans auteur, le rapprochement serait de toute façon rejeté : on s'épargne l'appel.
    const author = own.authors[0];
    if (!author) return [];
    const page = await provider.searchBooks({
      query: `${own.title} ${author}`,
      page: 1,
      pageSize: CANDIDATES_PER_SOURCE,
    });
    return [...page.items];
  }
}
