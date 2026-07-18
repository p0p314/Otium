import { buttonVariants, cn } from "@otium/ui";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddToHomeModal } from "./add-to-home-modal";
import { todayKey, useOnboardingStore } from "./onboarding-store";
import { useInstallContext } from "./use-install-context";

/**
 * Point d'entrée « Ajouter à l'écran d'accueil ». Rendu **uniquement** sur navigateur
 * mobile (téléphone), jamais en PWA installée ni sur desktop. Ouvre les instructions
 * automatiquement **une fois par jour**, et reste accessible à tout moment via le bouton
 * dans l'en-tête.
 */
export function InstallEntry() {
  const { isMobileWeb, platform } = useInstallContext();
  const [open, setOpen] = useState(false);
  const lastShown = useOnboardingStore((s) => s.a2hsLastShownDate);
  const markShown = useOnboardingStore((s) => s.markA2hsShown);
  const autoTried = useRef(false);

  useEffect(() => {
    if (autoTried.current || !isMobileWeb) return;
    autoTried.current = true;
    const today = todayKey();
    if (lastShown !== today) {
      setOpen(true);
      markShown(today);
    }
  }, [isMobileWeb, lastShown, markShown]);

  // Desktop / PWA installée : aucun accès ni visuel.
  if (!isMobileWeb) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Ajouter Otium à l'écran d'accueil"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2")}
      >
        <Download className="h-5 w-5" />
      </button>
      <AddToHomeModal open={open} platform={platform} onClose={() => setOpen(false)} />
    </>
  );
}
