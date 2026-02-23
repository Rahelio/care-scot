import { describe, it, expect } from "vitest";
import { calculateBillingDuration } from "../billing-calculator";

function makeDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2025, 0, 1, h, m, 0);
}

describe("calculateBillingDuration", () => {
  it("returns exact 15 min for a 15-min visit", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:15"),
      15,
      15,
    );
    expect(result).toBe(15);
  });

  it("rounds 22 min up to 30 with 15-min increment", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:22"),
      15,
      15,
    );
    expect(result).toBe(30);
  });

  it("applies minimum when visit is shorter (8 min → 15)", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:08"),
      15,
      15,
    );
    expect(result).toBe(15);
  });

  it("handles exact 60 min", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("10:00"),
      15,
      15,
    );
    expect(result).toBe(60);
  });

  it("rounds 31 min up to 45 with 15-min increment", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:31"),
      15,
      15,
    );
    expect(result).toBe(45);
  });

  it("handles 30-min rounding increment", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:31"),
      15,
      30,
    );
    expect(result).toBe(60);
  });

  it("applies minimum of 15 then rounds to 30 increment", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:05"),
      15,
      30,
    );
    expect(result).toBe(30);
  });

  it("handles zero-length visit with minimum", () => {
    const result = calculateBillingDuration(
      makeDate("09:00"),
      makeDate("09:00"),
      15,
      15,
    );
    expect(result).toBe(15);
  });
});
