import { Inject, Injectable, Logger } from "@nestjs/common";
import type { StartImportResult } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { ImportArchiveUseCase } from "./import-archive.usecase";
import { IMPORT_JOB_STORE, type ImportJobStore } from "./ports/import-job-store";

export interface StartImportInput {
  readonly userId: string;
  readonly format: string;
  readonly archive: Buffer;
}

/**
 * Lance un import **en tâche de fond** : crée un job, renvoie aussitôt son identifiant,
 * puis traite l'archive sans bloquer la requête HTTP. L'import se poursuit côté serveur
 * même si le client se déconnecte (téléphone verrouillé…). Le client suit la progression
 * via {@link GetImportJobUseCase}. Voir ADR-0013.
 */
@Injectable()
export class StartImportUseCase implements UseCase<StartImportInput, StartImportResult> {
  private readonly logger = new Logger(StartImportUseCase.name);

  constructor(
    @Inject(IMPORT_JOB_STORE) private readonly jobs: ImportJobStore,
    private readonly importArchive: ImportArchiveUseCase,
  ) {}

  async execute({ userId, format, archive }: StartImportInput): Promise<StartImportResult> {
    const job = this.jobs.create(userId);
    // Fire-and-forget : on n'attend pas la fin du traitement pour répondre.
    void this.run(job.id, { userId, format, archive });
    return { jobId: job.id };
  }

  private async run(jobId: string, input: StartImportInput): Promise<void> {
    try {
      const report = await this.importArchive.execute({
        ...input,
        onProgress: (progress) => this.jobs.update(jobId, { progress }),
      });
      this.jobs.update(jobId, { status: "done", report });
    } catch (error) {
      this.logger.error(`Import ${jobId} échoué : ${(error as Error).message}`);
      this.jobs.update(jobId, { status: "error", error: (error as Error).message });
    }
  }
}
