import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogEpisodeDetails } from "../../domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../domain";

export interface GetEpisodeDetailsInput {
  readonly externalId: string;
  readonly seasonNumber: number;
  readonly episodeNumber: number;
}

/**
 * Fiche détaillée d'un épisode (résumé, image, casting) via le port `MediaCatalogProvider`.
 * Le use case ignore quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class GetEpisodeDetailsUseCase implements UseCase<GetEpisodeDetailsInput, CatalogEpisodeDetails> {
  constructor(@Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider) {}

  execute({ externalId, seasonNumber, episodeNumber }: GetEpisodeDetailsInput): Promise<CatalogEpisodeDetails> {
    return this.catalog.getEpisodeDetails(externalId, seasonNumber, episodeNumber);
  }
}
