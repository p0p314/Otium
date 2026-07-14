import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../domain/ports/password-hasher";

const SALT_ROUNDS = 12;

/** Adapter bcrypt (pur JS) du port `PasswordHasher`. */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
