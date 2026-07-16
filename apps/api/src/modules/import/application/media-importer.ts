import { Injectable, Logger } from "@nestjs/common";
import { AddMediaToLibraryUseCase } from "../../library/application/add-media-to-library.usecase";
import { MarkWatchedEpisodesByNumberUseCase } from "../../library/application/mark-watched-episodes-by-number.usecase";
import { SetWatchStatusUseCase } from "../../library/application/set-watch-status.usecase";
import type { CatalogMedia } from "../../media/domain";
import type { ImportedMedia } from "../domain";

/**
 * Applique **une** entrée importée rapprochée à un candidat du catalogue : ajout (idempotent,
 * poster/titre/année fiables issus du catalogue) puis statut « vu » (film) ou épisodes vus
 * avec leurs dates réelles (série). Partagé par l'import de masse et la résolution manuelle,
 * il ne connaît ni format d'export ni rapprochement — pure réutilisation de la logique métier.
 */
@Injectable()
export class MediaImporter {
  private readonly logger = new Logger(MediaImporter.name);

  constructor(
    private readonly addMedia: AddMediaToLibraryUseCase,
    private readonly setWatchStatus: SetWatchStatusUseCase,
    private readonly markEpisodes: MarkWatchedEpisodesByNumberUseCase,
  ) {}

  /** Importe l'entrée ; renvoie le nombre d'épisodes marqués vus (0 pour un film). */
  async importOne(userId: string, media: ImportedMedia, match: CatalogMedia): Promise<number> {
    const item = await this.addMedia.execute({
      userId,
      media: {
        externalRef: { provider: "tmdb", externalId: match.externalRef.externalId },
        type: media.type,
        // Titre/année/poster issus du **catalogue** (fiables et localisés), pas de l'export.
        title: match.title,
        year: match.year ?? media.year,
        posterUrl: match.posterUrl,
      },
    });

    if (media.type === "MOVIE") {
      if (media.status === "COMPLETED") {
        await this.setWatchStatus.execute({ userId, itemId: item.id, status: "COMPLETED" });
      }
      return 0;
    }

    if (media.watchedEpisodes.length === 0) return 0;
    try {
      const result = await this.markEpisodes.execute({
        userId,
        itemId: item.id,
        episodes: media.watchedEpisodes,
      });
      return result.marked;
    } catch (error) {
      this.logger.warn(
        `Suivi des épisodes impossible pour « ${media.title} » : ${(error as Error).message}`,
      );
      return 0;
    }
  }
}
