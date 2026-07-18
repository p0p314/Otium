import { describe, expect, it } from "vitest";
import { resolveInstallContext } from "./use-install-context";

const phone = { standalone: false, coarsePointer: true, narrow: true, touch: true };

describe("resolveInstallContext", () => {
  it("iPhone (Safari, web) → web mobile, iOS", () => {
    const r = resolveInstallContext({
      ...phone,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari",
    });
    expect(r).toEqual({ isMobileWeb: true, platform: "ios" });
  });

  it("Android (Chrome) → web mobile, android", () => {
    const r = resolveInstallContext({
      ...phone,
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit Chrome Mobile",
    });
    expect(r).toEqual({ isMobileWeb: true, platform: "android" });
  });

  it("PWA installée (standalone) → aucun accès", () => {
    const r = resolveInstallContext({ ...phone, standalone: true, userAgent: "iPhone" });
    expect(r.isMobileWeb).toBe(false);
  });

  it("desktop (pointeur fin, grand écran) → aucun accès", () => {
    const r = resolveInstallContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome",
      standalone: false,
      coarsePointer: false,
      narrow: false,
      touch: false,
    });
    expect(r.isMobileWeb).toBe(false);
    expect(r.platform).toBe("other");
  });

  it("iPadOS (se présente en Mac + tactile) → iOS", () => {
    const r = resolveInstallContext({
      ...phone,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit Safari",
    });
    expect(r.platform).toBe("ios");
  });
});
