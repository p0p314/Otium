import { Inject, Injectable } from "@nestjs/common";
import type { UseCase } from "../../../shared/application/use-case";
import { EVENT_PUBLISHER, type EventPublisher } from "../../../shared/domain";
import { Email, USER_REPOSITORY, User, type UserRepository } from "../../user/domain";
import { PASSWORD_HASHER, type PasswordHasher } from "../domain/ports/password-hasher";
import { SESSION_STORE, type SessionStore } from "../domain/ports/session-store";
import { UserRegistered } from "../domain/events/user-registered.event";
import type { AuthResult } from "./auth-result";
import { EmailAlreadyUsedError } from "./errors";

export interface RegisterUserInput {
  email: string;
  password: string;
  displayName: string;
}

/** Inscrit un nouvel utilisateur, émet `UserRegistered` et ouvre une session. */
@Injectable()
export class RegisterUserUseCase implements UseCase<RegisterUserInput, AuthResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute(input: RegisterUserInput): Promise<AuthResult> {
    const email = Email.create(input.email);

    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyUsedError();
    }

    const passwordHash = await this.hasher.hash(input.password);
    const created = await this.users.create(
      User.create({ email, passwordHash, displayName: input.displayName.trim() }),
    );

    await this.events.publish(new UserRegistered(created.id, email.value));
    const session = await this.sessions.create(created.id);

    return {
      user: { id: created.id, email: created.email.value, displayName: created.displayName },
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }
}
