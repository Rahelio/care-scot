import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode } from "../recovery-codes";

describe("generateRecoveryCodes", () => {
  it("generates 8 codes by default, each unique and XXXX-XXXX-XXXX formatted", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    }
  });

  it("honors a custom count", () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3);
  });
});

describe("hashRecoveryCode / verifyRecoveryCode", () => {
  it("round-trips: a code verifies against its own hash", async () => {
    const [code] = generateRecoveryCodes(1);
    const codeHash = await hashRecoveryCode(code);
    expect(codeHash).not.toBe(code);
    expect(await verifyRecoveryCode(code, codeHash)).toBe(true);
  });

  it("rejects a different code against that hash", async () => {
    const [codeA, codeB] = generateRecoveryCodes(2);
    const hashA = await hashRecoveryCode(codeA);
    expect(await verifyRecoveryCode(codeB, hashA)).toBe(false);
  });
});
