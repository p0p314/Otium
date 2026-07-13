/** Erreur levée lorsqu'un invariant de domaine est violé. */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantError";
  }
}

/**
 * Garantit qu'une condition est vraie, sinon lève une `InvariantError`.
 * Utilisé pour protéger les invariants d'agrégats dans le domaine.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}
