import { Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../../../shared/infrastructure/cache/cache.service";
import type { Env } from "../../../shared/infrastructure/config/env";
import type {
  CatalogCollection,
  CatalogMediaDetails,
  CatalogMediaType,
  CatalogSearchResult,
  MediaCatalogProvider,
  MediaCatalogSearchParams,
} from "../../media/domain";
import {
  type BookProvider,
  type BookRecord,
  type BookRecord as Book,
  COMMUNITY_BOOK_REPOSITORY,
  type CommunityBookRepository,
  dedupeBooks,
  FALLBACK_BOOK_PROVIDER,
  groupVolumes,
  type VolumeGroup,
  mergeBooks,
  needsFallback,
  parseIsbn,
  PRIMARY_BOOK_PROVIDER,
  toCatalogMedia,
  toCatalogMediaDetails,
} from "../domain";
import { BOOKS_PROVIDER } from "../domain";

/**
 * Adapter « livres » du socle `MediaCatalogProvider` : c'est lui qui applique la stratégie
 * Google Books → Open Library (ADR-0016) et met les résultats en cache.
 *
 * Trois responsabilités, toutes techniques (la règle de fusion, elle, est pure et vit dans
 * le domaine) :
 * 1. **Priorité** : la source principale répond ; le secours ne fait que combler.
 * 2. **Résilience** : une source qui tombe n'interrompt jamais le service — on sert ce
 *    qu'on a, quitte à ne rien compléter (risque R1).
 * 3. **Sobriété** : cache à TTL long (les données d'un livre ne changent pas) et appel au
 *    secours seulement lorsqu'il manque quelque chose.
 */
@Injectable()
export class CompositeBookCatalogProvider implements MediaCatalogProvider {
  readonly name = "books";
  private readonly logger = new Logger(CompositeBookCatalogProvider.name);

  constructor(
    @Inject(PRIMARY_BOOK_PROVIDER) private readonly primary: BookProvider,
    @Inject(FALLBACK_BOOK_PROVIDER) private readonly fallback: BookProvider,
    @Inject(COMMUNITY_BOOK_REPOSITORY) private readonly community: CommunityBookRepository,
    private readonly cache: CacheService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(params: MediaCatalogSearchParams): Promise<CatalogSearchResult> {
    const query = params.query.trim();
    // Le champ interrogé fait partie de la clé : « Camus » par titre et par auteur ne
    // donnent pas les mêmes résultats.
    const cacheKey = `books:search:${params.field ?? "ALL"}:${params.page}:${params.pageSize}:${query.toLowerCase()}`;
    const cached = this.cache.get<CatalogSearchResult>(cacheKey);
    if (cached) return cached;

    const field = params.field ?? "ALL";
    const search = { query, page: params.page, pageSize: params.pageSize, field };
    // Les livres saisis par les utilisateurs sont interrogés **en parallèle** des sources
    // distantes, jamais en repli : ce sont leurs propres données, elles doivent remonter
    // même quand un catalogue répond abondamment.
    const [primary, own] = await Promise.all([
      this.trySearch(this.primary, search),
      this.tryCommunitySearch(query, params.pageSize, field),
    ]);
    // Le secours n'entre en jeu que si la source principale n'a rien donné d'exploitable :
    // une recherche fructueuse ne déclenche aucun appel réseau supplémentaire.
    const fallback =
      primary === null || primary.items.length === 0 ? await this.trySearch(this.fallback, search) : null;

    if (primary === null && fallback === null && own.length === 0) {
      throw new ServiceUnavailableException(
        "Les catalogues de livres sont momentanément indisponibles.",
      );
    }

    // Les livres communautaires passent en tête : l'utilisateur a saisi ce livre parce
    // qu'aucun catalogue ne le connaissait, le lui cacher derrière eux serait absurde.
    const deduped = dedupeBooks([...own, ...(primary?.items ?? []), ...(fallback?.items ?? [])]);
    // Les tomes d'une même œuvre sont réunis en une entrée : une recherche « One Piece »
    // ne doit pas noyer les autres résultats sous cent onze volumes.
    const { groups, standalone } = groupVolumes(deduped);

    const result: CatalogSearchResult = {
      items: standalone.slice(0, params.pageSize).map(toCatalogMedia),
      page: params.page,
      pageSize: params.pageSize,
      total: primary?.total ?? fallback?.total ?? 0,
      ...(groups.length > 0 ? { collections: groups.map((g) => this.toCollection(g)) } : {}),
    };
    this.cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Traduit une œuvre reconstituée vers le modèle catalogue. Sa couverture et ses auteurs
   * sont ceux du premier volume disposant de l'information — en pratique le tome 1, qui
   * porte l'identité visuelle de l'œuvre.
   */
  private toCollection(group: VolumeGroup): CatalogCollection {
    const withCover = group.volumes.find((v: Book) => v.coverUrl !== null);
    const withAuthors = group.volumes.find((v: Book) => v.authors.length > 0);
    return {
      ref: { provider: BOOKS_PROVIDER, externalId: group.key },
      title: group.title,
      coverUrl: withCover?.coverUrl ?? null,
      authors: withAuthors ? [...withAuthors.authors] : [],
      volumeCount: group.volumes.length,
      positions: group.volumes
        .map((v: Book) => v.series?.position ?? null)
        .filter((p): p is number => p !== null),
      volumes: group.volumes.map(toCatalogMedia),
    };
  }

  async getMediaDetails(
    type: CatalogMediaType,
    externalId: string,
  ): Promise<CatalogMediaDetails> {
    if (type !== "BOOK") {
      throw new NotFoundException(`Le catalogue de livres ne couvre pas le type « ${type} ».`);
    }
    const cacheKey = `books:details:${externalId}`;
    const cached = this.cache.get<CatalogMediaDetails>(cacheKey);
    if (cached) return cached;

    const book = await this.resolveBook(externalId);
    if (!book) throw new NotFoundException("Livre introuvable dans les catalogues.");

    const result = toCatalogMediaDetails(book);
    this.cacheSet(cacheKey, result);
    return result;
  }

  /**
   * Assemble la fiche : source principale d'abord, puis complément par le secours si des
   * informations essentielles manquent (couverture, description, ISBN). Le rapprochement
   * entre les deux sources se fait par ISBN — la clé la plus fiable dont on dispose.
   */
  private async resolveBook(externalId: string): Promise<BookRecord | null> {
    // Une lecture en base coûte bien moins qu'un appel réseau : on regarde d'abord si
    // l'identifiant désigne un livre communautaire.
    const own = await this.community.findByExternalId(externalId);
    if (own) return own;

    const primary = await this.tryGet(this.primary, externalId);
    if (!needsFallback(primary)) return primary;

    const complement = await this.findComplement(primary, externalId);
    if (!primary) return complement;
    return mergeBooks(primary, complement);
  }

  /** Cherche la fiche de secours correspondante : par ISBN si connu, sinon par titre. */
  private async findComplement(
    primary: BookRecord | null,
    externalId: string,
  ): Promise<BookRecord | null> {
    try {
      if (!primary) {
        // Sans fiche principale, `externalId` peut désigner directement une œuvre du
        // secours (livre ajouté alors que Google Books était indisponible).
        return await this.fallback.getByExternalId(externalId);
      }
      const isbn = primary.isbn13 ?? primary.isbn10;
      if (isbn) return await this.fallback.findByIsbn(isbn);
      const page = await this.fallback.searchBooks({
        query: [primary.title, primary.authors[0]].filter(Boolean).join(" "),
        page: 1,
        pageSize: 1,
      });
      return page.items[0] ?? null;
    } catch (error) {
      this.logger.warn(
        `Complément « ${this.fallback.name} » indisponible : ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Recherche communautaire. Une panne de base ne doit pas faire échouer la recherche
   * entière : les sources distantes peuvent encore répondre.
   */
  private async tryCommunitySearch(
    query: string,
    limit: number,
    field: NonNullable<MediaCatalogSearchParams["field"]>,
  ): Promise<Book[]> {
    try {
      return await this.community.search(query, limit, field);
    } catch (error) {
      this.logger.warn(`Livres communautaires indisponibles : ${(error as Error).message}`);
      return [];
    }
  }

  /** Recherche tolérante : `null` signale une source en panne (et non « aucun résultat »). */
  private async trySearch(
    provider: BookProvider,
    params: { query: string; page: number; pageSize: number },
  ): Promise<{ items: readonly BookRecord[]; total: number } | null> {
    try {
      return await provider.searchBooks(params);
    } catch (error) {
      this.logger.warn(`Source « ${provider.name} » indisponible : ${(error as Error).message}`);
      return null;
    }
  }

  private async tryGet(provider: BookProvider, externalId: string): Promise<BookRecord | null> {
    try {
      // Un identifiant peut aussi être un ISBN (lien externe, import) : on route en
      // conséquence plutôt que d'échouer sur une recherche par identifiant interne.
      const isbn = parseIsbn(externalId);
      return isbn ? await provider.findByIsbn(isbn) : await provider.getByExternalId(externalId);
    } catch (error) {
      this.logger.warn(`Source « ${provider.name} » indisponible : ${(error as Error).message}`);
      return null;
    }
  }

  private cacheSet<T>(key: string, value: T): void {
    this.cache.set(key, value, this.config.get("BOOKS_CACHE_TTL_SECONDS", { infer: true }));
  }
}
