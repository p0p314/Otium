import type { Email } from "../value-objects/email";
import type { User } from "../entities/user.entity";

/** Port de persistance des utilisateurs. Implémenté en infrastructure (Prisma). */
export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  /** Persiste un nouvel utilisateur et renvoie l'entité avec son id attribué. */
  create(user: User): Promise<User>;
}

/** Jeton d'injection (DI) du port `UserRepository`. */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
