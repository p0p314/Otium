import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { setupFrenchZodErrors } from "./i18n.js";
import { LoginInput, password } from "./auth.js";
import { Rating } from "./media.js";

/** Renvoie le premier message d'erreur produit par un parse échoué. */
function firstError(result: z.SafeParseReturnType<unknown, unknown>): string {
  return result.success ? "" : result.error.issues[0]?.message ?? "";
}

describe("frenchErrorMap", () => {
  beforeAll(() => setupFrenchZodErrors());
  afterAll(() => z.setErrorMap(z.defaultErrorMap));

  it("traduit les e-mails invalides", () => {
    expect(firstError(z.string().email().safeParse("nope"))).toBe("Adresse e-mail invalide.");
  });

  it("traduit un champ requis (type invalide/undefined)", () => {
    expect(firstError(z.string().safeParse(undefined))).toBe("Ce champ est requis.");
  });

  it("traduit une chaîne trop courte", () => {
    expect(firstError(password.safeParse("court"))).toBe("Au moins 8 caractères sont requis.");
  });

  it("traduit une valeur hors bornes numériques", () => {
    expect(firstError(Rating.safeParse(11))).toContain("inférieure ou égale à 10");
  });

  it("s'applique aux schémas partagés (LoginInput)", () => {
    const result = LoginInput.safeParse({ email: "x", password: "1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Adresse e-mail invalide.");
    }
  });
});
