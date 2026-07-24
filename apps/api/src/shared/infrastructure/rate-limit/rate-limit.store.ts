import { Injectable } from "@nestjs/common";

/** Décision de comptage pour une clé donnée. */
export interface RateLimitResult {
  /** `true` si la requête est autorisée (sous le plafond). */
  readonly allowed: boolean;
  /** Secondes avant réinitialisation de la fenêtre (pour l'en-tête `Retry-After`). */
  readonly retryAfterSeconds: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Compteur de débit **en mémoire** à fenêtre fixe (in-process). Cohérent avec l'architecture
 * mono-instance (pas de Redis — ADR-0012) : empreinte bornée, aucune dépendance externe.
 *
 * Borne mémoire : au-delà de `maxKeys`, on évince la plus ancienne entrée (Map insertion-
 * ordonnée), ce qui évite qu'un attaquant faisant varier la clé (IP usurpée) ne fasse enfler
 * la mémoire indéfiniment.
 */
@Injectable()
export class RateLimitStore {
  private readonly windows = new Map<string, Window>();
  private readonly maxKeys = 50_000;

  /**
   * Enregistre un « hit » pour `key` et indique s'il reste sous `limit` sur `windowMs`.
   * Effet de bord : incrémente le compteur de la fenêtre courante.
   */
  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let window = this.windows.get(key);

    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
    } else {
      // Réinsère en fin d'ordre : entrée « récemment utilisée » (éviction LRU-like).
      this.windows.delete(key);
    }
    window.count += 1;
    this.windows.set(key, window);

    this.evictIfNeeded();

    const allowed = window.count <= limit;
    return {
      allowed,
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  private evictIfNeeded(): void {
    if (this.windows.size <= this.maxKeys) return;
    const oldest = this.windows.keys().next().value;
    if (oldest !== undefined) this.windows.delete(oldest);
  }
}
