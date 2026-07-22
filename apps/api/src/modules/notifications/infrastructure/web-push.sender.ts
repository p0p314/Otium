import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush, { WebPushError } from "web-push";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { NotificationContent, PushSender, PushSendResult } from "../domain";
import type { PushSubscriptionRecord } from "../domain";

/**
 * Adapter Web Push (RFC 8291 / VAPID) du port `PushSender`, appuyé sur `web-push`
 * (ADR-0020). Les clés VAPID viennent **exclusivement** de l'environnement (jamais
 * générées au démarrage). Sans clés, l'adapter reste inerte (`isConfigured() === false`)
 * et l'application démarre normalement — comme pour TMDB sans jeton.
 */
@Injectable()
export class WebPushSender implements PushSender {
  private readonly logger = new Logger(WebPushSender.name);
  private readonly configured: boolean;
  private readonly vapidPublicKey: string | null;

  constructor(config: ConfigService<Env, true>) {
    const publicKey = config.get("VAPID_PUBLIC_KEY", { infer: true });
    const privateKey = config.get("VAPID_PRIVATE_KEY", { infer: true });
    const subject = config.get("VAPID_SUBJECT", { infer: true });

    if (!publicKey || !privateKey) {
      this.logger.warn("Web Push désactivé : VAPID_PUBLIC_KEY/PRIVATE_KEY absentes.");
      this.configured = false;
      this.vapidPublicKey = null;
      return;
    }

    try {
      // Valide et enregistre les clés. En cas de clés **malformées**, on désactive le Push
      // au lieu de faire échouer tout le démarrage (dégradation gracieuse, comme TMDB).
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
      this.vapidPublicKey = publicKey;
      this.logger.log("Web Push configuré (VAPID).");
    } catch (error) {
      this.logger.error(`Web Push désactivé : clés VAPID invalides — ${(error as Error).message}`);
      this.configured = false;
      this.vapidPublicKey = null;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  publicKey(): string | null {
    return this.vapidPublicKey;
  }

  async send(
    subscription: PushSubscriptionRecord,
    content: NotificationContent,
  ): Promise<PushSendResult> {
    if (!this.configured) return "failed";

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(content),
        // TTL 24 h : une sortie « du jour » reste pertinente si l'appareil est hors ligne
        // quelques heures, sans s'accumuler indéfiniment. `urgency` normal (défaut).
        { TTL: 24 * 60 * 60 },
      );
      return "sent";
    } catch (error) {
      // 404/410 : l'abonnement n'existe plus côté service Push → à supprimer.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        return "expired";
      }
      this.logger.warn(
        `Envoi Push échoué (${subscription.endpoint.slice(0, 40)}…) : ${(error as Error).message}`,
      );
      return "failed";
    }
  }
}
