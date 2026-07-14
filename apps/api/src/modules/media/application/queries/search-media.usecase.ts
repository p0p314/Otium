import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogMediaType, CatalogSearchResult } from "../../domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../domain";

export interface SearchMediaInput {
  readonly q: string;
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * Recherche des médias dans le catalogue via le port `MediaCatalogProvider`.
 * Le use case orchestre ; il ignore quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class SearchMediaUseCase implements UseCase<SearchMediaInput, CatalogSearchResult> {
  constructor(
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  execute(input: SearchMediaInput): Promise<CatalogSearchResult> {
    const params = {
      query: input.q,
      page: input.page,
      pageSize: input.pageSize,
      ...(input.type ? { type: input.type } : {}),
    };
    return this.catalog.search(params);
  }
}
