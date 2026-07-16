import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { ImportReport } from "@otium/types";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { ImportArchiveUseCase } from "../application/import-archive.usecase";

/** Taille maximale de l'archive acceptée (garde-fou mémoire ; export RGPD ~ quelques Mo). */
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;

/** Vue minimale du fichier uploadé (stockage mémoire multer) : seul le buffer nous importe. */
interface UploadedArchive {
  readonly buffer: Buffer;
}

@Controller("import")
@UseGuards(AuthGuard)
export class ImportController {
  constructor(private readonly importArchive: ImportArchiveUseCase) {}

  /** Importe un export RGPD TV Time (archive ZIP) dans la bibliothèque de l'utilisateur. */
  @Post("tvtime")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_ARCHIVE_BYTES } }))
  async importTvTime(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedArchive,
  ): Promise<ImportReport> {
    if (!file) throw new BadRequestException("Fichier d'archive manquant.");
    return this.importArchive.execute({
      userId: user.id,
      format: "tvtime",
      archive: file.buffer,
    });
  }
}
