import type { Config } from "tailwindcss";
import otiumPreset from "@otium/ui/tailwind-preset";

export default {
  presets: [otiumPreset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // Scanne le design system partagé (consommé en source).
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
