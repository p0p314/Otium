import type { NotificationType } from "../models/notification";

/** Une prise anti-doublon à réclamer avant envoi. */
export interface NotificationClaim {
  readonly userId: string;
  readonly dedupKey: string;
  readonly type: NotificationType;
}

/**
 * Registre **anti-doublon** des notifications déjà prises en charge (ADR-0020).
 *
 * `claim` est le garde-fou central : il réclame un lot de clés et renvoie **uniquement**
 * celles qui viennent d'être insérées. L'opération est **atomique** côté base
 * (`INSERT … ON CONFLICT DO NOTHING RETURNING`) : deux exécutions simultanées (crons
 * relancés, plusieurs workers) ne peuvent pas réclamer la même clé, donc une notification
 * n'est envoyée qu'une seule fois — même après redémarrage.
 */
export interface SentNotificationStore {
  /**
   * Réclame un lot de notifications. Renvoie le sous-ensemble **effectivement réservé**
   * (nouvellement inséré) ; les clés déjà présentes sont ignorées silencieusement.
   */
  claim(claims: readonly NotificationClaim[]): Promise<NotificationClaim[]>;
}

export const SENT_NOTIFICATION_STORE = Symbol("SENT_NOTIFICATION_STORE");
