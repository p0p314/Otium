/**
 * Type `Result` — modélise explicitement le succès ou l'échec sans exceptions.
 * Utilisé dans le domaine et l'application pour rendre les erreurs métier visibles
 * dans les signatures (voir CLAUDE.md — lisibilité & maintenabilité).
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;

export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

/** Applique `fn` à la valeur en cas de succès, propage l'erreur sinon. */
export const mapResult = <T, U, E>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

/** Déballe la valeur ou lève l'erreur — à réserver aux frontières (tests, adapters). */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw r.error instanceof Error ? r.error : new Error(String(r.error));
};
