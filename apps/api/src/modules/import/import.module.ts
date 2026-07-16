import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { LibraryModule } from "../library/library.module";
import { MediaModule } from "../media/media.module";
import { ImportArchiveUseCase } from "./application/import-archive.usecase";
import { MediaImporter } from "./application/media-importer";
import { ResolveImportUseCase } from "./application/resolve-import.usecase";
import { ARCHIVE_READER, IMPORT_SOURCE_PARSERS } from "./domain";
import { TvTimeParser } from "./infrastructure/tvtime/tvtime.parser";
import { ZipArchiveReader } from "./infrastructure/zip-archive.reader";
import { ImportController } from "./presentation/import.controller";

/**
 * Module d'import de données externes (RGPD). Orchestration seulement : réutilise la
 * logique métier de `LibraryModule` (ajout, statut, suivi d'épisodes) et le catalogue
 * de `MediaModule` pour le rapprochement. Les parseurs de source sont enfichables.
 */
@Module({
  imports: [AuthenticationModule, MediaModule, LibraryModule],
  controllers: [ImportController],
  providers: [
    ImportArchiveUseCase,
    ResolveImportUseCase,
    MediaImporter,
    TvTimeParser,
    { provide: ARCHIVE_READER, useClass: ZipArchiveReader },
    {
      provide: IMPORT_SOURCE_PARSERS,
      useFactory: (tvtime: TvTimeParser) => [tvtime],
      inject: [TvTimeParser],
    },
  ],
})
export class ImportModule {}
