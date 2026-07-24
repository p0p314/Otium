import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { InvalidCredentialsError } from "../../authentication/application/errors";
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from "../../authentication/domain/ports/password-hasher";
import { USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { ACCOUNT_GATEWAY, type AccountGateway } from "../domain/account-gateway";

export interface DeleteAccountInput {
  readonly userId: string;
  readonly password: string;
}

/**
 * Efface définitivement un compte (droit à l'effacement — RGPD Art. 17), après vérification
 * du mot de passe courant (action irréversible : on prouve l'identité). La suppression
 * cascade sur toutes les données rattachées, sessions comprises.
 */
@Injectable()
export class DeleteAccountUseCase implements UseCase<DeleteAccountInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACCOUNT_GATEWAY) private readonly gateway: AccountGateway,
  ) {}

  async execute({ userId, password }: DeleteAccountInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilisateur introuvable.");

    if (!(await this.hasher.verify(password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    await this.gateway.delete(userId);
  }
}
