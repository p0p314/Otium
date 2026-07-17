import { buttonVariants, cn } from "@otium/ui";
import { Link } from "@tanstack/react-router";
import { BarChart3, Settings, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const ITEM =
  "flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted";

/**
 * Bouton profil déroulant : ouvre un menu (Réglages → page profil, Statistiques → /stats).
 * Accessible (aria-haspopup / aria-expanded, `role="menu"`), se ferme au clic extérieur,
 * avec Échap, ou après navigation. Fonctionne à l'identique sur mobile (en-tête visible).
 */
export function ProfileMenu({ displayName }: { displayName?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Menu du profil"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
      >
        <UserRound className="h-5 w-5" />
        {displayName ? <span className="hidden lg:inline">{displayName}</span> : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border bg-background py-1 shadow-lg"
        >
          <Link role="menuitem" to="/profile" className={ITEM} onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Réglages
          </Link>
          <Link role="menuitem" to="/stats" className={ITEM} onClick={() => setOpen(false)}>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Statistiques
          </Link>
        </div>
      ) : null}
    </div>
  );
}
