/** Abonnement Push persisté, réduit à ce qu'il faut pour envoyer (chiffrement inclus). */
export interface PushSubscriptionRecord {
  readonly id: string;
  readonly userId: string;
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

/** Données d'un abonnement à enregistrer (issu de `PushSubscription.toJSON()`). */
export interface PushSubscriptionData {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
  readonly userAgent: string | null;
}

/**
 * Port de persistance des abonnements Push (ADR-0020). Un utilisateur peut en avoir
 * plusieurs (un par appareil) ; l'`endpoint` est l'identité globale d'un abonnement.
 */
export interface PushSubscriptionRepository {
  /**
   * Enregistre (ou met à jour) l'abonnement d'un appareil. Idempotent par `endpoint` :
   * un ré-enregistrement rattache l'endpoint à l'utilisateur courant (appareil partagé).
   */
  save(userId: string, data: PushSubscriptionData): Promise<void>;
  /** Retire un abonnement **de l'utilisateur** (désinscription volontaire). */
  removeForUser(userId: string, endpoint: string): Promise<void>;
  /** Retire un abonnement par endpoint, sans égard au propriétaire (purge d'un endpoint mort). */
  removeByEndpoint(endpoint: string): Promise<void>;
  /** Abonnements de plusieurs utilisateurs, à plat (envoi groupé). */
  findByUserIds(userIds: readonly string[]): Promise<PushSubscriptionRecord[]>;
  /** Abonnements d'un utilisateur (gestion / diagnostic). */
  findByUser(userId: string): Promise<PushSubscriptionRecord[]>;
}

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol("PUSH_SUBSCRIPTION_REPOSITORY");
