import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  type ImportJobState,
  ResolveImportInput,
  type ResolveImportResult,
  type StartImportResult,
} from "@otium/types";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { ZodValidationPipe } from "../../../shared/presentation/zod-validation.pipe";
import { GetImportJobUseCase } from "../application/get-import-job.usecase";
import { ResolveImportUseCase } from "../application/resolve-import.usecase";
import { StartImportUseCase } from "../application/start-import.usecase";

/** Taille maximale de l'archive acceptée (garde-fou mémoire ; export RGPD ~ quelques Mo). */
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;

/** Vue minimale du fichier uploadé (stockage mémoire multer) : seul le buffer nous importe. */
interface UploadedArchive {
  readonly buffer: Buffer;
}

@Controller("import")
@UseGuards(AuthGuard)
export class ImportController {
  constructor(
    private readonly startImport: StartImportUseCase,
    private readonly getImportJob: GetImportJobUseCase,
    private readonly resolveImport: ResolveImportUseCase,
  ) {}

  /**
   * Lance l'import d'un export RGPD TV Time **en tâche de fond** et renvoie l'identifiant
   * du job. Le traitement se poursuit côté serveur (même si le client se déconnecte) ; le
   * client suit la progression via `GET /import/jobs/:jobId`.
   */
  @Post("tvtime")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_ARCHIVE_BYTES } }))
  async importTvTime(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedArchive,
  ): Promise<StartImportResult> {
    if (!file) throw new BadRequestException("Fichier d'archive manquant.");
    return this.startImport.execute({ userId: user.id, format: "tvtime", archive: file.buffer });
  }

  /** État d'un job d'import (progression puis rapport final) — restreint à son propriétaire. */
  @Get("jobs/:jobId")
  async jobState(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
  ): Promise<ImportJobState> {
    return this.getImportJob.execute({ userId: user.id, jobId });
  }

  /** Résout une entrée d'import ambiguë : importe le candidat choisi par l'utilisateur. */
  @Post("resolve")
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ResolveImportInput)) input: ResolveImportInput,
  ): Promise<ResolveImportResult> {
    return this.resolveImport.execute({ userId: user.id, input });
  }
}
