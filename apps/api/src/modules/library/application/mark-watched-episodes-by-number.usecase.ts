import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../media/domain";
import {
  isComplete,
  orderedEpisodes,
  SERIES_TRACKING_REPOSITORY,
  type SeriesTrackingRepository,
} from "../domain";

/** Un épisode désigné par sa numérotation d'origine (saison, numéro). */
export interface EpisodeNumberRef {
  readonly seasonNumber: number;
  readonly episodeNumber: number;
}

export interface MarkWatchedEpisodesByNumberInput {
  readonly userId: string;
  readonly itemId: string;
  readonly episodes: readonly EpisodeNumberRef[];
}

export interface MarkWatchedEpisodesByNumberResult {
  /** Épisodes rapprochés à la structure du catalogue et marqués vus. */
  readonly marked: number;
  /** Épisodes non retrouvés dans la structure du catalogue (numérotation divergente). */
  readonly unmatched: number;
}

/**
 * Marque des épisodes vus à partir de leur **numérotation** (saison + numéro), sans
 * connaître les identifiants internes. Charge paresseusement la structure saisons/
 * épisodes depuis le catalogue si besoin, puis recalcule le statut de la série.
 * Conçu pour l'import de données externes (TV Time…), qui ne fournit pas nos IDs.
 */
@Injectable()
export class MarkWatchedEpisodesByNumberUseCase implements UseCase<
  MarkWatchedEpisodesByNumberInput,
  MarkWatchedEpisodesByNumberResult
> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
  ) {}

  async execute({
    userId,
    itemId,
    episodes,
  }: MarkWatchedEpisodesByNumberInput): Promise<MarkWatchedEpisodesByNumberResult> {
    const ctx = await this.repo.getContext(userId, itemId);
    if (!ctx) throw new NotFoundException("Série introuvable dans la bibliothèque.");

    if (!(await this.repo.hasEpisodes(ctx.mediaId))) {
      const details = await this.catalog.getSeriesDetails(ctx.externalId);
      await this.repo.saveSeasons(ctx.mediaId, details.seasons);
    }

    const seasons = await this.repo.getSeasons(ctx.mediaId);
    const idByNumber = new Map<string, string>();
    for (const episode of orderedEpisodes(seasons)) {
      idByNumber.set(`${episode.seasonNumber}:${episode.number}`, episode.id);
    }

    const matchedIds = new Set<string>();
    for (const { seasonNumber, episodeNumber } of episodes) {
      const id = idByNumber.get(`${seasonNumber}:${episodeNumber}`);
      if (id) matchedIds.add(id);
    }

    if (matchedIds.size > 0) {
      await this.repo.setEpisodesWatched(itemId, [...matchedIds], true);
    }

    const watched = await this.repo.getWatchedEpisodeIds(itemId);
    const status = isComplete(seasons, watched)
      ? "COMPLETED"
      : watched.size > 0
        ? "IN_PROGRESS"
        : "PLANNED";
    if (status !== ctx.status) await this.repo.setStatus(itemId, status);

    return { marked: matchedIds.size, unmatched: episodes.length - matchedIds.size };
  }
}
