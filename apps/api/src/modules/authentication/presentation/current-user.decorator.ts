import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser, RequestWithUser } from "./auth.guard";

/** Injecte l'utilisateur authentifié (posé par `AuthGuard`) dans un handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) throw new Error("CurrentUser utilisé sans AuthGuard");
    return request.user;
  },
);
