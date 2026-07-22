import type { NotificationPreferences } from "@otium/types";
import { Button, cn } from "@otium/ui";
import { Bell, BellOff } from "lucide-react";
import { useEffect } from "react";
import {
  useDisableNotifications,
  useEnableNotifications,
  useNotificationPreferences,
  usePushStatus,
  useReconcilePushSubscription,
  useUpdateNotificationPreferences,
} from "../api/use-notifications";

/** Libellés des canaux de notification (source unique). */
const CHANNELS: ReadonlyArray<[keyof NotificationPreferences, string, string]> = [
  ["newEpisodes", "Nouveaux épisodes", "Un épisode d'une série suivie est disponible."],
  ["newSeasons", "Nouvelles saisons", "Une nouvelle saison d'une série suivie commence."],
  ["movieReminder", "Rappel avant sortie", "Sept jours avant la sortie d'un film à voir."],
  ["movieRelease", "Sortie des films", "Le jour de la sortie d'un film à voir."],
];

/**
 * Paramètres de notification Push (ADR-0020). Gère l'activation par appareil (autorisation,
 * inscription) et les préférences par canal (compte). Aucune logique métier ni appel API
 * direct : tout passe par les hooks (CLAUDE.md §4). Mobile-first, accessible.
 */
export function NotificationSettings() {
  const status = usePushStatus();
  const preferences = useNotificationPreferences();
  const enable = useEnableNotifications();
  const disable = useDisableNotifications();
  const reconcile = useReconcilePushSubscription();

  // Réconciliation silencieuse au montage : réenregistre l'abonnement si le navigateur
  // l'a régénéré (autorisation déjà accordée). Exécutée une seule fois.
  const reconcileMutate = reconcile.mutate;
  const permission = status.data?.permission;
  useEffect(() => {
    if (permission === "granted") reconcileMutate();
  }, [permission, reconcileMutate]);

  if (status.isLoading) {
    return <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!status.data?.supported) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre navigateur ne prend pas en charge les notifications Push. Sur iPhone,
          installez d'abord Otium sur l'écran d'accueil (Partager → « Sur l'écran d'accueil »).
        </p>
      </div>
    );
  }

  const { permission: perm, subscribed } = status.data;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Soyez prévenu dès qu'un contenu « à voir » est disponible.
          </p>
        </div>
        {subscribed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Bell className="size-3.5" /> Activées
          </span>
        ) : null}
      </div>

      {perm === "denied" ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Les notifications sont bloquées pour ce site. Réautorisez-les dans les réglages de
          votre navigateur pour les recevoir.
        </p>
      ) : subscribed ? (
        <Button
          variant="outline"
          onClick={() => disable.mutate()}
          disabled={disable.isPending}
        >
          <BellOff className="size-4" />
          {disable.isPending ? "Désactivation…" : "Désactiver sur cet appareil"}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button onClick={() => enable.mutate()} disabled={enable.isPending}>
            <Bell className="size-4" />
            {enable.isPending ? "Activation…" : "Activer les notifications"}
          </Button>
          {enable.isError ? (
            <p className="text-sm text-destructive">
              {enable.error instanceof Error && enable.error.message === "PERMISSION_DENIED"
                ? "Autorisation refusée. Vous pouvez la réactiver dans les réglages du navigateur."
                : "Impossible d'activer les notifications pour le moment."}
            </p>
          ) : null}
        </div>
      )}

      {/* Préférences par canal — réglages de compte, appliqués à tous les appareils. */}
      <fieldset className="space-y-1 border-t pt-4" disabled={!preferences.data}>
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Types de notifications
        </legend>
        {CHANNELS.map(([key, label, description]) => (
          <ChannelToggle
            key={key}
            channel={key}
            label={label}
            description={description}
            checked={preferences.data?.[key] ?? true}
          />
        ))}
      </fieldset>
    </div>
  );
}

/** Interrupteur d'un canal ; persiste immédiatement la préférence (optimiste côté cache). */
function ChannelToggle({
  channel,
  label,
  description,
  checked,
}: {
  channel: keyof NotificationPreferences;
  label: string;
  description: string;
  checked: boolean;
}) {
  const update = useUpdateNotificationPreferences();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => update.mutate({ [channel]: !checked })}
        disabled={update.isPending}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
