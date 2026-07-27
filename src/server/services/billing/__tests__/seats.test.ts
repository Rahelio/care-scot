import { describe, it, expect } from "vitest";
import {
  computeEntitlement,
  computeRequiredPaidQuantity,
  FREE_SEATS_BASELINE,
  SEATS_PER_BLOCK,
} from "../seats";

describe("computeEntitlement", () => {
  it("gives the free baseline when there's no subscription at all", () => {
    expect(computeEntitlement(null)).toBe(FREE_SEATS_BASELINE);
  });

  it("gives the free baseline when status is null (never subscribed)", () => {
    expect(computeEntitlement({ status: null, quantity: 0 })).toBe(FREE_SEATS_BASELINE);
  });

  it("adds paid seats on top of the baseline when active", () => {
    expect(computeEntitlement({ status: "active", quantity: 1 })).toBe(
      FREE_SEATS_BASELINE + SEATS_PER_BLOCK,
    );
    expect(computeEntitlement({ status: "active", quantity: 3 })).toBe(
      FREE_SEATS_BASELINE + 3 * SEATS_PER_BLOCK,
    );
  });

  it("treats trialing the same as active", () => {
    expect(computeEntitlement({ status: "trialing", quantity: 2 })).toBe(
      FREE_SEATS_BASELINE + 2 * SEATS_PER_BLOCK,
    );
  });

  // The core "never lock out existing staff" guarantee: a lapsed
  // subscription still gets at least the free baseline, not zero.
  for (const status of ["past_due", "canceled", "unpaid", "incomplete_expired"]) {
    it(`falls back to just the free baseline when status is '${status}', even with a nonzero quantity on record`, () => {
      expect(computeEntitlement({ status, quantity: 5 })).toBe(FREE_SEATS_BASELINE);
    });
  }
});

describe("computeRequiredPaidQuantity", () => {
  it("needs zero paid blocks at or under the free baseline", () => {
    expect(computeRequiredPaidQuantity(0)).toBe(0);
    expect(computeRequiredPaidQuantity(3)).toBe(0);
    expect(computeRequiredPaidQuantity(FREE_SEATS_BASELINE)).toBe(0);
  });

  it("rounds up to a full block for any overage", () => {
    expect(computeRequiredPaidQuantity(FREE_SEATS_BASELINE + 1)).toBe(1);
    expect(computeRequiredPaidQuantity(FREE_SEATS_BASELINE + SEATS_PER_BLOCK)).toBe(1);
    expect(computeRequiredPaidQuantity(FREE_SEATS_BASELINE + SEATS_PER_BLOCK + 1)).toBe(2);
  });

  it("scales linearly for larger overages", () => {
    expect(computeRequiredPaidQuantity(FREE_SEATS_BASELINE + 4 * SEATS_PER_BLOCK)).toBe(4);
  });
});
