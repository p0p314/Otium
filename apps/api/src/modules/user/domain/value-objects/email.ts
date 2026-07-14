import { invariant } from "@otium/utils";
import { ValueObject } from "../../../../shared/domain/value-object";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailProps extends Record<string, unknown> {
  value: string;
}

/** Adresse e-mail normalisée (minuscules, sans espaces) et valide. */
export class Email extends ValueObject<EmailProps> {
  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    invariant(EMAIL_REGEX.test(value), "Adresse e-mail invalide");
    return new Email({ value });
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
