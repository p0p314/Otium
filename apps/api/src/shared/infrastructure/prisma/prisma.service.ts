import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Accès à la base via Prisma. Encapsulé en infrastructure : aucune couche domaine
 * n'importe ce service directement — elles passent par des ports (repositories).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Connexion PostgreSQL établie");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
