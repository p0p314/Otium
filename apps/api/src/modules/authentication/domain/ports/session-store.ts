export interface Session {
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: Date;
}

/**
 * Port de gestion des sessions (jetons opaques). Implémenté en infrastructure (Postgres).
 * Le domaine ne connaît ni la base ni le format de stockage.
 */
export interface SessionStore {
  /** Crée une session pour l'utilisateur et renvoie le jeton + son expiration. */
  create(userId: string): Promise<Session>;
  /** Retourne l'id utilisateur associé à un jeton valide, ou null. */
  resolve(token: string): Promise<string | null>;
  /** Révoque un jeton (déconnexion). */
  revoke(token: string): Promise<void>;
  /**
   * Révoque **toutes** les sessions d'un utilisateur, sauf éventuellement `exceptToken`
   * (la session courante, à conserver). Utilisé après un changement d'identifiant sensible
   * (mot de passe) : les jetons volés antérieurement cessent d'être valides.
   */
  revokeAllForUser(userId: string, exceptToken?: string): Promise<void>;
}

export const SESSION_STORE = Symbol("SESSION_STORE");
