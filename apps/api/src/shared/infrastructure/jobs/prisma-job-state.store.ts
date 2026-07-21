import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { JobStateStore } from "../../domain/ports/job-state.store";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Adapter Prisma de l'état des tâches périodiques.
 *
 * La prise de verrou est faite en **une seule instruction SQL** : `INSERT … ON CONFLICT
 * DO UPDATE … WHERE`. Lire l'échéance puis écrire séparément laisserait une fenêtre où
 * deux requêtes simultanées se croiraient toutes deux légitimes — et déclencheraient deux
 * fois la même synchronisation.
 */
@Injectable()
export class PrismaJobStateStore implements JobStateStore {
  constructor(private readonly prisma: PrismaService) {}

  async claim(job: string, notBefore: Date): Promise<boolean> {
    const now = new Date();
    // La clause `WHERE` de l'`ON CONFLICT` porte la condition d'échéance : si la tâche a
    // déjà démarré après `notBefore`, aucune ligne n'est touchée et personne ne prend la
    // main. `RETURNING` nous dit lequel des deux cas s'est produit.
    const claimed = await this.prisma.$queryRaw<{ job: string }[]>(Prisma.sql`
      INSERT INTO "SyncState" ("job", "startedAt", "updatedAt")
      VALUES (${job}, ${now}, ${now})
      ON CONFLICT ("job") DO UPDATE
        SET "startedAt" = ${now}, "updatedAt" = ${now}
        WHERE "SyncState"."startedAt" IS NULL OR "SyncState"."startedAt" < ${notBefore}
      RETURNING "job"
    `);
    return claimed.length > 0;
  }

  async release(
    job: string,
    outcome: { status: "SUCCESS" | "FAILED"; error?: string },
  ): Promise<void> {
    await this.prisma.syncState.update({
      where: { job },
      data: {
        finishedAt: new Date(),
        status: outcome.status,
        // L'erreur précédente est effacée en cas de succès : garder une trace périmée
        // laisserait croire à une panne persistante.
        lastError: outcome.error ?? null,
      },
    });
  }
}
