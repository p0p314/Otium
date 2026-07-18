import { useEffect, useState } from "react";

export type InstallPlatform = "ios" | "android" | "other";

export interface InstallContext {
  /** Vrai uniquement sur **navigateur mobile** (téléphone) hors PWA installée. */
  readonly isMobileWeb: boolean;
  readonly platform: InstallPlatform;
}

/**
 * Détermine le contexte d'installation à partir de signaux bruts (**pur**, testable).
 * « Web mobile » = pointeur grossier + petit écran, et **pas** en mode application (PWA).
 */
export function resolveInstallContext(env: {
  userAgent: string;
  standalone: boolean;
  coarsePointer: boolean;
  narrow: boolean;
  touch: boolean;
}): InstallContext {
  const ua = env.userAgent.toLowerCase();
  // iPadOS se présente comme un Mac : on le rattrape via la présence du tactile.
  const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes("macintosh") && env.touch);
  const isAndroid = ua.includes("android");
  const isPhone = env.coarsePointer && env.narrow;
  return {
    isMobileWeb: isPhone && !env.standalone,
    platform: isIOS ? "ios" : isAndroid ? "android" : "other",
  };
}

function read(): InstallContext {
  if (typeof window === "undefined") return { isMobileWeb: false, platform: "other" };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return resolveInstallContext({
    userAgent: window.navigator.userAgent,
    standalone,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    narrow: window.matchMedia("(max-width: 767px)").matches,
    touch: "ontouchend" in window,
  });
}

/** Contexte d'installation réactif (recalculé si la largeur / le mode d'affichage change). */
export function useInstallContext(): InstallContext {
  const [ctx, setCtx] = useState<InstallContext>(read);

  useEffect(() => {
    const queries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(max-width: 767px)"),
    ];
    const update = (): void => setCtx(read());
    queries.forEach((q) => q.addEventListener("change", update));
    update();
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);

  return ctx;
}
