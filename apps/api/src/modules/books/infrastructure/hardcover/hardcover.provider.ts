import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../../shared/infrastructure/config/env";
import { HttpClient } from "../../../../shared/infrastructure/http/http-client";
import type { BookRecord } from "../../domain";
import { HARDCOVER_SOURCE, toBookRecord } from "./hardcover.mapper";
import type { HardcoverBook, HardcoverBooksResponse } from "./hardcover.types";

/**
 * Profondeur de requête maximale imposée par l'API (3). La requête ci-dessous s'y tient :
 * `books` → `contributions` → `author`.
 */
const TRENDING_QUERY = `
  query OtiumTrending($limit: Int!, $since: date!) {
    books(
      where: { release_date: { _gte: $since }, users_count: { _gt: 0 } }
      order_by: { users_count: desc }
      limit: $limit
    ) {
      id
      slug
      title
      description
      pages
      release_date
      rating
      ratings_count
      users_count
      users_read_count
      image { url }
      contributions { author { name } }
    }
  }
`;

/**
 * Adapter Hardcover — **découverte** de livres populaires.
 *
 * ⚠️ Hardcover n'expose **aucune** requête « tendances » : le schéma ne fournit que des
 * signaux bruts (`users_count`, `users_read_count`, `rating`). Le classement produit ici
 * est donc **le nôtre** — « les livres récents que le plus d'utilisateurs Hardcover ont
 * ajoutés » — et non un palmarès officiel. La formule est isolée dans cette requête :
 * la changer n'affecte rien d'autre.
 *
 * Deux contraintes de la plateforme, structurantes :
 * - **60 requêtes/minute** et profondeur de requête ≤ 3 ;
 * - **API en bêta**, jeton **personnel** (lié à un compte, pas à une application).
 *
 * D'où l'instantané quotidien stocké en base plutôt qu'un appel à la demande.
 */
@Injectable()
export class HardcoverProvider {
  readonly name = HARDCOVER_SOURCE;
  private readonly logger = new Logger(HardcoverProvider.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly http: HttpClient,
  ) {}

  /** Vrai si un jeton est configuré. Sans lui, la source est simplement absente. */
  isConfigured(): boolean {
    return Boolean(this.config.get("HARDCOVER_API_TOKEN", { infer: true }));
  }

  /**
   * Livres populaires du moment. `sinceMonths` borne la fenêtre de nouveauté : sans elle,
   * les classiques — qui cumulent des années de lectures — trusteraient la liste et la
   * rendraient immobile.
   */
  async fetchTrending(limit: number, sinceMonths = 24): Promise<BookRecord[]> {
    const token = this.config.get("HARDCOVER_API_TOKEN", { infer: true });
    if (!token) {
      throw new ServiceUnavailableException("Hardcover indisponible : jeton non configuré.");
    }

    const since = new Date();
    since.setMonth(since.getMonth() - sinceMonths);

    const response = await this.http.postJson<HardcoverBooksResponse>(
      this.config.get("HARDCOVER_API_URL", { infer: true }),
      {
        query: TRENDING_QUERY,
        variables: { limit, since: since.toISOString().slice(0, 10) },
      },
      { Authorization: `Bearer ${token}` },
    );

    // GraphQL répond 200 même en erreur : sans cette vérification, une requête invalide
    // (schéma modifié en bêta) passerait pour un résultat vide et effacerait l'instantané.
    if (response.errors?.length) {
      const detail = response.errors.map((e) => e.message ?? "?").join(" / ");
      throw new ServiceUnavailableException(`Hardcover a répondu en erreur : ${detail}`);
    }

    const books: HardcoverBook[] = response.data?.books ?? [];
    const records = books.map(toBookRecord).filter((b): b is BookRecord => b !== null);
    this.logger.log(`Hardcover : ${records.length} livre(s) populaire(s) récupéré(s).`);
    return records;
  }
}
