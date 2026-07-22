import { Injectable } from "@nestjs/common";
import { DueJobRunner } from "../../../shared/infrastructure/jobs/due-job.runner";
import {
  DetectDueNotificationsUseCase,
  NOTIFICATION_DETECTION_INTERVAL_MS,
} from "./detect-due-notifications.usecase";

/** Nom de la tâche périodique dans le registre `SyncState`. */
export const NOTIFICATION_JOB = "notifications:detect";

/**
 * Déclencheur **opportuniste** de la détection de notifications (ADR-0019/0020).
 *
 * L'hébergement gratuit s'endort : un `@Cron` ne se déclencherait pas pendant le sommeil.
 * On s'appuie donc sur le même mécanisme que le reste du projet — l'échéance est portée
 * par la donnée (`SyncState`) et la tâche se lance à l'occasion d'une requête utilisateur
 * (ici, le chargement des préférences/abonnements au démarrage de la PWA). `DueJobRunner`
 * garantit une exécution **unique par échéance**, **non bloquante** et **non fatale**.
 */
@Injectable()
export class NotificationTriggerService {
  constructor(
    private readonly runner: DueJobRunner,
    private readonly detect: DetectDueNotificationsUseCase,
  ) {}

  /** Lance la détection si elle est due. Ne bloque jamais l'appelant. */
  async triggerIfDue(): Promise<void> {
    await this.runner.runIfDue(NOTIFICATION_JOB, NOTIFICATION_DETECTION_INTERVAL_MS, async () => {
      await this.detect.execute();
    });
  }
}
