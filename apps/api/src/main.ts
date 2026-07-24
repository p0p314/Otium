import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { setupFrenchZodErrors } from "@otium/types";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { Env } from "./shared/infrastructure/config/env";

async function bootstrap(): Promise<void> {
  // Messages de validation Zod en français (pipe de validation + config).
  setupFrenchZodErrors();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  // Derrière le proxy Render : fait confiance au premier saut pour lire l'IP client réelle
  // (`X-Forwarded-For`) — indispensable au rate limiting par IP et au cookie `secure`.
  app.set("trust proxy", 1);

  // En service unique, l'API sert aussi le SPA : la CSP par défaut de helmet
  // (`img-src 'self'`) bloquerait les affiches/backdrops chargés depuis les
  // fournisseurs externes (TMDB…). On autorise donc les images https + data:, tout
  // en gardant scripts/objets stricts. `connect-src 'self'` : le front appelle l'API
  // en same-origin (`/api`).
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'"],
        },
      },
    }),
  );
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

  // Journalisation légère des requêtes en développement (diagnostic).
  if (!isProduction) {
    const httpLogger = new Logger("HTTP");
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.on("finish", () =>
        httpLogger.log(`${req.method} ${req.originalUrl} → ${res.statusCode}`),
      );
      next();
    });
  }

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  new Logger("Bootstrap").log(`API Otium démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
