import type { UpdateNotificationPreferencesInput } from "@otium/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useAuth } from "../../auth/api/use-auth";
import {
  getExistingSubscription,
  isPushSupported,
  notificationPermission,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push";

const PREFERENCES_KEY = ["notification-preferences"] as const;
const STATUS_KEY = ["push-status"] as const;

/** État Push de **cet appareil** : support navigateur, autorisation, abonnement actif. */
export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}

export function usePushStatus() {
  return useQuery<PushStatus>({
    queryKey: STATUS_KEY,
    queryFn: async () => {
      const supported = isPushSupported();
      if (!supported) return { supported, permission: "denied", subscribed: false };
      const subscription = await getExistingSubscription();
      return {
        supported,
        permission: notificationPermission(),
        subscribed: subscription !== null,
      };
    },
    // État local à l'appareil : pas de rafraîchissement en fond ni de mise en cache longue.
    staleTime: 0,
    gcTime: 0,
  });
}

/** Préférences de notification (canaux). Serveur = source de vérité (TanStack Query). */
export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: () => api.getNotificationPreferences(),
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      api.updateNotificationPreferences(input),
    onSuccess: (prefs) => queryClient.setQueryData(PREFERENCES_KEY, prefs),
  });
}

/**
 * Active les notifications sur cet appareil : demande l'autorisation, s'inscrit auprès du
 * navigateur (clé VAPID du serveur) puis enregistre l'abonnement. Idempotent — réutilise
 * un abonnement existant.
 */
export function useEnableNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const permission = await requestPermission();
      if (permission !== "granted") {
        throw new Error("PERMISSION_DENIED");
      }
      const { publicKey } = await api.getVapidPublicKey();
      const subscription = await subscribeToPush(publicKey);
      await api.savePushSubscription(subscription);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

/** Désactive les notifications sur cet appareil (désinscription navigateur + serveur). */
export function useDisableNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await api.deletePushSubscription({ endpoint });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

/**
 * Réconcilie l'abonnement au démarrage : si l'autorisation est accordée, le navigateur a
 * pu **régénérer** son abonnement (rotation, réinstallation). On réenregistre alors
 * l'abonnement courant côté serveur, silencieusement — la « réinscription si l'abonnement
 * expire » attendue. Best-effort : n'affiche jamais d'erreur.
 */
export function useReconcilePushSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isPushSupported() || notificationPermission() !== "granted") return;
      const { publicKey } = await api.getVapidPublicKey();
      const subscription = await subscribeToPush(publicKey);
      await api.savePushSubscription(subscription);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}
