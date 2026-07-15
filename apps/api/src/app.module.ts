import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { HealthModule } from "./modules/health/health.module";
import { LibraryModule } from "./modules/library/library.module";
import { MediaModule } from "./modules/media/media.module";
import { StatsModule } from "./modules/stats/stats.module";
import { validateEnv } from "./shared/infrastructure/config/env";
import { EventsModule } from "./shared/infrastructure/events/events.module";
import { HttpModule } from "./shared/infrastructure/http/http.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { RedisModule } from "./shared/infrastructure/redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env à la racine du monorepo (cwd = apps/api en dev/prisma) ; fallback local.
      envFilePath: ["../../.env", ".env"],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    HttpModule,
    EventsModule,
    HealthModule,
    MediaModule,
    AuthenticationModule,
    LibraryModule,
    StatsModule,
  ],
})
export class AppModule {}
