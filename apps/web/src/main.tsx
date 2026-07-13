import "@otium/ui/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Élément racine #root introuvable");

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
