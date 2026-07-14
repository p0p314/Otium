/** Vrai si la valeur n'est ni `null` ni `undefined` (utile pour filtrer en gardant le type). */
export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/** Vrai si la chaîne est non vide une fois les espaces retirés. */
export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
