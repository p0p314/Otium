/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import type { NotificationPayload } from "@otium/types";

/**
 * Service worker **unique** de l'application (ADR-0020). Il assure à la fois le précache
 * de l'app shell (comme auparavant, via Workbox `injectManifest`) **et** la réception des
 * notifications Push — aucun second worker n'est enregistré, pour éviter tout conflit de
 * portée. Compilé par `vite-plugin-pwa` (stratégie `injectManifest`).
 */

// Le typage DOM par défaut ne décrit pas le contexte worker : on l'affine ici.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// --- App shell (précache + repli SPA hors ligne) ---
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Toute navigation retombe sur l'app shell — sauf les routes API (réponses JSON).
const appShell = createHandlerBoundToURL("/index.html");
registerRoute(new NavigationRoute(appShell, { denylist: [/^\/api/] }));

// Le nouveau worker prend la main immédiatement (remplace un ancien en place).
self.addEventListener("install", () => {
  void self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Notifications Push ---

/** Icône par défaut si la charge utile n'en fournit pas. */
const DEFAULT_ICON = "/icons/icon-192.png";

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: NotificationPayload;
  try {
    payload = event.data.json() as NotificationPayload;
  } catch {
    // Charge utile illisible : on n'affiche rien plutôt qu'une notification vide.
    return;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: DEFAULT_ICON,
    badge: DEFAULT_ICON,
    // Regroupe les notifications d'un même contenu : la plus récente remplace la précédente.
    tag: `${payload.type}:${payload.contentId}`,
    data: { url: payload.url },
    ...(payload.image ? { image: payload.image } : {}),
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const targetUrl = data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Réutilise un onglet ouvert de l'application plutôt que d'en ouvrir un nouveau.
      for (const client of clients) {
        await client.focus();
        await client.navigate(targetUrl);
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
