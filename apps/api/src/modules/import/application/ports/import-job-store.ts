import type { ImportProgress, ImportReport } from "@otium/types";

/** Un job d'import suivi côté serveur (propriétaire, progression, résultat). */
export interface ImportJob {
  readonly id: string;
  readonly userId: string;
  status: "running" | "done" | "error";
  progress: ImportProgress;
  report: ImportReport | null;
  error: string | null;
  readonly createdAt: number;
  updatedAt: number;
}

/**
 * Port de suivi des jobs d'import. L'implémentation (mémoire) vit en infrastructure ;
 * l'orchestration (application) ne connaît pas le stockage. Comme le cache TMDB, c'est
 * un état **en mémoire**, non partagé/non persistant (mono-instance — voir ADR-0013).
 */
export interface ImportJobStore {
  /** Crée un job « running » pour l'utilisateur (progression initiale vide). */
  create(userId: string): ImportJob;
  /** Applique une mise à jour partielle et rafraîchit `updatedAt`. */
  update(id: string, patch: Partial<Omit<ImportJob, "id" | "userId" | "createdAt">>): void;
  /** Retourne le job, ou `null` s'il est inconnu/expiré. */
  get(id: string): ImportJob | null;
}

export const IMPORT_JOB_STORE = Symbol("IMPORT_JOB_STORE");
