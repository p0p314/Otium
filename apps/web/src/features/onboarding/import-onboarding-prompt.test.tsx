import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

import { ImportOnboardingPrompt } from "./import-onboarding-prompt";
import { useOnboardingStore } from "./onboarding-store";

beforeEach(() => {
  navigate.mockReset();
  useOnboardingStore.setState({ importPromptPending: false, a2hsLastShownDate: null });
});

describe("ImportOnboardingPrompt", () => {
  it("reste caché tant qu'aucune invite n'est en attente", () => {
    render(<ImportOnboardingPrompt />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("« Importer maintenant » ouvre l'onglet import du profil et ferme l'invite", async () => {
    useOnboardingStore.setState({ importPromptPending: true });
    render(<ImportOnboardingPrompt />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Importer maintenant/i }));

    expect(navigate).toHaveBeenCalledWith({ to: "/profile", search: { tab: "import" } });
    expect(useOnboardingStore.getState().importPromptPending).toBe(false);
  });

  it("« Plus tard » ferme sans naviguer", async () => {
    useOnboardingStore.setState({ importPromptPending: true });
    render(<ImportOnboardingPrompt />);

    await userEvent.click(screen.getByRole("button", { name: /Plus tard/i }));

    expect(navigate).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().importPromptPending).toBe(false);
  });
});
