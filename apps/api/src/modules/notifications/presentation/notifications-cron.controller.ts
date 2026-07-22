import { Controller, ForbiddenException, Headers, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../../shared/infrastructure/config/env";
import {
  DetectDueNotificationsUseCase,
  type NotificationRunSummary,
} from "../application/detect-due-notifications.usecase";

/**
 * Déclencheur **externe** de la détection (cron GitHub Actions / Render — voir ADR-0019,
 * alternative « déclencheur externe »). Séparé du contrôleur utilisateur car il n'est
 * pas protégé par une session mais par un **secret partagé** (`NOTIFICATIONS_CRON_SECRET`).
 * Si le secret n'est pas configuré, l'endpoint est **désactivé** (403) pour éviter un
 * déclencheur ouvert. Force l'exécution immédiate (hors échéance) — l'anti-doublon reste
 * la seule garantie contre les envois multiples.
 */
@Controller("notifications")
export class NotificationsCronController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly detect: DetectDueNotificationsUseCase,
  ) {}

  @Post("run")
  async run(@Headers("x-cron-secret") secret?: string): Promise<NotificationRunSummary> {
    const expected = this.config.get("NOTIFICATIONS_CRON_SECRET", { infer: true });
    if (!expected || secret !== expected) {
      throw new ForbiddenException("Déclencheur non autorisé.");
    }
    return this.detect.execute();
  }
}
