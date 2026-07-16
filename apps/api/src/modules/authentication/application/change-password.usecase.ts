import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { PASSWORD_HASHER, type PasswordHasher } from "../domain/ports/password-hasher";
import { InvalidCredentialsError } from "./errors";

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Change le mot de passe après vérification de l'actuel. Un mot de passe courant
 * invalide lève `InvalidCredentialsError` (mappé en 400 par la présentation, jamais
 * en 401 : on ne déconnecte pas l'utilisateur pour une simple erreur de saisie).
 */
@Injectable()
export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");

    if (!(await this.hasher.verify(currentPassword, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    await this.users.updatePassword(userId, await this.hasher.hash(newPassword));
  }
}
