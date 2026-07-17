import type { ImportProgress, ImportReport } from "@otium/types";
import { describe, expect, it, vi } from "vitest";
import type { ImportArchiveInput, ImportArchiveUseCase } from "./import-archive.usecase";
import { InMemoryImportJobStore } from "../infrastructure/in-memory-import-job-store";
import { StartImportUseCase } from "./start-import.usecase";

const report: ImportReport = {
  source: "tvtime",
  movies: { parsed: 1, imported: 1, skipped: 0, pending: 0, unmatched: 0 },
  series: { parsed: 0, imported: 0, skipped: 0, pending: 0, unmatched: 0 },
  episodesMarked: 0,
  unmatchedSample: [],
  pending: [],
};

/** Attend que la tâche de fond (fire-and-forget) se règle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("StartImportUseCase", () => {
  it("renvoie aussitôt un jobId puis mène le job à « done » avec le rapport", async () => {
    const store = new InMemoryImportJobStore();
    const archive: Pick<ImportArchiveUseCase, "execute"> = {
      execute: vi.fn(async ({ onProgress }: ImportArchiveInput) => {
        const progress: ImportProgress = {
          total: 1,
          processed: 1,
          imported: 1,
          episodesMarked: 0,
          pending: 0,
          unmatched: 0,
        };
        onProgress?.(progress);
        return report;
      }),
    };
    const useCase = new StartImportUseCase(store, archive as ImportArchiveUseCase);

    const { jobId } = await useCase.execute({
      userId: "user-1",
      format: "tvtime",
      archive: Buffer.from("zip"),
    });
    expect(jobId).toBeTruthy();

    await flush();
    const job = store.get(jobId);
    expect(job?.status).toBe("done");
    expect(job?.report).toEqual(report);
    expect(job?.progress.processed).toBe(1);
  });

  it("passe le job en « error » si le traitement échoue", async () => {
    const store = new InMemoryImportJobStore();
    const archive: Pick<ImportArchiveUseCase, "execute"> = {
      execute: vi.fn(async () => {
        throw new Error("archive illisible");
      }),
    };
    const useCase = new StartImportUseCase(store, archive as ImportArchiveUseCase);

    const { jobId } = await useCase.execute({
      userId: "user-1",
      format: "tvtime",
      archive: Buffer.from("zip"),
    });

    await flush();
    const job = store.get(jobId);
    expect(job?.status).toBe("error");
    expect(job?.error).toContain("archive illisible");
  });
});
