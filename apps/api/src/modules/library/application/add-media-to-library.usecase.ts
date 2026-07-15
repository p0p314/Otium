import { Inject, Injectable, Logger } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../media/domain";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  MediaAdded,
  type MediaDescriptor,
} from "../domain";

export interface AddMediaToLibraryInput {
  userId: string;
  media: MediaDescriptor;
}

/** Ajoute un média à la bibliothèque de l'utilisateur et émet `MediaAdded`. */
@Injectable()
export class AddMediaToLibraryUseCase implements UseCase<AddMediaToLibraryInput, LibraryItem> {
  private readonly logger = new Logger(AddMediaToLibraryUseCase.name);

  constructor(
    @Inject(LIBRARY_REPOSITORY) private readonly library: LibraryRepository,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  async execute({ userId, media }: AddMediaToLibraryInput): Promise<LibraryItem> {
    const item = await this.library.add(userId, await this.enrich(media));
    await this.events.publish(new MediaAdded(userId, item.id, media.type));
    return item;
  }

  /**
   * Complète genres + durée depuis le catalogue pour alimenter les statistiques.
   * Best-effort : une panne du fournisseur (ex. TMDB indisponible) n'échoue pas l'ajout.
   */
  private async enrich(media: MediaDescriptor): Promise<MediaDescriptor> {
    if (media.genres && media.genres.length > 0 && media.runtimeMinutes != null) return media;
    try {
      const details = await this.catalog.getMediaDetails(media.type, media.externalRef.externalId);
      return {
        ...media,
        genres: details.genres.map((g) => g.label),
        runtimeMinutes: details.runtimeMinutes ?? media.runtimeMinutes ?? null,
      };
    } catch (error) {
      this.logger.warn(`Enrichissement du média impossible : ${(error as Error).message}`);
      return media;
    }
  }
}
