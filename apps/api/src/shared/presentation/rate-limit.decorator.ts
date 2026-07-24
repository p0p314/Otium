import { SetMetadata } from "@nestjs/common";

/** Clé de métadonnée lue par `RateLimitGuard`. */
export const RATE_LIMIT_KEY = "otium:rate-limit";

export interface RateLimitOptions {
  /** Nombre maximal de requêtes autorisées par fenêtre. */
  readonly limit: number;
  /** Largeur de la fenêtre, en secondes. */
  readonly windowSeconds: number;
}

/**
 * Applique une limite de débit à une route ou à un contrôleur (niveau méthode prioritaire).
 * Ex. `@RateLimit({ limit: 10, windowSeconds: 60 })`. La garde globale `RateLimitGuard`
 * n'agit que sur les routes ainsi annotées ; les autres passent sans coût.
 */
export const RateLimit = (options: RateLimitOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_KEY, options);
