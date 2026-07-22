import { Inject, Injectable, Logger } from "@nestjs/common";
import type { CatalogSearchResult } from "../../media/domain";
import { DueJobRunner } from "../../../shared/infrastructure/jobs/due-job.runner";
import {
  toCatalogMedia,
  TRENDING_BOOKS_REPOSITORY,
  type TrendingBooksRepository,
} from "../domain";
import { HARDCOVER_SOURCE } from "../infrastructure/hardcover/hardcover.mapper";
import { HardcoverProvider } from "../infrastructure/hardcover/hardcover.provider";

/** Identifiant de la tâche de synchronisation des livres populaires. */
const TRENDING_JOB = "hardcover-trending-sync";

/** Une journée : les tendances bougent lentement, et le quota de la source est limité. */
const TRENDING_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Taille de l'instantané conservé. Au-delà, la page de découverte n'a plus d'usage. */
const SNAPSHOT_SIZE = 30;

/**
 * Livres à découvrir, servis **depuis la base**.
 *
 * La source (Hardcover) impose un quota de 60 requêtes/minute et son jeton est personnel :
 * l'appeler à chaque affichage serait intenable. Un instantané quotidien est donc
 * rafraîchi par une tâche périodique (ADR-0019), déclenchée à l'occasion d'un affichage.
 *
 * En cas d'indisponibilité de la source, **le dernier instantané reste servi** : la
 * synchronisation échoue, la page de découverte non.
 */
@Injectable()
export class GetBookDiscoveriesUseCase {
  private readonly logger = new Logger(GetBookDiscoveriesUseCase.name);

  constructor(
    @Inject(TRENDING_BOOKS_REPOSITORY) private readonly snapshots: TrendingBooksRepository,
    private readonly hardcover: HardcoverProvider,
    private readonly jobs: DueJobRunner,
  ) {}

  async execute(limit = 20): Promise<CatalogSearchResult> {
    // Déclenché sans être attendu : l'affichage sert l'instantané courant, la
    // synchronisation profite à la visite suivante.
    if (this.hardcover.isConfigured()) {
      void this.jobs.runIfDue(TRENDING_JOB, TRENDING_INTERVAL_MS, () => this.sync());
    }

    const books = await this.snapshots.list(HARDCOVER_SOURCE, limit);
    return {
      items: books.map(toCatalogMedia),
      page: 1,
      pageSize: limit,
      total: books.length,
    };
  }

  /**
   * Rafraîchit l'instantané. Un résultat **vide** n'écrase rien : un schéma modifié en
   * bêta ou une requête devenue invalide ne doit pas effacer des données encore valables.
   */
  private async sync(): Promise<void> {
    const books = await this.hardcover.fetchTrending(SNAPSHOT_SIZE);
    if (books.length === 0) {
      this.logger.warn("Hardcover n'a renvoyé aucun livre : instantané précédent conservé.");
      return;
    }
    await this.snapshots.replace(HARDCOVER_SOURCE, books);
  }
}
