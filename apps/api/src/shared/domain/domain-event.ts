/**
 * Événement de domaine. Émis par les use cases lors d'un changement d'état métier
 * significatif ; alimente historique, statistiques, recommandations (ADR-0006).
 */
export abstract class DomainEvent {
  /** Nom stable de l'événement, ex. "MediaAdded". */
  abstract readonly name: string;
  readonly occurredAt: Date;

  constructor(
    readonly userId?: string,
    readonly mediaId?: string,
  ) {
    this.occurredAt = new Date();
  }

  /** Charge utile sérialisable persistée dans le journal `domain_events`. */
  abstract payload(): Record<string, unknown>;
}
