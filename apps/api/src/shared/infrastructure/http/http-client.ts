import { Injectable, Logger } from "@nestjs/common";

/**
 * Paramètres de requête portant un secret. Ils transitent en query string chez plusieurs
 * fournisseurs (clé Google Books, `api_key` TMDB v3) et se retrouveraient **en clair dans
 * les logs** au moindre message d'erreur : on les masque à la source.
 */
const SENSITIVE_PARAMS = new Set(["key", "api_key", "apikey", "access_token", "token"]);

/** Remplace la valeur des paramètres sensibles par un marqueur. */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const name of [...url.searchParams.keys()]) {
      if (SENSITIVE_PARAMS.has(name.toLowerCase())) url.searchParams.set(name, "[masqué]");
    }
    return url.toString();
  } catch {
    // URL non analysable : on ne peut rien masquer de façon fiable, on ne la divulgue pas.
    return "[url illisible]";
  }
}

/**
 * Statuts transitoires : réessayer a du sens. `429` (quota momentané) et les `5xx` de
 * passerelle relèvent de l'indisponibilité passagère, pas d'une requête fautive.
 */
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

export class HttpRequestError extends Error {
  /** URL **expurgée** de ses secrets — sûre à journaliser. */
  readonly url: string;

  constructor(
    readonly status: number,
    url: string,
  ) {
    const safeUrl = redactUrl(url);
    super(`Requête HTTP ${status} sur ${safeUrl}`);
    this.name = "HttpRequestError";
    this.url = safeUrl;
  }
}

export interface HttpGetOptions {
  /**
   * Nombre de nouvelles tentatives sur erreur **transitoire** (0 = aucune). À réserver aux
   * fournisseurs réellement instables : chaque tentative est un appel réseau de plus.
   */
  readonly retries?: number;
  /** Délai de base entre deux tentatives (doublé à chaque essai). */
  readonly retryDelayMs?: number;
}

/**
 * Client HTTP minimal basé sur `fetch` global (Node 20+). Encapsulé en infrastructure
 * pour rester mockable dans les tests des adapters (aucun appel réseau réel en CI).
 */
@Injectable()
export class HttpClient {
  private readonly logger = new Logger(HttpClient.name);

  async getJson<T>(
    url: string,
    headers: Record<string, string> = {},
    options: HttpGetOptions = {},
  ): Promise<T> {
    const retries = options.retries ?? 0;
    const baseDelay = options.retryDelayMs ?? 200;

    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(url, { headers });
        if (response.ok) return (await response.json()) as T;
        if (attempt >= retries || !TRANSIENT_STATUSES.has(response.status)) {
          throw new HttpRequestError(response.status, url);
        }
        this.logger.debug(`Tentative ${attempt + 1} : HTTP ${response.status}, nouvel essai`);
      } catch (error) {
        // Une erreur définitive (statut non transitoire, tentatives épuisées) remonte telle
        // quelle ; une panne réseau est retentée comme un 5xx.
        if (error instanceof HttpRequestError || attempt >= retries) throw error;
        this.logger.debug(`Tentative ${attempt + 1} : panne réseau, nouvel essai`);
      }
      await this.wait(baseDelay * 2 ** attempt);
    }
  }

  /**
   * POST JSON — nécessaire aux API GraphQL, qui n'exposent qu'un seul endpoint.
   *
   * Pas de réessai ici : rejouer un POST suppose que l'opération soit idempotente, ce que
   * seul l'appelant sait. Une lecture GraphQL l'est, une mutation ne l'est pas.
   */
  async postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new HttpRequestError(response.status, url);
    return (await response.json()) as T;
  }

  private wait(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
