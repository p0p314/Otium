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
    try {
      await this.$connect();
      this.logger.log("Connexion PostgreSQL établie");
    } catch (error) {
      // Dégradation gracieuse : on ne bloque pas le démarrage si la base est absente
      // (ex. Docker éteint). Les fonctionnalités sans DB (recherche catalogue) restent
      // disponibles ; Prisma retentera la connexion à la première requête.
      this.logger.error(
        `Connexion PostgreSQL indisponible au démarrage : ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
