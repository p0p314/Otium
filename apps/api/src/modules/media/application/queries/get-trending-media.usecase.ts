import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogMediaType, CatalogSearchResult } from "../../domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../domain";

export interface GetTrendingMediaInput {
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * Tendances du moment via le port `MediaCatalogProvider` (mise en avant sous la
 * recherche). Le use case ignore quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class GetTrendingMediaUseCase implements UseCase<GetTrendingMediaInput, CatalogSearchResult> {
  constructor(
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  execute(input: GetTrendingMediaInput): Promise<CatalogSearchResult> {
    return this.catalog.getTrending({
      page: input.page,
      pageSize: input.pageSize,
      ...(input.type ? { type: input.type } : {}),
    });
  }
}
