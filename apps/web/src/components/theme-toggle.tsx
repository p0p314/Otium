import { Button, useTheme } from "@otium/ui";
import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";

/** Durée de la propagation circulaire du nouveau thème (ms). */
const REVEAL_MS = 450;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

/**
 * Bascule clair/sombre. La nouvelle couleur se **propage en cercle depuis le bouton** grâce à
 * l'API View Transitions : on capture l'état, on applique le thème (flushSync pour un DOM à jour),
 * puis on anime le `clip-path` de la nouvelle capture. Repli gracieux si l'API est absente ou si
 * l'utilisateur préfère moins d'animations (bascule instantanée).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || reduced) {
      setTheme(next);
      return;
    }

    // Centre de la propagation = centre du bouton cliqué.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => flushSync(() => setTheme(next)));
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Activer le thème ${next === "dark" ? "sombre" : "clair"}`}
      onClick={onClick}
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
