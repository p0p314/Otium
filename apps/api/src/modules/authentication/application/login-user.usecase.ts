import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { Email, USER_REPOSITORY, type UserRepository } from "../../user/domain";
import { PASSWORD_HASHER, type PasswordHasher } from "../domain/ports/password-hasher";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import type { AuthResult } from "./auth-result";
import { InvalidCredentialsError } from "./errors";

export interface LoginUserInput {
  email: string;
  password: string;
}

/** Authentifie un utilisateur par e-mail + mot de passe et ouvre une session. */
@Injectable()
export class LoginUserUseCase implements UseCase<LoginUserInput, AuthResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
  ) {}

  async execute(input: LoginUserInput): Promise<AuthResult> {
    const email = Email.create(input.email);
    const user = await this.users.findByEmail(email);

    // Message identique que l'utilisateur existe ou non (anti-énumération de comptes).
    if (!user || !(await this.hasher.verify(input.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const session = await this.sessions.create(user.id);
    return {
      user: { id: user.id, email: user.email.value, displayName: user.displayName },
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}
