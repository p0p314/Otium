import type { MediaDetails } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { getMediaDetails: vi.fn() } }));

import { api } from "../../../lib/api";
import { useMediaDetails } from "./use-media-details";

const details = {
  type: "MOVIE",
  title: "Dune",
  externalRef: { provider: "tmdb", externalId: "1" },
} as unknown as MediaDetails;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useMediaDetails", () => {
  beforeEach(() => vi.mocked(api.getMediaDetails).mockReset());

  it("charge la fiche détaillée via le SDK", async () => {
    vi.mocked(api.getMediaDetails).mockResolvedValue(details);
    const { result } = renderHook(() => useMediaDetails("MOVIE", "1"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(details));
    expect(api.getMediaDetails).toHaveBeenCalledWith("MOVIE", "1");
  });
});
