import { describe, expect, it } from "vitest";
import { InMemoryImportJobStore } from "./in-memory-import-job-store";

describe("InMemoryImportJobStore", () => {
  it("crée un job « running » avec une progression vide", () => {
    const store = new InMemoryImportJobStore();
    const job = store.create("user-1");

    expect(job.userId).toBe("user-1");
    expect(job.status).toBe("running");
    expect(job.progress).toEqual({
      total: 0,
      processed: 0,
      imported: 0,
      episodesMarked: 0,
      pending: 0,
      unmatched: 0,
    });
    expect(store.get(job.id)).toBe(job);
  });

  it("applique une mise à jour partielle et rafraîchit updatedAt", () => {
    const store = new InMemoryImportJobStore();
    const job = store.create("user-1");
    const before = job.updatedAt;

    store.update(job.id, { status: "done", report: null });
    const after = store.get(job.id);

    expect(after?.status).toBe("done");
    expect(after?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("ignore la mise à jour d'un job inconnu (pas d'erreur)", () => {
    const store = new InMemoryImportJobStore();
    expect(() => store.update("inconnu", { status: "error" })).not.toThrow();
  });

  it("retourne null pour un identifiant inconnu", () => {
    const store = new InMemoryImportJobStore();
    expect(store.get("inconnu")).toBeNull();
  });
});
