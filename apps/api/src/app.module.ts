import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { MediaModule } from "./modules/media/media.module";
import { validateEnv } from "./shared/infrastructure/config/env";
import { EventsModule } from "./shared/infrastructure/events/events.module";
import { HttpModule } from "./shared/infrastructure/http/http.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { RedisModule } from "./shared/infrastructure/redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    HttpModule,
    EventsModule,
    HealthModule,
    MediaModule,
  ],
})
export class AppModule {}
