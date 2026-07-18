import { beforeEach, describe, expect, it } from "vitest";
import { todayKey, useOnboardingStore } from "./onboarding-store";

beforeEach(() => {
  useOnboardingStore.setState({ a2hsLastShownDate: null, importPromptPending: false });
});

describe("onboarding store", () => {
  it("todayKey renvoie la date au format YYYY-MM-DD", () => {
    expect(todayKey(new Date("2026-07-17T10:30:00.000Z"))).toBe("2026-07-17");
  });

  it("markA2hsShown enregistre la date d'affichage", () => {
    useOnboardingStore.getState().markA2hsShown("2026-07-17");
    expect(useOnboardingStore.getState().a2hsLastShownDate).toBe("2026-07-17");
  });

  it("ouvre puis ferme l'invite d'import", () => {
    useOnboardingStore.getState().openImportPrompt();
    expect(useOnboardingStore.getState().importPromptPending).toBe(true);
    useOnboardingStore.getState().dismissImportPrompt();
    expect(useOnboardingStore.getState().importPromptPending).toBe(false);
  });
});
