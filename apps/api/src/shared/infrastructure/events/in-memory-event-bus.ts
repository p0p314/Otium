import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { DomainEvent, EventPublisher } from "../../domain";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Implémentation MVP du port `EventPublisher` : persiste chaque événement dans le
 * journal `domain_events` (source de vérité) puis le diffuse aux handlers en mémoire.
 * Évoluera vers une file Redis (BullMQ) sans impact sur les use cases (ADR-0006).
 */
@Injectable()
export class InMemoryEventBus implements EventPublisher {
  private readonly logger = new Logger(InMemoryEventBus.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.prisma.domainEvent.create({
      data: {
        name: event.name,
        userId: event.userId ?? null,
        mediaId: event.mediaId ?? null,
        payload: event.payload() as Prisma.InputJsonValue,
        occurredAt: event.occurredAt,
      },
    });
    this.logger.debug(`Événement publié: ${event.name}`);
    // TODO(MVP+): dispatch vers handlers (stats, reco, historique).
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
