import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogMediaDetails, CatalogMediaType } from "../../domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../domain";

export interface GetMediaDetailsInput {
  readonly type: CatalogMediaType;
  readonly externalId: string;
}

/**
 * Fiche détaillée d'un média via le port `MediaCatalogProvider`. Le use case ignore
 * quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class GetMediaDetailsUseCase implements UseCase<GetMediaDetailsInput, CatalogMediaDetails> {
  constructor(
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  execute({ type, externalId }: GetMediaDetailsInput): Promise<CatalogMediaDetails> {
    return this.catalog.getMediaDetails(type, externalId);
  }
}
