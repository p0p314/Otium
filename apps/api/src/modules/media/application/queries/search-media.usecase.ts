import { Inject, Injectable, Logger } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type {
  CatalogMediaType,
  CatalogSearchField,
  CatalogSearchResult,
  MediaCatalogProvider,
} from "../../domain";
import {
  MEDIA_CATALOG_REGISTRY,
  type MediaCatalogRegistry,
  mergeSearchResults,
} from "../../domain";

export interface SearchMediaInput {
  readonly q: string;
  readonly page: number;
  readonly pageSize: number;
  /** Type unique recherché. Absent = tous les types couverts par les catalogues. */
  readonly type?: CatalogMediaType;
  /** Sélection multi-types (prioritaire sur `type`), ex. films + livres. */
  readonly types?: readonly CatalogMediaType[];
  /** Champ interrogé (titre, auteur). Défaut : tout. */
  readonly field?: CatalogSearchField;
}

/**
 * Recherche dans **tous** les catalogues compétents pour les types demandés, puis fusionne
 * les pages (ADR-0015). Le use case orchestre ; il ignore quels fournisseurs concrets
 * répondent (ADR-0004).
 *
 * Résilience : une source en panne n'annule pas la recherche — ses résultats manquent,
 * les autres sont servis (dégradation gracieuse, risque R1).
 */
@Injectable()
export class SearchMediaUseCase implements UseCase<SearchMediaInput, CatalogSearchResult> {
  private readonly logger = new Logger(SearchMediaUseCase.name);

  constructor(
    @Inject(MEDIA_CATALOG_REGISTRY) private readonly registry: MediaCatalogRegistry,
  ) {}

  async execute(input: SearchMediaInput): Promise<CatalogSearchResult> {
    const requested = this.requestedTypes(input);
    const results = await Promise.all(
      this.groupByProvider(requested).map(({ provider, types }) =>
        this.searchOne(provider, types, input),
      ),
    );
    return mergeSearchResults(
      results.filter((r): r is CatalogSearchResult => r !== null),
      input.page,
      input.pageSize,
    );
  }

  /** Types effectivement recherchés : sélection explicite, sinon tout le périmètre couvert. */
  private requestedTypes(input: SearchMediaInput): readonly CatalogMediaType[] {
    const explicit = input.types?.length ? input.types : input.type ? [input.type] : null;
    if (!explicit) return this.registry.supportedTypes();
    return explicit.filter((type) => this.registry.supports(type));
  }

  /**
   * Regroupe les types par fournisseur : un catalogue couvrant plusieurs types demandés
   * n'est interrogé **qu'une fois** (ex. TMDB pour films + séries = une seule requête
   * multi — moins d'appels réseau, éco-conception).
   */
  private groupByProvider(
    types: readonly CatalogMediaType[],
  ): { provider: MediaCatalogProvider; types: CatalogMediaType[] }[] {
    const groups = new Map<MediaCatalogProvider, CatalogMediaType[]>();
    for (const type of types) {
      const provider = this.registry.forType(type);
      const existing = groups.get(provider);
      if (existing) existing.push(type);
      else groups.set(provider, [type]);
    }
    return [...groups].map(([provider, grouped]) => ({ provider, types: grouped }));
  }

  private async searchOne(
    provider: MediaCatalogProvider,
    types: readonly CatalogMediaType[],
    input: SearchMediaInput,
  ): Promise<CatalogSearchResult | null> {
    // Un seul type demandé → filtre explicite ; plusieurs → on laisse le fournisseur
    // répondre sur l'ensemble de son périmètre (recherche « multi »).
    const only = types.length === 1 ? types[0] : undefined;
    try {
      return await provider.search({
        query: input.q,
        page: input.page,
        pageSize: input.pageSize,
        ...(only ? { type: only } : {}),
        ...(input.field ? { field: input.field } : {}),
      });
    } catch (error) {
      this.logger.warn(
        `Catalogue « ${provider.name} » indisponible pour la recherche : ${(error as Error).message}`,
      );
      return null;
    }
  }
}
