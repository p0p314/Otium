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
  requestAnimationFrame(() => {
    splash.style.opacity = "0";
    splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    // Filet de sécurité si `transitionend` ne se déclenche pas (onglet en arrière-plan…).
    window.setTimeout(() => splash.remove(), 800);
  });
}
