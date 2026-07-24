import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpClient, HttpRequestError, redactUrl } from "./http-client";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

describe("redactUrl", () => {
  it("masque la clé d'API Google en query string", () => {
    expect(redactUrl("https://api.test/v1/volumes?q=Dune&key=SECRET")).toBe(
      "https://api.test/v1/volumes?q=Dune&key=%5Bmasqu%C3%A9%5D",
    );
  });

  it("masque aussi les autres porteurs de secret courants", () => {
    for (const param of ["api_key", "apikey", "access_token", "token"]) {
      expect(redactUrl(`https://api.test/x?${param}=SECRET`)).not.toContain("SECRET");
    }
  });

  it("ne touche pas aux paramètres anodins", () => {
    expect(redactUrl("https://api.test/x?q=Dune&page=2")).toBe("https://api.test/x?q=Dune&page=2");
  });

  it("ne divulgue rien d'une URL illisible", () => {
    expect(redactUrl("pas-une-url?key=SECRET")).toBe("[url illisible]");
  });
});

describe("HttpRequestError", () => {
  it("n'expose jamais le secret, ni dans le message ni dans l'URL", () => {
    const error = new HttpRequestError(503, "https://api.test/x?q=Dune&key=SECRET");
    expect(error.message).not.toContain("SECRET");
    expect(error.url).not.toContain("SECRET");
    expect(error.status).toBe(503);
  });
});

describe("HttpClient", () => {
  const client = new HttpClient();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  afterEach(() => fetchMock.mockReset());

  it("renvoie le JSON quand la requête aboutit", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await expect(client.getJson("https://api.test/x")).resolves.toEqual({ ok: 1 });
  });

  it("borne chaque tentative par un AbortSignal (timeout)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await client.getJson("https://api.test/x");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("retente un dépassement de délai comme une panne réseau", async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));

    await expect(
      client.getJson("https://api.test/x", {}, { retries: 1, retryDelayMs: 0 }),
    ).resolves.toEqual({ ok: 1 });
  });

  it("ne réessaie pas par défaut", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));
    await expect(client.getJson("https://api.test/x")).rejects.toThrow(HttpRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("réessaie une erreur transitoire puis réussit", async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));

    const result = await client.getJson("https://api.test/x", {}, { retries: 2, retryDelayMs: 0 });

    expect(result).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("abandonne après le nombre de tentatives prévu", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));

    await expect(
      client.getJson("https://api.test/x", {}, { retries: 2, retryDelayMs: 0 }),
    ).rejects.toThrow(HttpRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("ne réessaie pas une erreur définitive (404)", async () => {
    fetchMock.mockResolvedValue(errorResponse(404));

    await expect(
      client.getJson("https://api.test/x", {}, { retries: 3, retryDelayMs: 0 }),
    ).rejects.toThrow(HttpRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("réessaie aussi une panne réseau", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(jsonResponse({ ok: 1 }));

    await expect(
      client.getJson("https://api.test/x", {}, { retries: 1, retryDelayMs: 0 }),
    ).resolves.toEqual({ ok: 1 });
  });

  it("propage une panne réseau une fois les tentatives épuisées", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      client.getJson("https://api.test/x", {}, { retries: 1, retryDelayMs: 0 }),
    ).rejects.toThrow("ECONNRESET");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
