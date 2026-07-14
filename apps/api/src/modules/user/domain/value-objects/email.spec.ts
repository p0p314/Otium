import { describe, expect, it } from "vitest";
import { Email } from "./email";

describe("Email", () => {
  it("normalise (trim + minuscules)", () => {
    expect(Email.create("  User@Example.COM ").value).toBe("user@example.com");
  });

  it("est égal par valeur après normalisation", () => {
    expect(Email.create("a@b.com").equals(Email.create("A@B.COM"))).toBe(true);
  });

  it("rejette une adresse invalide", () => {
    expect(() => Email.create("pas-un-email")).toThrow();
    expect(() => Email.create("a@b")).toThrow();
  });
});
