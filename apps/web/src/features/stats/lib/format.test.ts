import { describe, expect, it } from "vitest";
import { formatLongDuration, formatMinutes } from "./format";

describe("formatMinutes", () => {
  it("formate heures et minutes", () => {
    expect(formatMinutes(155)).toBe("2 h 35");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(45)).toBe("45 min");
  });
});

describe("formatLongDuration", () => {
  it("décompose en mois / jours / heures", () => {
    expect(formatLongDuration(12600)).toBe("8 j 18 h"); // 210 h
    expect(formatLongDuration(100000)).toBe("2 mois 9 j 10 h"); // 1666 h
    expect(formatLongDuration(60)).toBe("1 h");
    expect(formatLongDuration(0)).toBe("0 h");
  });
});
