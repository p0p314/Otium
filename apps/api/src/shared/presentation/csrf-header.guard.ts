import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

/**
 * En-tête anti-CSRF exigé sur les requêtes mutantes. Le SDK Otium le pose sur chaque appel.
 * Doit rester synchronisé avec `packages/api-sdk` (client HTTP).
 */
export const CSRF_HEADER = "x-otium-csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Défense en profondeur contre le CSRF (audit VULN-06), y compris le **login CSRF**.
 *
 * Principe : toute requête mutante doit porter un en-tête applicatif custom. Un formulaire
 * HTML cross-site (vecteur CSRF classique) ne peut pas ajouter d'en-tête ; une requête
 * `fetch` cross-origin qui l'ajoute déclenche un préflight CORS, refusé par notre CORS strict
 * (origine verrouillée sur `WEB_ORIGIN`). Seul le front same-origin (ou un client explicite)
 * peut donc muter l'état. Complète `SameSite=Lax` sans dépendre de lui seul.
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (request.headers[CSRF_HEADER]) return true;
    throw new ForbiddenException("Requête rejetée (protection CSRF) : en-tête manquant.");
  }
}
