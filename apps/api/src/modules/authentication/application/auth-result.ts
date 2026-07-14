/** Résultat d'une authentification réussie (inscription ou connexion). */
export interface AuthResult {
  readonly user: { id: string; email: string; displayName: string };
  readonly token: string;
  readonly expiresAt: Date;
}
