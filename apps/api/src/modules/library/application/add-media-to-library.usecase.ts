import { Inject, Injectable, Logger } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../media/domain";
import { toPersistableSeasons } from "./series-structure.mapper";
import {
  LIBRARY_REPOSITORY,
  type LibraryItem,
  type LibraryRepository,
  MediaAdded,
  type MediaDescriptor,
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
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
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly tracking: SeriesTrackingRepository,
  ) {}

  async execute({ userId, media }: AddMediaToLibraryInput): Promise<LibraryItem> {
    const item = await this.library.add(userId, await this.enrich(media));
    await this.events.publish(new MediaAdded(userId, item.id, media.type));
    if (item.media.type === "SERIES") await this.syncSeriesStructure(userId, item.id);
    return item;
  }

  /**
   * Charge la structure saisons/épisodes (avec dates de diffusion) d'une série dès
   * l'ajout, pour alimenter l'accueil (« à commencer ») et « À venir » sans attendre
   * l'ouverture de la fiche. Best-effort : n'échoue jamais l'ajout ; ignoré si déjà en base.
   */
  private async syncSeriesStructure(userId: string, itemId: string): Promise<void> {
    try {
      const ctx = await this.tracking.getContext(userId, itemId);
      if (!ctx || (await this.tracking.hasEpisodes(ctx.mediaId))) return;
      const details = await this.catalog.getSeriesDetails(ctx.externalId);
      await this.tracking.saveSeasons(ctx.mediaId, toPersistableSeasons(details.seasons));
    } catch (error) {
      this.logger.warn(`Synchronisation de la série impossible : ${(error as Error).message}`);
    }
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
        releaseDate: details.releaseDate ? new Date(details.releaseDate) : (media.releaseDate ?? null),
      };
    } catch (error) {
      this.logger.warn(`Enrichissement du média impossible : ${(error as Error).message}`);
      return media;
    }
  }
}
