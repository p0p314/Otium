import type { DomainEvent } from "../domain-event";

/**
 * Port de publication d'événements de domaine. Implémenté en infrastructure
 * (bus in-memory puis file Redis) — le domaine ne connaît pas l'implémentation.
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

/** Jeton d'injection (DI) pour le port `EventPublisher`. */
export const EVENT_PUBLISHER = Symbol("EVENT_PUBLISHER");
