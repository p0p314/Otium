import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobStateStore } from "../../domain/ports/job-state.store";
import { DueJobRunner } from "./due-job.runner";

const HOUR = 60 * 60 * 1000;

/** Laisse les promesses en attente se résoudre (la tâche est lancée sans être attendue). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("DueJobRunner", () => {
  let store: { claim: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let runner: DueJobRunner;

  beforeEach(() => {
    store = { claim: vi.fn().mockResolvedValue(true), release: vi.fn().mockResolvedValue(undefined) };
    runner = new DueJobRunner(store as unknown as JobStateStore);
  });

  it("déclenche la tâche quand elle est due", async () => {
    const task = vi.fn().mockResolvedValue(undefined);

    const started = await runner.runIfDue("sync", HOUR, task);
    await settle();

    expect(started).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
    expect(store.release).toHaveBeenCalledWith("sync", { status: "SUCCESS" });
  });

  it("ne déclenche rien quand la tâche n'est pas due", async () => {
    store.claim.mockResolvedValue(false);
    const task = vi.fn();

    const started = await runner.runIfDue("sync", HOUR, task);

    expect(started).toBe(false);
    expect(task).not.toHaveBeenCalled();
  });

  it("calcule l'échéance à partir de l'intervalle demandé", async () => {
    await runner.runIfDue("sync", HOUR, vi.fn().mockResolvedValue(undefined));

    const notBefore = store.claim.mock.calls[0]?.[1] as Date;
    const ecart = Date.now() - notBefore.getTime();
    expect(ecart).toBeGreaterThanOrEqual(HOUR - 1000);
    expect(ecart).toBeLessThanOrEqual(HOUR + 1000);
  });

  it("rend la main sans attendre la fin de la tâche", async () => {
    let acheve = false;
    const lente = () => new Promise<void>((resolve) => setTimeout(() => { acheve = true; resolve(); }, 20));

    await runner.runIfDue("sync", HOUR, lente);

    // La requête utilisateur ne doit pas porter le coût de la tâche.
    expect(acheve).toBe(false);
  });

  it("horodate un échec au lieu de le laisser se répéter", async () => {
    const task = vi.fn().mockRejectedValue(new Error("source injoignable"));

    const started = await runner.runIfDue("sync", HOUR, task);
    await settle();

    // Sans cet enregistrement, la tâche serait retentée à chaque requête suivante.
    expect(started).toBe(true);
    expect(store.release).toHaveBeenCalledWith("sync", {
      status: "FAILED",
      error: "source injoignable",
    });
  });

  it("ne propage jamais l'échec de la tâche à l'appelant", async () => {
    const task = vi.fn().mockRejectedValue(new Error("boum"));

    await expect(runner.runIfDue("sync", HOUR, task)).resolves.toBe(true);
    await settle();
  });

  it("survit à une panne du stockage d'état", async () => {
    store.claim.mockRejectedValue(new Error("base injoignable"));
    const task = vi.fn();

    // La requête utilisateur qui passait par là ne doit pas échouer pour autant.
    await expect(runner.runIfDue("sync", HOUR, task)).resolves.toBe(false);
    expect(task).not.toHaveBeenCalled();
  });

  it("survit à une panne d'enregistrement de l'issue", async () => {
    store.release.mockRejectedValue(new Error("écriture impossible"));
    const task = vi.fn().mockRejectedValue(new Error("boum"));

    await runner.runIfDue("sync", HOUR, task);
    await settle();
    // Aucune exception non capturée : le test échouerait autrement.
  });
});
