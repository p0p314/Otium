import { Entity } from "../../../../shared/domain/entity";
import { Email } from "../value-objects/email";

interface UserProps {
  email: Email;
  passwordHash: string;
  displayName: string;
}

/**
 * Utilisateur (identité). Le domaine ne manipule que le **hash** du mot de passe,
 * jamais le mot de passe en clair (celui-ci ne quitte pas la couche application).
 */
export class User extends Entity<string> {
  private constructor(
    id: string,
    private props: UserProps,
  ) {
    super(id);
  }

  /** Reconstitue un utilisateur existant (depuis la persistance). */
  static rehydrate(id: string, props: UserProps): User {
    return new User(id, props);
  }

  /** Crée un nouvel utilisateur (l'id est attribué par l'infrastructure). */
  static create(props: UserProps): User {
    return new User("", props);
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  /** Renomme l'utilisateur (nom affiché). */
  rename(displayName: string): void {
    this.props.displayName = displayName;
  }

  /** Change l'adresse e-mail (identité) de l'utilisateur. */
  changeEmail(email: Email): void {
    this.props.email = email;
  }
}
