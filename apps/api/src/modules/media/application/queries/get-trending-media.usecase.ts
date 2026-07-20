import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogMediaType, CatalogSearchResult } from "../../domain";
import { TRENDING_CATALOG_PROVIDER, type TrendingCatalogProvider } from "../../domain";

export interface GetTrendingMediaInput {
  readonly page: number;
  readonly pageSize: number;
  readonly type?: CatalogMediaType;
}

/**
 * Tendances du moment via la capacité `TrendingCatalogProvider` (mise en avant sous la
 * recherche). Capacité **optionnelle** du catalogue : tous les types de média n'en ont pas
 * (les livres, par exemple — voir ADR-0015). Le use case ignore quel fournisseur répond.
 */
@Injectable()
export class GetTrendingMediaUseCase implements UseCase<GetTrendingMediaInput, CatalogSearchResult> {
  constructor(
    @Inject(TRENDING_CATALOG_PROVIDER) private readonly catalog: TrendingCatalogProvider,
  ) {}

  execute(input: GetTrendingMediaInput): Promise<CatalogSearchResult> {
    return this.catalog.getTrending({
      page: input.page,
      pageSize: input.pageSize,
      ...(input.type ? { type: input.type } : {}),
    });
  }
}
