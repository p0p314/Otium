import { describe, expect, it } from "vitest";
import {
  computeProgress,
  consumptionDates,
  isProgressComplete,
  normalizeProgress,
  statusFromProgress,
} from "./reading-progress";

describe("normalizeProgress", () => {
  it("borne la valeur au total connu", () => {
    expect(normalizeProgress({ unit: "PAGES", value: 900, total: 300 })).toEqual({
      unit: "PAGES",
      value: 300,
      total: 300,
    });
  });

  it("refuse les valeurs négatives", () => {
    expect(normalizeProgress({ unit: "PAGES", value: -5, total: 300 }).value).toBe(0);
  });

  it("laisse passer la valeur quand le total est inconnu", () => {
    expect(normalizeProgress({ unit: "PAGES", value: 120, total: null })).toEqual({
      unit: "PAGES",
      value: 120,
      total: null,
    });
  });

  it("fixe le total implicite d'un pourcentage à 100", () => {
    expect(normalizeProgress({ unit: "PERCENT", value: 150, total: null })).toEqual({
      unit: "PERCENT",
      value: 100,
      total: 100,
    });
  });
});

describe("computeProgress", () => {
  it("calcule pourcentage et pages restantes", () => {
    expect(computeProgress({ unit: "PAGES", value: 75, total: 300 })).toMatchObject({
      percent: 25,
      remaining: 225,
    });
  });

  it("arrondit le pourcentage à l'entier", () => {
    expect(computeProgress({ unit: "PAGES", value: 1, total: 3 }).percent).toBe(33);
  });

  it("n'invente rien quand le total est inconnu", () => {
    expect(computeProgress({ unit: "PAGES", value: 40, total: null })).toMatchObject({
      percent: null,
      remaining: null,
    });
  });

  it("traite un pourcentage sans total explicite", () => {
    expect(computeProgress({ unit: "PERCENT", value: 60, total: null })).toMatchObject({
      percent: 60,
      remaining: 40,
    });
  });
});

describe("isProgressComplete", () => {
  it("est vrai à la dernière page", () => {
    expect(isProgressComplete({ unit: "PAGES", value: 300, total: 300 })).toBe(true);
  });

  it("est faux sans total connu", () => {
    expect(isProgressComplete({ unit: "PAGES", value: 999, total: null })).toBe(false);
  });
});

describe("statusFromProgress", () => {
  it("passe « à lire » en « en cours » dès la première page", () => {
    expect(statusFromProgress("PLANNED", { unit: "PAGES", value: 1, total: 300 })).toBe(
      "IN_PROGRESS",
    );
  });

  it("passe en « terminé » à la fin", () => {
    expect(statusFromProgress("IN_PROGRESS", { unit: "PAGES", value: 300, total: 300 })).toBe(
      "COMPLETED",
    );
  });

  it("ne réactive pas un média en pause ou abandonné", () => {
    const state = { unit: "PAGES", value: 50, total: 300 } as const;
    expect(statusFromProgress("PAUSED", state)).toBe("PAUSED");
    expect(statusFromProgress("DROPPED", state)).toBe("DROPPED");
  });

  it("rouvre un média terminé si la progression recule", () => {
    expect(statusFromProgress("COMPLETED", { unit: "PAGES", value: 120, total: 300 })).toBe(
      "IN_PROGRESS",
    );
  });

  it("laisse « à lire » tant que rien n'est lu", () => {
    expect(statusFromProgress("PLANNED", { unit: "PAGES", value: 0, total: 300 })).toBe("PLANNED");
  });
});

describe("consumptionDates", () => {
  const now = new Date("2026-07-20T10:00:00.000Z");

  it("date le début à la première mise en lecture", () => {
    expect(consumptionDates({ startedAt: null, finishedAt: null }, "IN_PROGRESS", now)).toEqual({
      startedAt: now,
      finishedAt: null,
    });
  });

  it("date la fin à l'achèvement et complète le début manquant", () => {
    expect(consumptionDates({ startedAt: null, finishedAt: null }, "COMPLETED", now)).toEqual({
      startedAt: now,
      finishedAt: now,
    });
  });

  it("ne réécrit jamais une date déjà connue", () => {
    const started = new Date("2026-01-01T00:00:00.000Z");
    expect(consumptionDates({ startedAt: started, finishedAt: null }, "COMPLETED", now)).toEqual({
      startedAt: started,
      finishedAt: now,
    });
  });

  it("conserve la date de fin d'un média rouvert puis reterminé", () => {
    const finished = new Date("2026-02-02T00:00:00.000Z");
    expect(
      consumptionDates({ startedAt: null, finishedAt: finished }, "IN_PROGRESS", now).finishedAt,
    ).toEqual(finished);
  });
});
