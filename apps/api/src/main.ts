import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { Env } from "./shared/infrastructure/config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  app.use(helmet());
  app.enableCors({ origin: config.get("WEB_ORIGIN", { infer: true }), credentials: true });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  new Logger("Bootstrap").log(`API Otium démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
