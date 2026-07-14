/** Port de hachage de mot de passe. Implémenté en infrastructure (bcrypt). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");
