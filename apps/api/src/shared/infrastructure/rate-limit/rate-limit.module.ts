import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RateLimitGuard } from "../../presentation/rate-limit.guard";
import { RateLimitStore } from "./rate-limit.store";

/**
 * Fournit le compteur de débit (singleton in-process) et enregistre `RateLimitGuard` en
 * garde **globale**. La garde est inerte sur les routes non annotées `@RateLimit`, donc son
 * coût est nul en dehors des points sensibles (auth, import, recherche média).
 */
@Global()
@Module({
  providers: [RateLimitStore, { provide: APP_GUARD, useClass: RateLimitGuard }],
  exports: [RateLimitStore],
})
export class RateLimitModule {}
