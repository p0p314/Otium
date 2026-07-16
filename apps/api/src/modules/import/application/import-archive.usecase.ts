import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import type {
  ImportMediaCounters,
  ImportReport,
  PendingImport,
  UnmatchedImportEntry,
} from "@otium/types";
import { GetLibraryUseCase } from "../../library/application/get-library.usecase";
import { MEDIA_CATALOG_PROVIDER, type CatalogMedia, type MediaCatalogProvider } from "../../media/domain";
import type { UseCase } from "../../../shared/application/use-case";
import {
  ARCHIVE_READER,
  type ArchiveReader,
  extractTitleYear,
  IMPORT_SOURCE_PARSERS,
  type ImportedMedia,
  type ImportSourceParser,
  pickBestMatch,
} from "../domain";
import { MediaImporter } from "./media-importer";

export interface ImportArchiveInput {
  readonly userId: string;
  readonly format: string;
  readonly archive: Buffer;
}

/** Échantillon maximal d'entrées sans candidat renvoyé dans le rapport. */
const UNMATCHED_SAMPLE_MAX = 50;
/** Nombre maximal d'entrées ambiguës à résoudre renvoyées (borne l'affichage et la charge). */
const PENDING_MAX = 50;
/** Candidats proposés par entrée ambiguë. */
const CANDIDATES_MAX = 5;
/** Résultats de recherche examinés pour le rapprochement (pertinence décroissante). */
const SEARCH_PAGE_SIZE = 20;

/** Résultat du rapprochement d'une entrée : trouvé, ambigu (candidats), ou aucun candidat. */
type MatchResult =
  | { kind: "matched"; media: CatalogMedia }
  | { kind: "ambiguous"; candidates: CatalogMedia[] }
  | { kind: "unmatched" };

function emptyCounters(): ImportMediaCounters {
  return { parsed: 0, imported: 0, skipped: 0, pending: 0, unmatched: 0 };
}

function toCandidate(media: CatalogMedia): PendingImport["candidates"][number] {
  return { externalId: media.externalRef.externalId, title: media.title, year: media.year, posterUrl: media.posterUrl };
}

function toPending(media: ImportedMedia, candidates: readonly CatalogMedia[]): PendingImport {
  return {
    type: media.type,
    title: media.title,
    year: media.year,
    status: media.status,
    watchedEpisodes: media.watchedEpisodes.map((e) => ({
      seasonNumber: e.seasonNumber,
      episodeNumber: e.episodeNumber,
      watchedAt: e.watchedAt?.toISOString() ?? null,
    })),
    candidates: candidates.slice(0, CANDIDATES_MAX).map(toCandidate),
  };
}

/**
 * Orchestration d'un import d'archive : extraction → parseur de source (modulaire) →
 * rapprochement au catalogue (TMDB) → réutilisation de la logique métier existante
 * (ajout, statut, suivi d'épisodes). Best-effort : une entrée en échec n'interrompt pas
 * l'import. Le rapprochement **incertain** n'invente rien : les candidats sont renvoyés dans
 * `pending` pour une résolution manuelle ({@link ResolveImportUseCase}).
 */
@Injectable()
export class ImportArchiveUseCase implements UseCase<ImportArchiveInput, ImportReport> {
  private readonly logger = new Logger(ImportArchiveUseCase.name);

  constructor(
    @Inject(ARCHIVE_READER) private readonly archiveReader: ArchiveReader,
    @Inject(IMPORT_SOURCE_PARSERS) private readonly parsers: readonly ImportSourceParser[],
    @Inject(MEDIA_CATALOG_PROVIDER) private readonly catalog: MediaCatalogProvider,
    private readonly getLibrary: GetLibraryUseCase,
    private readonly importer: MediaImporter,
  ) {}

  async execute({ userId, format, archive }: ImportArchiveInput): Promise<ImportReport> {
    const files = await this.archiveReader.read(archive);
    const parser =
      this.parsers.find((p) => p.format === format) ?? this.parsers.find((p) => p.supports(files));
    if (!parser) {
      throw new BadRequestException("Format d'archive non reconnu.");
    }

    const batch = parser.parse(files);
    // Médias déjà présents (rafraîchis, pas re-comptés « importés ») + dédoublonnage intra-fichier.
    const existing = new Set(
      (await this.getLibrary.execute(userId)).map(
        (item) => `${item.media.externalRef.provider}:${item.media.externalRef.externalId}`,
      ),
    );
    const processed = new Set<string>();

    const movies = emptyCounters();
    const series = emptyCounters();
    const unmatchedSample: UnmatchedImportEntry[] = [];
    const pending: PendingImport[] = [];
    let episodesMarked = 0;

    for (const media of batch.medias) {
      const counters = media.type === "MOVIE" ? movies : series;
      counters.parsed++;

      const match = await this.matchToCatalog(media);

      if (match.kind === "unmatched") {
        counters.unmatched++;
        if (unmatchedSample.length < UNMATCHED_SAMPLE_MAX) {
          unmatchedSample.push({ type: media.type, title: media.title, year: media.year });
        }
        continue;
      }

      if (match.kind === "ambiguous") {
        counters.pending++;
        if (pending.length < PENDING_MAX) pending.push(toPending(media, match.candidates));
        continue;
      }

      const key = `tmdb:${match.media.externalRef.externalId}`;
      // Doublon dans le fichier même : traiter une seule fois.
      if (processed.has(key)) {
        counters.skipped++;
        continue;
      }
      processed.add(key);

      // Déjà en bibliothèque : on ne compte pas un nouvel ajout, mais on **rafraîchit**
      // quand même (poster, dates de visionnage réelles) via l'ajout idempotent.
      episodesMarked += await this.importer.importOne(userId, media, match.media);
      if (existing.has(key)) counters.skipped++;
      else counters.imported++;
    }

    return {
      source: parser.format as ImportReport["source"],
      movies,
      series,
      episodesMarked,
      unmatchedSample,
      pending,
    };
  }

  /** Recherche le média et décide : rapproché (certain), ambigu (candidats), ou sans candidat. */
  private async matchToCatalog(media: ImportedMedia): Promise<MatchResult> {
    // La date est parfois encodée dans le titre : la retirer de la requête et s'en servir
    // comme signal d'année (améliore le rapprochement, ADR-0008).
    const { title, year: titleYear } = extractTitleYear(media.title);
    const year = media.year ?? titleYear;
    try {
      const result = await this.catalog.search({ query: title, page: 1, pageSize: SEARCH_PAGE_SIZE, type: media.type });
      if (result.items.length === 0) return { kind: "unmatched" };

      const byId = new Map(result.items.map((item) => [item.externalRef.externalId, item]));
      const best = pickBestMatch(
        { title, year },
        result.items.map((item) => ({
          externalId: item.externalRef.externalId,
          title: item.title,
          originalTitle: item.originalTitle,
          year: item.year,
        })),
      );
      const matched = best ? byId.get(best.externalId) : undefined;
      // Rapprochement certain → import direct ; sinon, laisser l'utilisateur choisir.
      return matched ? { kind: "matched", media: matched } : { kind: "ambiguous", candidates: [...result.items] };
    } catch (error) {
      this.logger.warn(
        `Rapprochement impossible pour « ${media.title} » : ${(error as Error).message}`,
      );
      return { kind: "unmatched" };
    }
  }
}
