import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { ImportProgress } from "@otium/types";
import type { ImportJob, ImportJobStore } from "../application/ports/import-job-store";

/** Durée de rétention d'un job après sa dernière mise à jour (nettoyage mémoire). */
const JOB_TTL_MS = 60 * 60 * 1000; // 1 h
/** Plafond de jobs conservés (borne mémoire, mono-instance). */
const MAX_JOBS = 100;

function emptyProgress(): ImportProgress {
  return { total: 0, processed: 0, imported: 0, episodesMarked: 0, pending: 0, unmatched: 0 };
}

/**
 * Suivi des jobs d'import **en mémoire** (in-process). Adapté au service unique
 * mono-instance (pas de Redis) : perdu au redémarrage, mais les écritures en base déjà
 * faites persistent (import partiel conservé). Voir ADR-0013.
 */
@Injectable()
export class InMemoryImportJobStore implements ImportJobStore {
  private readonly jobs = new Map<string, ImportJob>();

  create(userId: string): ImportJob {
    this.purgeExpired();
    const now = Date.now();
    const job: ImportJob = {
      id: randomUUID(),
      userId,
      status: "running",
      progress: emptyProgress(),
      report: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  update(id: string, patch: Partial<Omit<ImportJob, "id" | "userId" | "createdAt">>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, patch, { updatedAt: Date.now() });
  }

  get(id: string): ImportJob | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    if (Date.now() - job.updatedAt > JOB_TTL_MS) {
      this.jobs.delete(id);
      return null;
    }
    return job;
  }

  /** Retire les jobs expirés et, si nécessaire, les plus anciens au-delà du plafond. */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (now - job.updatedAt > JOB_TTL_MS) this.jobs.delete(id);
    }
    while (this.jobs.size >= MAX_JOBS) {
      const oldest = this.jobs.keys().next().value;
      if (oldest === undefined) break;
      this.jobs.delete(oldest);
    }
  }
}
