import { DomainEvent } from "../../../../shared/domain/domain-event";

/** Émis lorsqu'un nouvel utilisateur s'inscrit (alimente stats, notifications…). */
export class UserRegistered extends DomainEvent {
  readonly name = "UserRegistered";

  constructor(
    userId: string,
    private readonly email: string,
  ) {
    super(userId);
  }

  payload(): Record<string, unknown> {
    return { email: this.email };
  }
}
