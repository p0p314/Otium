import { describe, expect, it } from "vitest";
import { err, isErr, isOk, mapResult, ok, unwrap } from "./result.js";

describe("Result", () => {
  it("représente un succès", () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(unwrap(r)).toBe(42);
  });

  it("représente un échec", () => {
    const r = err(new Error("boom"));
    expect(isErr(r)).toBe(true);
    expect(() => unwrap(r)).toThrow("boom");
  });

  it("mappe uniquement en cas de succès", () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual(ok(6));
    const failure = err("nope");
    expect(mapResult(failure, (n: number) => n * 3)).toEqual(failure);
  });
});
