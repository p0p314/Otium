import { Injectable } from "@nestjs/common";

export class HttpRequestError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`Requête HTTP ${status} sur ${url}`);
    this.name = "HttpRequestError";
  }
}

/**
 * Client HTTP minimal basé sur `fetch` global (Node 20+). Encapsulé en infrastructure
 * pour rester mockable dans les tests des adapters (aucun appel réseau réel en CI).
 */
@Injectable()
export class HttpClient {
  async getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new HttpRequestError(response.status, url);
    }
    return (await response.json()) as T;
  }
}
