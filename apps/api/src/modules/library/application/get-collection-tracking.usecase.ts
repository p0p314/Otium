import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import {
  buildCollectionProgress,
  type CollectionProgress,
  type CollectionVolume,
  LIBRARY_REPOSITORY,
  type LibraryRepository,
} from "../domain";

export interface GetCollectionTrackingInput {
  readonly userId: string;
  readonly provider: string;
  readonly externalId: string;
}

/** Une œuvre et le suivi de l'utilisateur sur ses volumes. */
export interface CollectionTracking {
  readonly provider: string;
  readonly externalId: string;
  readonly title: string;
  readonly volumes: readonly CollectionVolumeView[];
  readonly progress: CollectionProgress<CollectionVolumeView>;
}

/** Un volume tel qu'affiché sur la fiche de l'œuvre. */
export interface CollectionVolumeView extends CollectionVolume {
  readonly externalId: string;
  readonly posterUrl: string | null;
}

/**
 * Fiche de suivi d'une œuvre : ses volumes connus et la synthèse de l'avancement.
 *
 * Le use case ne calcule rien lui-même — il lit, puis délègue à `buildCollectionProgress`,
 * fonction pure du domaine. Les volumes absents de la bibliothèque sont conservés : la
 * fiche doit pouvoir proposer le tome suivant même s'il n'a pas encore été ajouté.
 */
@Injectable()
export class GetCollectionTrackingUseCase
  implements UseCase<GetCollectionTrackingInput, CollectionTracking>
{
  constructor(@Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository) {}

  async execute({
    userId,
    provider,
    externalId,
  }: GetCollectionTrackingInput): Promise<CollectionTracking> {
    const record = await this.library.findCollection(userId, provider, externalId);
    if (!record) throw new NotFoundException("Œuvre inconnue.");

    const volumes: CollectionVolumeView[] = record.volumes.map((volume) => ({
      itemId: volume.itemId,
      position: volume.position,
      title: volume.title,
      status: volume.status,
      externalId: volume.externalId,
      posterUrl: volume.posterUrl,
    }));

    return {
      provider: record.provider,
      externalId: record.externalId,
      title: record.title,
      volumes,
      progress: buildCollectionProgress(volumes),
    };
  }
}
