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
