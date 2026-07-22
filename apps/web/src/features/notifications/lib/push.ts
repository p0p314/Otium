import type { PushSubscriptionInput } from "@otium/types";

/**
 * Aides navigateur pour le Web Push (ADR-0020). Isolées de React : aucun composant ne
 * manipule directement l'API `PushManager` (CLAUDE.md §4). Compatibles Android (Chrome,
 * Edge…) et iOS 16.4+ (Safari, PWA installée).
 */

/** Le Web Push est-il disponible dans ce navigateur ? */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** État d'autorisation courant (`default` = pas encore demandé). */
export function notificationPermission(): NotificationPermission {
  return isPushSupported() ? Notification.permission : "denied";
}

/** Demande l'autorisation à l'utilisateur ; renvoie la décision. */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.requestPermission();
}

/** Convertit une clé VAPID base64url en `Uint8Array` (format attendu par `subscribe`). */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Alloue explicitement un `ArrayBuffer` (et non `ArrayBufferLike`) pour satisfaire le
  // type `BufferSource` attendu par `pushManager.subscribe`.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** Sérialise un abonnement navigateur au format attendu par l'API. */
function toInput(subscription: PushSubscription): PushSubscriptionInput {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    ...(typeof json.expirationTime === "number" ? { expirationTime: json.expirationTime } : {}),
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    userAgent: navigator.userAgent.slice(0, 512),
  };
}

/** Abonnement Push existant de cet appareil, ou `null`. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Inscrit l'appareil aux notifications (réutilise l'abonnement existant s'il y en a un) et
 * renvoie les données à transmettre au serveur.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionInput> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));
  return toInput(subscription);
}

/** Désinscrit l'appareil côté navigateur ; renvoie l'endpoint retiré (pour purge serveur). */
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getExistingSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
