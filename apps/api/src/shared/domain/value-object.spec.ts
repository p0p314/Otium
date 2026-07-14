import { describe, expect, it } from "vitest";
import { ValueObject } from "./value-object";

class Money extends ValueObject<{ amount: number; currency: string }> {
  static of(amount: number, currency: string): Money {
    return new Money({ amount, currency });
  }
}

describe("ValueObject", () => {
  it("est égal par valeur", () => {
    expect(Money.of(10, "EUR").equals(Money.of(10, "EUR"))).toBe(true);
  });

  it("diffère si une propriété change", () => {
    expect(Money.of(10, "EUR").equals(Money.of(10, "USD"))).toBe(false);
  });

  it("est immuable (gelé)", () => {
    const m = Money.of(5, "EUR") as unknown as { props: { amount: number } };
    expect(() => {
      m.props.amount = 99;
    }).toThrow();
  });
});
