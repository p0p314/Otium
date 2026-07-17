import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { InMemoryImportJobStore } from "../infrastructure/in-memory-import-job-store";
import { GetImportJobUseCase } from "./get-import-job.usecase";

describe("GetImportJobUseCase", () => {
  it("retourne l'état du job de son propriétaire", async () => {
    const store = new InMemoryImportJobStore();
    const job = store.create("user-1");
    const useCase = new GetImportJobUseCase(store);

    const state = await useCase.execute({ userId: "user-1", jobId: job.id });

    expect(state.id).toBe(job.id);
    expect(state.status).toBe("running");
    expect(state.report).toBeNull();
  });

  it("renvoie NotFound pour un job d'un autre utilisateur", async () => {
    const store = new InMemoryImportJobStore();
    const job = store.create("user-1");
    const useCase = new GetImportJobUseCase(store);

    await expect(useCase.execute({ userId: "autre", jobId: job.id })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("renvoie NotFound pour un job inconnu", async () => {
    const useCase = new GetImportJobUseCase(new InMemoryImportJobStore());
    await expect(useCase.execute({ userId: "user-1", jobId: "inconnu" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
