import { resolve } from "node:path";
import { type DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { CsrfHeaderGuard } from "./shared/presentation/csrf-header.guard";
import { AccountModule } from "./modules/account/account.module";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { HealthModule } from "./modules/health/health.module";
import { ImportModule } from "./modules/import/import.module";
import { LibraryModule } from "./modules/library/library.module";
import { MediaModule } from "./modules/media/media.module";
import { StatsModule } from "./modules/stats/stats.module";
import { CacheModule } from "./shared/infrastructure/cache/cache.module";
import { validateEnv } from "./shared/infrastructure/config/env";
import { EventsModule } from "./shared/infrastructure/events/events.module";
import { HttpModule } from "./shared/infrastructure/http/http.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { RateLimitModule } from "./shared/infrastructure/rate-limit/rate-limit.module";

/**
 * Service unique (API + SPA) : quand `WEB_DIST_PATH` est défini (production Render),
 * l'API sert aussi le front buildé et renvoie `index.html` en repli (routing SPA).
 * Les routes `/api*` sont exclues pour préserver les réponses JSON. Voir ADR-0012.
 */
function staticModules(): DynamicModule[] {
  const dist = process.env.WEB_DIST_PATH;
  if (!dist) return [];
  return [
    ServeStaticModule.forRoot({
      rootPath: resolve(process.cwd(), dist),
      // Exclut les routes API du repli SPA : /api → JSON (404 inclus), pas index.html.
      exclude: ["/api/(.*)"],
      serveStaticOptions: { index: ["index.html"], maxAge: "1h" },
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env à la racine du monorepo (cwd = apps/api en dev/prisma) ; fallback local.
      envFilePath: ["../../.env", ".env"],
      validate: validateEnv,
    }),
    PrismaModule,
    RateLimitModule,
    CacheModule,
    HttpModule,
    EventsModule,
    HealthModule,
    MediaModule,
    AuthenticationModule,
    AccountModule,
    LibraryModule,
    StatsModule,
    ImportModule,
    ...staticModules(),
  ],
  // Garde anti-CSRF globale : exige l'en-tête custom sur toute requête mutante (VULN-06).
  providers: [{ provide: APP_GUARD, useClass: CsrfHeaderGuard }],
})
export class AppModule {}
