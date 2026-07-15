import { Inject, Injectable } from "@nestjs/common";
import type { ViewingStats } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { STATS_REPOSITORY, type StatsRepository } from "../domain";
import { buildViewingStats } from "./stats.view";

/** Construit le tableau de bord de statistiques de visionnage. Lecture seule. */
@Injectable()
export class GetViewingStatsUseCase implements UseCase<string, ViewingStats> {
  constructor(@Inject(STATS_REPOSITORY) private readonly repo: StatsRepository) {}

  async execute(userId: string): Promise<ViewingStats> {
    return buildViewingStats(await this.repo.getRawData(userId), new Date());
  }
}
