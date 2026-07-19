/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// HMR derrière un proxy / port forwardé (conteneur, environnement distant) : le
// WebSocket HMR se connecte par défaut à l'origine de la page, ce qui échoue quand
// seul le HTTP est relayé. Ces variables permettent d'ajuster l'endpoint WS sans
// toucher au code (ex. VITE_HMR_PROTOCOL=wss, VITE_HMR_CLIENT_PORT=443).
const hmrHost = process.env.VITE_HMR_HOST;
const hmrProtocol = process.env.VITE_HMR_PROTOCOL;
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;
const hmrConfigured = Boolean(hmrHost || hmrProtocol || hmrClientPort);

export default defineConfig({
  // Identifiant de build : « buster » du cache persistant (invalidé à chaque déploiement,
  // évite de restaurer des données d'un ancien schéma).
  define: { __OTIUM_BUILD_ID__: JSON.stringify(String(Date.now())) },
  plugins: [
    react(),
    // PWA : app installable (écran d'accueil, plein écran) + service worker Workbox.
    // `injectRegister: "script"` génère un fichier d'enregistrement externe (pas de
    // script inline) pour rester compatible avec la CSP `script-src 'self'` de l'API.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      includeAssets: ["favicon.svg", "logo-mark.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Otium",
        short_name: "Otium",
        description: "Suivez tout ce que vous regardez, lisez et jouez.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#131019",
        theme_color: "#6d3bce",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell précachée ; repli SPA hors ligne (sauf routes API).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        // Le nouveau SW prend la main immédiatement (remplace un ancien SW en place).
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Pas de cache d'images TMDB par le service worker : un `CacheFirst` sur des
        // réponses cross-origin opaques pouvait figer des images cassées côté PWA. On
        // laisse le cache HTTP du navigateur gérer les affiches (déjà efficace).
      },
    }),
  ],
  server: {
    // Écoute sur toutes les interfaces (0.0.0.0) : indispensable pour un accès via
    // conteneur / port forwardé.
    host: true,
    port: 5173,
    strictPort: true,
    ...(hmrConfigured
      ? {
          hmr: {
            ...(hmrHost ? { host: hmrHost } : {}),
            ...(hmrProtocol ? { protocol: hmrProtocol } : {}),
            ...(hmrClientPort ? { clientPort: hmrClientPort } : {}),
          },
        }
      : {}),
  },
  build: {
    // Éco-conception : découpage des gros vendors pour un cache long terme.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]react(-dom)?[\\/]|[\\/]scheduler[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@tanstack")) return "tanstack";
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
