/** Erreurs métier de l'authentification (traduites en HTTP dans la présentation). */
export class EmailAlreadyUsedError extends Error {
  constructor() {
    super("Cette adresse e-mail est déjà utilisée.");
    this.name = "EmailAlreadyUsedError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Identifiants invalides.");
    this.name = "InvalidCredentialsError";
  }
}
