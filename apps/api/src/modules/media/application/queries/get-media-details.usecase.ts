import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogMediaDetails, CatalogMediaType } from "../../domain";
import { MEDIA_CATALOG_REGISTRY, type MediaCatalogRegistry } from "../../domain";

export interface GetMediaDetailsInput {
  readonly type: CatalogMediaType;
  readonly externalId: string;
}

/**
 * Fiche détaillée d'un média : le registry choisit le catalogue compétent selon le type
 * (ADR-0015). Le use case ignore quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class GetMediaDetailsUseCase implements UseCase<GetMediaDetailsInput, CatalogMediaDetails> {
  constructor(
    @Inject(MEDIA_CATALOG_REGISTRY) private readonly registry: MediaCatalogRegistry,
  ) {}

  execute({ type, externalId }: GetMediaDetailsInput): Promise<CatalogMediaDetails> {
    return this.registry.forType(type).getMediaDetails(type, externalId);
  }
}
