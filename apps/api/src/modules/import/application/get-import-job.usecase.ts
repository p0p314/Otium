import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ImportJobState } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { IMPORT_JOB_STORE, type ImportJobStore } from "./ports/import-job-store";

export interface GetImportJobInput {
  readonly userId: string;
  readonly jobId: string;
}

/** Retourne l'état d'un job d'import, en s'assurant qu'il appartient à l'utilisateur. */
@Injectable()
export class GetImportJobUseCase implements UseCase<GetImportJobInput, ImportJobState> {
  constructor(@Inject(IMPORT_JOB_STORE) private readonly jobs: ImportJobStore) {}

  async execute({ userId, jobId }: GetImportJobInput): Promise<ImportJobState> {
    const job = this.jobs.get(jobId);
    // Même réponse pour « inconnu » et « pas le vôtre » : on ne révèle rien.
    if (!job || job.userId !== userId) {
      throw new NotFoundException("Import introuvable.");
    }
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      report: job.report,
      error: job.error,
    };
  }
}
