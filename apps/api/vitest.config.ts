import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC préserve les métadonnées de décorateurs (nécessaires à la DI NestJS),
// contrairement à esbuild — voir ADR/stratégie de tests.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    root: ".",
  },
  plugins: [swc.vite()],
});
