import { Injectable } from "@nestjs/common";
import type { ResolveImportInput, ResolveImportResult } from "@otium/types";
import { GetLibraryUseCase } from "../../library/application/get-library.usecase";
import type { CatalogMedia } from "../../media/domain";
import type { UseCase } from "../../../shared/application/use-case";
import type { ImportedMedia } from "../domain";
import { MediaImporter } from "./media-importer";

export interface ResolveImportCommand {
  readonly userId: string;
  readonly input: ResolveImportInput;
}

/**
 * Résout **une** entrée d'import restée ambiguë : l'utilisateur a choisi un candidat, on
 * l'importe avec l'entrée d'origine (statut / épisodes vus + dates). Réutilise le
 * {@link MediaImporter} partagé — aucune logique métier dupliquée.
 */
@Injectable()
export class ResolveImportUseCase implements UseCase<ResolveImportCommand, ResolveImportResult> {
  constructor(
    private readonly importer: MediaImporter,
    private readonly getLibrary: GetLibraryUseCase,
  ) {}

  async execute({ userId, input }: ResolveImportCommand): Promise<ResolveImportResult> {
    const { candidate, entry } = input;
    const alreadyPresent = (await this.getLibrary.execute(userId)).some(
      (item) =>
        item.media.externalRef.provider === "tmdb" &&
        item.media.externalRef.externalId === candidate.externalId,
    );

    const media: ImportedMedia = {
      type: entry.type,
      title: entry.title,
      year: entry.year,
      status: entry.status,
      runtimeMinutes: null,
      watchedEpisodes: entry.watchedEpisodes.map((e) => ({
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        watchedAt: e.watchedAt ? new Date(e.watchedAt) : null,
      })),
    };

    const match: CatalogMedia = {
      externalRef: { provider: "tmdb", externalId: candidate.externalId },
      type: entry.type,
      title: candidate.title,
      originalTitle: null,
      year: candidate.year,
      posterUrl: candidate.posterUrl,
      genres: [],
    };

    const episodesMarked = await this.importer.importOne(userId, media, match);
    return { imported: !alreadyPresent, episodesMarked };
  }
}
