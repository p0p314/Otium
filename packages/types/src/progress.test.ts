import { describe, expect, it } from "vitest";
import { MediaProgress, ProgressUnit, UpdateProgressInput } from "./progress.js";

describe("ProgressUnit", () => {
  it("couvre les unités actives", () => {
    expect(ProgressUnit.options).toEqual(["PAGES", "PERCENT"]);
  });
});

describe("UpdateProgressInput", () => {
  it("accepte une saisie en pages sans total", () => {
    expect(UpdateProgressInput.parse({ unit: "PAGES", value: 120 })).toEqual({
      unit: "PAGES",
      value: 120,
    });
  });

  it("accepte un total explicite (livre non paginé côté catalogue)", () => {
    expect(UpdateProgressInput.parse({ unit: "PAGES", value: 10, total: 320 }).total).toBe(320);
  });

  it("rejette les valeurs négatives ou non entières", () => {
    expect(UpdateProgressInput.safeParse({ unit: "PAGES", value: -1 }).success).toBe(false);
    expect(UpdateProgressInput.safeParse({ unit: "PAGES", value: 1.5 }).success).toBe(false);
  });

  it("rejette une unité inconnue", () => {
    expect(UpdateProgressInput.safeParse({ unit: "CHAPTERS", value: 3 }).success).toBe(false);
  });
});

describe("MediaProgress", () => {
  it("admet des valeurs dérivées nulles quand le total est inconnu", () => {
    const parsed = MediaProgress.safeParse({
      unit: "PAGES",
      value: 40,
      total: null,
      percent: null,
      remaining: null,
      updatedAt: "2026-07-20T10:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejette un pourcentage hors bornes", () => {
    expect(
      MediaProgress.safeParse({
        unit: "PERCENT",
        value: 60,
        total: 100,
        percent: 140,
        remaining: 40,
        updatedAt: "2026-07-20T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
