import { Controller, Get, UseGuards } from "@nestjs/common";
import type { ViewingStats } from "@otium/types";
import { AuthGuard, type AuthenticatedUser } from "../../authentication/presentation/auth.guard";
import { CurrentUser } from "../../authentication/presentation/current-user.decorator";
import { GetViewingStatsUseCase } from "../application/get-viewing-stats.usecase";

@Controller("stats")
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly getStats: GetViewingStatsUseCase) {}

  /** `GET /api/stats` — tableau de bord de statistiques de l'utilisateur courant. */
  @Get()
  stats(@CurrentUser() user: AuthenticatedUser): Promise<ViewingStats> {
    return this.getStats.execute(user.id);
  }
}
