import type { ImportReport } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { importTvTime: vi.fn() } }));

import { api } from "../../../lib/api";
import { useImportTvTime } from "./use-import";

const report = {
  source: "tvtime",
  movies: { parsed: 2, imported: 2, skipped: 0, unmatched: 0 },
  series: { parsed: 1, imported: 1, skipped: 0, unmatched: 0 },
  episodesMarked: 3,
  unmatchedSample: [],
} as unknown as ImportReport;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useImportTvTime", () => {
  beforeEach(() => vi.mocked(api.importTvTime).mockReset());

  it("envoie l'archive et expose le rapport", async () => {
    vi.mocked(api.importTvTime).mockResolvedValue(report);
    const file = new File(["zip"], "tvtime.zip", { type: "application/zip" });
    const { result } = renderHook(() => useImportTvTime(), { wrapper });

    act(() => result.current.mutate(file));

    await waitFor(() => expect(result.current.data).toEqual(report));
    expect(api.importTvTime).toHaveBeenCalledWith(file);
  });
});
