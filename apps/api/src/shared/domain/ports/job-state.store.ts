/**
 * État d'exécution des tâches périodiques (ADR-0019).
 *
 * Le port est volontairement minimal et **atomique** : `claim` doit à la fois vérifier
 * l'échéance et poser le verrou en une seule opération. Deux requêtes utilisateur
 * arrivant ensemble ne doivent pas déclencher deux fois la même tâche.
 */
export interface JobStateStore {
  /**
   * Tente de prendre la main sur une tâche. Renvoie `true` **au plus une fois** par
   * échéance : l'appelant qui reçoit `true` est seul responsable de l'exécution.
   *
   * @param notBefore Une exécution démarrée après cette date interdit une nouvelle prise.
   */
  claim(job: string, notBefore: Date): Promise<boolean>;
  /** Enregistre l'issue de l'exécution — succès comme échec. */
  release(job: string, outcome: { status: "SUCCESS" | "FAILED"; error?: string }): Promise<void>;
}

export const JOB_STATE_STORE = Symbol("JOB_STATE_STORE");
