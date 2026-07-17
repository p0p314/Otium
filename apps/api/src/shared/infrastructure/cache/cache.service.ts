import { Injectable } from "@nestjs/common";

interface CacheEntry {
  readonly value: unknown;
  readonly expiresAt: number;
}

/**
 * Cache clé/valeur **en mémoire** (in-process), avec expiration (TTL) et borne LRU.
 * Remplace Redis pour l'hébergement gratuit à service unique (voir ADR-0012) : pas de
 * dépendance externe, empreinte mémoire bornée (éco-conception + tier gratuit ~512 Mo).
 *
 * Port technique (comme l'était `RedisService`) : le domaine ne le connaît pas. Un adapter
 * distribué (Redis) pourrait le remplacer plus tard sans toucher aux appelants.
 */
@Injectable()
export class CacheService {
  /** Map insertion-ordonnée : la première clé est la moins récemment utilisée. */
  private readonly store = new Map<string, CacheEntry>();

  /** Plafond d'entrées pour borner la mémoire (éviction LRU au-delà). */
  private readonly maxEntries = 500;

  /** Retourne la valeur si présente et non expirée, sinon `null`. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    // Marque l'entrée comme récemment utilisée (réinsertion en fin d'ordre).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  /** Enregistre une valeur avec un TTL (secondes). Évince la plus ancienne si plein. */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
