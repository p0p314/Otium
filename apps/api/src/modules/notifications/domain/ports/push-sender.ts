import type { NotificationContent } from "../models/notification";
import type { PushSubscriptionRecord } from "./push-subscription.repository";

/**
 * Issue d'un envoi Push :
 * - `sent` — accepté par le service Push ;
 * - `expired` — l'abonnement n'existe plus (404/410) : à **supprimer** ;
 * - `failed` — échec transitoire (réseau, 5xx) : l'abonnement est conservé.
 */
export type PushSendResult = "sent" | "expired" | "failed";

/**
 * Port d'envoi Web Push (ADR-0020). Le domaine ignore VAPID et le chiffrement `aes128gcm` :
 * l'adapter d'infrastructure (`web-push`) les porte. `isConfigured` permet de désactiver
 * proprement l'envoi quand les clés VAPID ne sont pas fournies, sans faire échouer l'app.
 */
export interface PushSender {
  isConfigured(): boolean;
  /** Clé publique VAPID à transmettre au navigateur pour l'inscription. */
  publicKey(): string | null;
  send(subscription: PushSubscriptionRecord, content: NotificationContent): Promise<PushSendResult>;
}

export const PUSH_SENDER = Symbol("PUSH_SENDER");
