import { Global, Module } from "@nestjs/common";
import { JOB_STATE_STORE } from "../../domain/ports/job-state.store";
import { DueJobRunner } from "./due-job.runner";
import { PrismaJobStateStore } from "./prisma-job-state.store";

/**
 * Tâches périodiques (ADR-0019). Global comme le cache : toute fonctionnalité peut
 * déclencher une tâche due sans que son module ait à câbler quoi que ce soit.
 */
@Global()
@Module({
  providers: [DueJobRunner, { provide: JOB_STATE_STORE, useClass: PrismaJobStateStore }],
  exports: [DueJobRunner],
})
export class JobsModule {}
