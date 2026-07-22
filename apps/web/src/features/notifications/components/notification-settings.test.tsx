import type { NotificationPreferences } from "@otium/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushStatus } from "../api/use-notifications";

const enableMutate = vi.fn();
const disableMutate = vi.fn();
const updateMutate = vi.fn();
const reconcileMutate = vi.fn();

let status: { data?: PushStatus; isLoading: boolean };
let preferences: { data?: NotificationPreferences };

vi.mock("../api/use-notifications", () => ({
  usePushStatus: () => status,
  useNotificationPreferences: () => preferences,
  useEnableNotifications: () => ({ mutate: enableMutate, isPending: false, isError: false }),
  useDisableNotifications: () => ({ mutate: disableMutate, isPending: false }),
  useUpdateNotificationPreferences: () => ({ mutate: updateMutate, isPending: false }),
  useReconcilePushSubscription: () => ({ mutate: reconcileMutate }),
}));

import { NotificationSettings } from "./notification-settings";

const ALL_ON: NotificationPreferences = {
  newEpisodes: true,
  newSeasons: true,
  movieReminder: true,
  movieRelease: true,
};

describe("NotificationSettings", () => {
  beforeEach(() => {
    enableMutate.mockReset();
    disableMutate.mockReset();
    updateMutate.mockReset();
    reconcileMutate.mockReset();
    preferences = { data: ALL_ON };
  });

  it("explique l'absence de support (ex. iOS non installé)", () => {
    status = { data: { supported: false, permission: "denied", subscribed: false }, isLoading: false };
    render(<NotificationSettings />);
    expect(screen.getByText(/ne prend pas en charge/i)).toBeInTheDocument();
  });

  it("propose l'activation quand l'appareil n'est pas abonné", async () => {
    status = { data: { supported: true, permission: "default", subscribed: false }, isLoading: false };
    render(<NotificationSettings />);

    await userEvent.click(screen.getByRole("button", { name: /Activer les notifications/i }));
    expect(enableMutate).toHaveBeenCalledTimes(1);
  });

  it("permet la désactivation et bascule un canal quand l'appareil est abonné", async () => {
    status = { data: { supported: true, permission: "granted", subscribed: true }, isLoading: false };
    render(<NotificationSettings />);

    // Réconciliation silencieuse déclenchée à l'autorisation accordée.
    expect(reconcileMutate).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Désactiver sur cet appareil/i }));
    expect(disableMutate).toHaveBeenCalledTimes(1);

    // Basculer « Nouveaux épisodes » (actif → inactif) persiste la préférence inverse.
    await userEvent.click(screen.getByRole("switch", { name: "Nouveaux épisodes" }));
    expect(updateMutate).toHaveBeenCalledWith({ newEpisodes: false });
  });

  it("bloque explicitement quand l'autorisation est refusée", () => {
    status = { data: { supported: true, permission: "denied", subscribed: false }, isLoading: false };
    render(<NotificationSettings />);
    expect(screen.getByText(/bloquées pour ce site/i)).toBeInTheDocument();
  });
});
