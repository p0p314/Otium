import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import type { ImportMediaCounters, ImportReport, UnmatchedImportEntry } from "@otium/types";
import { AddMediaToLibraryUseCase } from "../../library/application/add-media-to-library.usecase";
import { GetLibraryUseCase } from "../../library/application/get-library.usecase";
import { MarkWatchedEpisodesByNumberUseCase } from "../../library/application/mark-watched-episodes-by-number.usecase";
import { SetWatchStatusUseCase } from "../../library/application/set-watch-status.usecase";
import { MEDIA_CATALOG_PROVIDER, type MediaCatalogProvider } from "../../media/domain";
import type { UseCase } from "../../../shared/application/use-case";
import {
  ARCHIVE_READER,
  type ArchiveReader,
  IMPORT_SOURCE_PARSERS,
  type ImportedMedia,
  type ImportSourceParser,
  pickBestMatch,
} from "../domain";

export interface ImportArchiveInput {
  readonly userId: string;
  readonly format: string;
  readonly archive: Buffer;
}

/** Échantillon maximal d'entrées non rapprochées renvoyé dans le rapport. */
const UNMATCHED_SAMPLE_MAX = 50;
/** Résultats de recherche examinés pour le rapprochement (pertinence décroissante). */
const SEARCH_PAGE_SIZE = 20;

function emptyCounters(): { parsed: number; imported: number; skipped: number; unmatched: number } {
  return { parsed: 0, imported: 0, skipped: 0, unmatched: 0 };
}

/**
 * Orchestration d'un import d'archive : extraction → parseur de source (modulaire) →
 * rapprochement au catalogue (TMDB) → réutilisation de la logique métier existante
 * (ajout, statut, suivi d'épisodes). Best-effort : une entrée en échec n'interrompt
 * pas l'import ; elle est comptabilisée (ignorée / non rapprochée) dans le rapport.
 */
@Injectable()
export class ImportArchiveUseCase implements UseCase<ImportArchiveInput, ImportReport> {
  private readonly logger = new Logger(ImportArchiveUseCase.name);

  constructor(
    @Inject(ARCHIVE_READER) private readonly archiveReader: ArchiveReader,
    @Inject(IMPORT_SOURCE_PARSERS) private readonly parsers: readonly ImportSourceParser[],
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
    private readonly getLibrary: GetLibraryUseCase,
    private readonly addMedia: AddMediaToLibraryUseCase,
    private readonly setWatchStatus: SetWatchStatusUseCase,
    private readonly markEpisodes: MarkWatchedEpisodesByNumberUseCase,
  ) {}

  async execute({ userId, format, archive }: ImportArchiveInput): Promise<ImportReport> {
    const files = await this.archiveReader.read(archive);
    const parser =
      this.parsers.find((p) => p.format === format) ?? this.parsers.find((p) => p.supports(files));
    if (!parser) {
      throw new BadRequestException("Format d'archive non reconnu.");
    }

    const batch = parser.parse(files);
    const seen = new Set(
      (await this.getLibrary.execute(userId)).map(
        (item) => `${item.media.externalRef.provider}:${item.media.externalRef.externalId}`,
      ),
    );

    const movies = emptyCounters();
    const series = emptyCounters();
    const unmatchedSample: UnmatchedImportEntry[] = [];
    let episodesMarked = 0;

    for (const media of batch.medias) {
      const counters = media.type === "MOVIE" ? movies : series;
      counters.parsed++;

      const externalId = await this.matchToCatalog(media);
      if (!externalId) {
        counters.unmatched++;
        if (unmatchedSample.length < UNMATCHED_SAMPLE_MAX) {
          unmatchedSample.push({ type: media.type, title: media.title, year: media.year });
        }
        continue;
      }

      const key = `tmdb:${externalId}`;
      if (seen.has(key)) {
        counters.skipped++;
        continue;
      }
      seen.add(key);

      episodesMarked += await this.importMedia(userId, media, externalId);
      counters.imported++;
    }

    return {
      source: parser.format as ImportReport["source"],
      movies: movies as ImportMediaCounters,
      series: series as ImportMediaCounters,
      episodesMarked,
      unmatchedSample,
    };
  }

  /** Recherche le média dans le catalogue et retourne l'identifiant externe rapproché. */
  private async matchToCatalog(media: ImportedMedia): Promise<string | null> {
    try {
      const result = await this.catalog.search({
        query: media.title,
        page: 1,
        pageSize: SEARCH_PAGE_SIZE,
        type: media.type,
      });
      const best = pickBestMatch(
        { title: media.title, year: media.year },
        result.items.map((item) => ({
          externalId: item.externalRef.externalId,
          title: item.title,
          year: item.year,
        })),
      );
      return best?.externalId ?? null;
    } catch (error) {
      this.logger.warn(`Rapprochement impossible pour « ${media.title} » : ${(error as Error).message}`);
      return null;
    }
  }

  /** Ajoute le média rapproché puis applique statut « vu » (film) ou épisodes vus (série). */
  private async importMedia(
    userId: string,
    media: ImportedMedia,
    externalId: string,
  ): Promise<number> {
    const item = await this.addMedia.execute({
      userId,
      media: {
        externalRef: { provider: "tmdb", externalId },
        type: media.type,
        title: media.title,
        year: media.year,
        posterUrl: null,
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
      this.logger.warn(`Suivi des épisodes impossible pour « ${media.title} » : ${(error as Error).message}`);
      return 0;
    }
  }
}
