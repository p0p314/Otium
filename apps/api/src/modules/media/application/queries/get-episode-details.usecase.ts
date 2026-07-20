import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../../shared/application/use-case";
import type { CatalogEpisodeDetails } from "../../domain";
import { SERIES_CATALOG_PROVIDER, type SeriesCatalogProvider } from "../../domain";

export interface GetEpisodeDetailsInput {
  readonly externalId: string;
  readonly seasonNumber: number;
  readonly episodeNumber: number;
}

/**
 * Fiche détaillée d'un épisode (résumé, image, casting) via la capacité
 * `SeriesCatalogProvider`. Le use case ignore quel fournisseur concret répond (ADR-0004).
 */
@Injectable()
export class GetEpisodeDetailsUseCase implements UseCase<GetEpisodeDetailsInput, CatalogEpisodeDetails> {
  constructor(@Inject(SERIES_CATALOG_PROVIDER) private readonly catalog: SeriesCatalogProvider) {}

  execute({ externalId, seasonNumber, episodeNumber }: GetEpisodeDetailsInput): Promise<CatalogEpisodeDetails> {
    return this.catalog.getEpisodeDetails(externalId, seasonNumber, episodeNumber);
  }
}
