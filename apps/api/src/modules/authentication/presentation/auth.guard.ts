import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import { readSessionCookie } from "./session-cookie";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

/** Requête authentifiée : l'utilisateur courant est attaché par le guard. */
export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  authToken?: string;
}

/** Protège une route : exige un jeton de session Bearer valide. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Authentification requise.");

    const userId = await this.sessions.resolve(token);
    if (!userId) throw new UnauthorizedException("Session invalide ou expirée.");

    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException("Session invalide ou expirée.");

    request.user = { id: user.id, email: user.email.value, displayName: user.displayName };
    request.authToken = token;
    return true;
  }

  /**
   * Résout le jeton : cookie httpOnly en priorité (navigateur), sinon en-tête
   * `Authorization: Bearer` (clients non-navigateur, ex. mobile).
   */
  private extractToken(request: Request): string | null {
    const cookieToken = readSessionCookie(request);
    if (cookieToken) return cookieToken;
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length).trim() || null;
  }
}
