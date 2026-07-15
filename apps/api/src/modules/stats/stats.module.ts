import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/authentication.module";
import { GetViewingStatsUseCase } from "./application/get-viewing-stats.usecase";
import { STATS_REPOSITORY } from "./domain";
import { PrismaStatsRepository } from "./infrastructure/prisma-stats.repository";
import { StatsController } from "./presentation/stats.controller";

@Module({
  imports: [AuthenticationModule], // AuthGuard
  controllers: [StatsController],
  providers: [
    GetViewingStatsUseCase,
    { provide: STATS_REPOSITORY, useClass: PrismaStatsRepository },
  ],
})
export class StatsModule {}
