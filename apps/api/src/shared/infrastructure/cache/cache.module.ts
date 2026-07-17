import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";

/** Cache mémoire partagé (global) : disponible pour tout module technique. */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
