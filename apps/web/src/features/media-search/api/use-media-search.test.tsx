import type { SearchMediaResult } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { searchMedia: vi.fn() } }));

import { api } from "../../../lib/api";
import { useMediaSearch } from "./use-media-search";

const result: SearchMediaResult = { items: [], page: 1, pageSize: 20, total: 0 };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useMediaSearch", () => {
  beforeEach(() => vi.mocked(api.searchMedia).mockReset());

  it("n'appelle pas l'API sous le seuil de caractères", () => {
    renderHook(() => useMediaSearch("D"), { wrapper });
    expect(api.searchMedia).not.toHaveBeenCalled();
  });

  it("récupère les résultats pour une requête valide", async () => {
    vi.mocked(api.searchMedia).mockResolvedValue(result);
    const { result: hook } = renderHook(() => useMediaSearch("Dune"), { wrapper });

    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    // `field` accompagne désormais chaque requête ; « ALL » est le mode par défaut.
    expect(api.searchMedia).toHaveBeenCalledWith({
      q: "Dune",
      page: 1,
      pageSize: 20,
      field: "ALL",
    });
  });
});
