import "@otium/ui/styles.css";
import { setupFrenchZodErrors } from "@otium/types";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers";

// Messages de validation Zod en français (formulaires React Hook Form).
setupFrenchZodErrors();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Élément racine #root introuvable");

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);

// Retire l'écran de démarrage une fois le premier rendu peint (fondu enchaîné).
const splash = document.getElementById("app-splash");
if (splash) {
  const removeSplash = () => splash.remove();
  requestAnimationFrame(() => {
    splash.style.opacity = "0";
    splash.addEventListener("transitionend", removeSplash, { once: true });
  });
  // Filet de sécurité **hors** de `requestAnimationFrame` : dans un onglet en arrière-plan,
  // la callback d'animation n'est jamais appelée. Le splash resterait alors affiché et —
  // parce qu'il couvre l'écran avec le z-index maximal — **avalerait tous les clics**.
  // Le placer à l'intérieur du rAF le rendait inopérant dans le seul cas qu'il devait couvrir.
  // 1,5 s : bien au-delà du fondu de 0,35 s, donc invisible en fonctionnement normal.
  window.setTimeout(removeSplash, 1500);
}
