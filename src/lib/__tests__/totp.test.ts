import { describe, it, expect } from "vitest";
import { generate } from "otplib";
import { generateTotpSecret, buildTotpUri, verifyTotpCode } from "../totp";

describe("generateTotpSecret", () => {
  it("generates a distinct base32 secret each call", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Z2-7]+$/); // base32 alphabet
  });
});

describe("buildTotpUri", () => {
  it("builds an otpauth:// URI carrying the issuer, account, and secret", () => {
    const secret = generateTotpSecret();
    const uri = buildTotpUri(secret, "sarah@highlandhomecare.co.uk");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("CareScot");
    expect(uri).toContain(encodeURIComponent(secret));
  });
});

describe("verifyTotpCode", () => {
  it("accepts a code generated for the same secret right now", async () => {
    const secret = generateTotpSecret();
    const code = await generate({ secret });
    expect(await verifyTotpCode(secret, code)).toBe(true);
  });

  it("rejects a code generated for a different secret", async () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const codeForB = await generate({ secret: secretB });
    expect(await verifyTotpCode(secretA, codeForB)).toBe(false);
  });

  it("rejects a malformed code without needing a real TOTP mismatch", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotpCode(secret, "12345")).toBe(false); // too short
    expect(await verifyTotpCode(secret, "abcdef")).toBe(false); // not digits
    expect(await verifyTotpCode(secret, "")).toBe(false);
  });
});
