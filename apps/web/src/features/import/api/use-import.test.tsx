import type { ImportJobState, ResolveImportInput } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({
  api: { startTvTimeImport: vi.fn(), getImportJob: vi.fn(), resolveImport: vi.fn() },
}));

import { api } from "../../../lib/api";
import { useImportJob, useResolveImport, useStartImport } from "./use-import";

const doneJob: ImportJobState = {
  id: "job-1",
  status: "done",
  progress: { total: 3, processed: 3, imported: 3, episodesMarked: 3, pending: 0, unmatched: 0 },
  report: {
    source: "tvtime",
    movies: { parsed: 2, imported: 2, skipped: 0, pending: 0, unmatched: 0 },
    series: { parsed: 1, imported: 1, skipped: 0, pending: 0, unmatched: 0 },
    episodesMarked: 3,
    unmatchedSample: [],
    pending: [],
  },
  error: null,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useStartImport", () => {
  beforeEach(() => vi.mocked(api.startTvTimeImport).mockReset());

  it("envoie l'archive et expose l'identifiant du job", async () => {
    vi.mocked(api.startTvTimeImport).mockResolvedValue({ jobId: "job-1" });
    const file = new File(["zip"], "tvtime.zip", { type: "application/zip" });
    const { result } = renderHook(() => useStartImport(), { wrapper });

    act(() => result.current.mutate(file));

    await waitFor(() => expect(result.current.data).toEqual({ jobId: "job-1" }));
    expect(api.startTvTimeImport).toHaveBeenCalledWith(file);
  });
});

describe("useImportJob", () => {
  beforeEach(() => vi.mocked(api.getImportJob).mockReset());

  it("interroge l'état du job une fois l'identifiant fourni", async () => {
    vi.mocked(api.getImportJob).mockResolvedValue(doneJob);
    const { result } = renderHook(() => useImportJob("job-1"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(doneJob));
    expect(api.getImportJob).toHaveBeenCalledWith("job-1");
  });

  it("reste désactivé tant qu'aucun identifiant n'est fourni", () => {
    const { result } = renderHook(() => useImportJob(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.getImportJob).not.toHaveBeenCalled();
  });
});

describe("useResolveImport", () => {
  beforeEach(() => vi.mocked(api.resolveImport).mockReset());

  it("résout une entrée ambiguë avec le candidat choisi", async () => {
    vi.mocked(api.resolveImport).mockResolvedValue({ imported: true, episodesMarked: 3 });
    const input: ResolveImportInput = {
      candidate: { externalId: "the100", title: "Les 100", year: 2014, posterUrl: null },
      entry: { type: "SERIES", title: "The 100", year: null, status: "IN_PROGRESS", watchedEpisodes: [] },
    };
    const { result } = renderHook(() => useResolveImport(), { wrapper });

    act(() => result.current.mutate(input));

    await waitFor(() => expect(result.current.data).toEqual({ imported: true, episodesMarked: 3 }));
    expect(api.resolveImport).toHaveBeenCalledWith(input);
  });
});
