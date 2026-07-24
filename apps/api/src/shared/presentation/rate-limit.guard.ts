import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { RateLimitStore } from "../infrastructure/rate-limit/rate-limit.store";
import { RATE_LIMIT_KEY, type RateLimitOptions } from "./rate-limit.decorator";

/**
 * Garde globale de limitation de débit. Ne s'active que sur les routes portant `@RateLimit`
 * (métadonnée résolue par le `Reflector`, niveau méthode prioritaire sur le contrôleur).
 *
 * Clé de comptage = route (contrôleur.handler) + adresse IP du client. L'IP repose sur
 * `request.ip`, correct derrière le proxy Render **à condition** d'avoir activé `trust proxy`
 * (voir `main.ts`).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: RateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `${routeKey}:${this.clientIp(request)}`;

    const { allowed, retryAfterSeconds } = this.store.hit(
      key,
      options.limit,
      options.windowSeconds * 1000,
    );
    if (!allowed) {
      response.setHeader("Retry-After", String(retryAfterSeconds));
      throw new HttpException(
        "Trop de requêtes. Réessayez dans un instant.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** IP client (proxy de confiance résolu par Express). Repli sur l'adresse socket. */
  private clientIp(request: Request): string {
    return request.ip ?? request.socket?.remoteAddress ?? "unknown";
  }
}
