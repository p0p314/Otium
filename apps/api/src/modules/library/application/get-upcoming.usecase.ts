import { Inject, Injectable } from "@nestjs/common";
import type { UpcomingDashboard } from "@otium/types";
import type { UseCase } from "../../../shared/application/use-case";
import { SERIES_TRACKING_REPOSITORY, type SeriesTrackingRepository } from "../domain";
import { buildUpcoming } from "./upcoming.view";

/**
 * Agenda « À venir » : épisodes à diffusion future des séries suivies. Lecture seule
 * (pas d'événement) ; assemblage pur délégué à {@link buildUpcoming}.
 */
@Injectable()
export class GetUpcomingUseCase implements UseCase<string, UpcomingDashboard> {
  constructor(
    @Inject(SERIES_TRACKING_REPOSITORY) private readonly repo: SeriesTrackingRepository,
  ) {}

  async execute(userId: string): Promise<UpcomingDashboard> {
    const records = await this.repo.listTrackedSeries(userId);
    return buildUpcoming(records, new Date());
  }
}
