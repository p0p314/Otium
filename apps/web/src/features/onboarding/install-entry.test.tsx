import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.fn();
vi.mock("./use-install-context", () => ({ useInstallContext: () => ctx() }));

import { InstallEntry } from "./install-entry";
import { todayKey, useOnboardingStore } from "./onboarding-store";

beforeEach(() => {
  useOnboardingStore.setState({ a2hsLastShownDate: null, importPromptPending: false });
});

describe("InstallEntry", () => {
  it("desktop / PWA installée : ne rend rien (ni bouton ni modale)", () => {
    ctx.mockReturnValue({ isMobileWeb: false, platform: "other" });
    const { container } = render(<InstallEntry />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("web mobile : ouvre l'invite automatiquement une fois par jour", () => {
    ctx.mockReturnValue({ isMobileWeb: true, platform: "ios" });
    render(<InstallEntry />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useOnboardingStore.getState().a2hsLastShownDate).toBe(todayKey());
  });

  it("web mobile : n'ouvre pas de nouveau si déjà affichée aujourd'hui, mais garde le bouton", () => {
    useOnboardingStore.setState({ a2hsLastShownDate: todayKey() });
    ctx.mockReturnValue({ isMobileWeb: true, platform: "android" });
    render(<InstallEntry />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /écran d'accueil/i })).toBeInTheDocument();
  });
});
