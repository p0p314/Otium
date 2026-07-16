import type { PendingImport } from "@otium/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/api", () => ({ api: { resolveImport: vi.fn() } }));

import { api } from "../../../lib/api";
import { PendingResolution } from "./pending-resolution";

const pending: PendingImport[] = [
  {
    type: "SERIES",
    title: "The 100",
    year: null,
    status: "IN_PROGRESS",
    watchedEpisodes: [{ seasonNumber: 1, episodeNumber: 1, watchedAt: null }],
    candidates: [
      { externalId: "the100", title: "Les 100", year: 2014, posterUrl: null },
      { externalId: "days", title: "The 100 Days", year: 2013, posterUrl: null },
    ],
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("PendingResolution", () => {
  beforeEach(() => vi.mocked(api.resolveImport).mockReset());

  it("importe le candidat choisi puis retire l'entrée résolue", async () => {
    vi.mocked(api.resolveImport).mockResolvedValue({ imported: true, episodesMarked: 1 });
    render(<PendingResolution pending={pending} />, { wrapper });

    const card = screen.getByText("Les 100").closest("button");
    expect(card).not.toBeNull();
    await userEvent.click(card!);

    await waitFor(() =>
      expect(api.resolveImport).toHaveBeenCalledWith(
        expect.objectContaining({
          candidate: expect.objectContaining({ externalId: "the100" }),
          entry: expect.objectContaining({ title: "The 100", status: "IN_PROGRESS" }),
        }),
      ),
    );
    // L'entrée résolue disparaît ; l'écran indique que tout est rapproché.
    await waitFor(() => expect(screen.getByText(/Tout est rapproché/i)).toBeInTheDocument());
  });

  it("retire une entrée ignorée sans appeler l'API", async () => {
    render(<PendingResolution pending={pending} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Ignorer" }));
    expect(api.resolveImport).not.toHaveBeenCalled();
    expect(screen.getByText(/Tout est rapproché/i)).toBeInTheDocument();
  });
});
