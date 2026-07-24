import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { PASSWORD_HASHER, type PasswordHasher } from "../domain/ports/password-hasher";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import { InvalidCredentialsError } from "./errors";

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  /**
   * Jeton de la session courante, à **conserver** lors de la révocation des autres
   * sessions. Absent (client non-navigateur sans jeton) : toutes les sessions sont révoquées.
   */
  keepSessionToken?: string;
}

/**
 * Change le mot de passe après vérification de l'actuel. Un mot de passe courant
 * invalide lève `InvalidCredentialsError` (mappé en 400 par la présentation, jamais
 * en 401 : on ne déconnecte pas l'utilisateur pour une simple erreur de saisie).
 *
 * Après le changement, **toutes les autres sessions sont révoquées** (sauf la session
 * courante) : un jeton volé avant le changement cesse d'être exploitable.
 */
@Injectable()
export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
  ) {}

  async execute({
    userId,
    currentPassword,
    newPassword,
    keepSessionToken,
  }: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");

    if (!(await this.hasher.verify(currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    await this.users.updatePassword(userId, await this.hasher.hash(newPassword));
    await this.sessions.revokeAllForUser(userId, keepSessionToken);
  }
}
