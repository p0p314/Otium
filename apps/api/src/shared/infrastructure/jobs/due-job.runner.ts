import { Inject, Injectable, Logger } from "@nestjs/common";
import { JOB_STATE_STORE, type JobStateStore } from "../../domain/ports/job-state.store";

/**
 * Exécute une tâche périodique **lorsqu'elle est due**, à l'occasion d'une requête
 * utilisateur (ADR-0019).
 *
 * Pourquoi pas un `@Cron` : le service d'hébergement gratuit s'endort après inactivité.
 * Une planification en processus ne se déclencherait pas pendant le sommeil, et les
 * exécutions manquées seraient perdues sans que rien ne le signale. Ici l'échéance est
 * portée par la **donnée** : après une semaine de sommeil, la première requête qui suit
 * constate que la tâche est due et la déclenche.
 *
 * Trois garanties :
 *
 * - **Une seule exécution** par échéance, même si plusieurs requêtes arrivent ensemble —
 *   la prise de verrou est atomique côté stockage.
 * - **Jamais bloquante** : la tâche est lancée sans être attendue, la requête utilisateur
 *   n'en subit pas la latence.
 * - **Jamais fatale** : un échec est journalisé et horodaté, il ne remonte pas à
 *   l'appelant et ne relance pas la tâche en boucle — la prochaine échéance s'appliquera.
 */
@Injectable()
export class DueJobRunner {
  private readonly logger = new Logger(DueJobRunner.name);

  constructor(@Inject(JOB_STATE_STORE) private readonly store: JobStateStore) {}

  /**
   * Déclenche `task` si la dernière exécution remonte à plus de `intervalMs`.
   * Renvoie `true` si l'exécution a été **prise en charge** (et non si elle a réussi :
   * elle se poursuit en arrière-plan).
   */
  async runIfDue(job: string, intervalMs: number, task: () => Promise<void>): Promise<boolean> {
    const notBefore = new Date(Date.now() - intervalMs);

    let claimed: boolean;
    try {
      claimed = await this.store.claim(job, notBefore);
    } catch (error) {
      // Une panne du stockage d'état ne doit pas faire échouer la requête qui passait par là.
      this.logger.warn(`Échéance « ${job} » non vérifiable : ${(error as Error).message}`);
      return false;
    }
    if (!claimed) return false;

    this.logger.log(`Tâche « ${job} » déclenchée.`);
    // Volontairement non attendu : la requête utilisateur ne doit pas porter ce coût.
    void this.execute(job, task);
    return true;
  }

  private async execute(job: string, task: () => Promise<void>): Promise<void> {
    try {
      await task();
      await this.store.release(job, { status: "SUCCESS" });
      this.logger.log(`Tâche « ${job} » terminée.`);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.warn(`Tâche « ${job} » en échec : ${message}`);
      // L'échec est horodaté comme un succès : sans cela, la tâche serait retentée à
      // **chaque** requête suivante, transformant une panne en avalanche.
      await this.store
        .release(job, { status: "FAILED", error: message })
        .catch(() => this.logger.warn(`Issue de « ${job} » non enregistrée.`));
    }
  }
}
