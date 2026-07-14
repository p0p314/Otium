import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { RedisService } from "../../shared/infrastructure/redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness : le process répond (aucune dépendance externe requise). */
  @Get()
  live(): { status: "ok"; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /** Readiness : les dépendances (PostgreSQL, Redis) sont joignables. */
  @Get("ready")
  async ready(): Promise<{ status: "ready" | "degraded"; checks: Record<string, boolean> }> {
    const checks = {
      database: await this.check(() => this.prisma.$queryRaw`SELECT 1`),
      redis: await this.check(async () => {
        await this.redis.client.connect().catch(() => undefined);
        return this.redis.client.ping();
      }),
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
