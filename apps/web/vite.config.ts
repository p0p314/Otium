/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  plugins: [react()],
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
