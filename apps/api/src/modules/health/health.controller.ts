import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness : le process répond (aucune dépendance externe requise). */
  @Get()
  live(): { status: "ok"; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /** Readiness : la base PostgreSQL est joignable (seule dépendance externe). */
  @Get("ready")
  async ready(): Promise<{ status: "ready" | "degraded"; checks: Record<string, boolean> }> {
    const checks = {
      database: await this.check(() => this.prisma.$queryRaw`SELECT 1`),
    };
    const allUp = Object.values(checks).every(Boolean);
    return { status: allUp ? "ready" : "degraded", checks };
  }

  private async check(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn();
      return true;
    } catch {
      return false;
    }
  }
}
