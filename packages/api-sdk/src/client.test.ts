import type { SearchMediaResult } from "@otium/types";
import { describe, expect, it, vi } from "vitest";
import { OtiumClient } from "./client.js";
import { ApiError } from "./errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const emptyResult: SearchMediaResult = { items: [], page: 1, pageSize: 20, total: 0 };

describe("OtiumClient", () => {
  it("construit l'URL de recherche et parse la réponse", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(emptyResult));
    const client = new OtiumClient({ baseUrl: "http://api.test/", fetch: fetchMock });

    const result = await client.searchMedia({ q: "Dune", page: 1, pageSize: 20 });

    expect(result).toEqual(emptyResult);
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("http://api.test/media/search?");
    expect(calledUrl).toContain("q=Dune");
  });

  it("ajoute l'en-tête d'autorisation quand un jeton est fourni", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    const client = new OtiumClient({
      baseUrl: "http://api.test",
      fetch: fetchMock,
      getToken: () => "secret",
    });

    await client.getLibrary();

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
  });

  it("lève ApiError sur une réponse non-OK", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "nope" }, 500));
    const client = new OtiumClient({ baseUrl: "http://api.test", fetch: fetchMock });

    await expect(client.getLibrary()).rejects.toBeInstanceOf(ApiError);
  });
});
