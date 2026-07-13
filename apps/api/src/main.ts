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
  // En dev, tolère toutes les variantes locales (localhost / 127.0.0.1, tout port) pour
  // éviter les blocages CORS selon l'URL ouverte. En prod, on reste strict sur WEB_ORIGIN.
  const isProduction = config.get("NODE_ENV", { infer: true }) === "production";
  app.enableCors({
    origin: isProduction
      ? config.get("WEB_ORIGIN", { infer: true })
      : [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/],
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  new Logger("Bootstrap").log(`API Otium démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
