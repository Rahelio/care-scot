import { describe, it, expect, beforeAll } from "vitest";
import { encryptField, decryptField } from "../encryption";

beforeAll(() => {
  // A fixed 32-byte test key so this suite doesn't depend on .env being
  // present in every environment (e.g. CI).
  process.env.ENCRYPTION_KEY = "UyJDwUHsBGcw62vaJOgRoiHR88G0lBhAqBwzSujn+9s=";
});

describe("encryptField / decryptField", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "AB123456C";
    expect(decryptField(encryptField(plaintext))).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decryptField(encryptField(""))).toBe("");
  });

  it("round-trips unicode content", () => {
    const plaintext = "Café — £42.50 — 名前";
    expect(decryptField(encryptField(plaintext))).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV, not deterministic)", () => {
    const a = encryptField("same value");
    const b = encryptField("same value");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("same value");
    expect(decryptField(b)).toBe("same value");
  });

  it("rejects a tampered ciphertext instead of returning garbage (GCM auth tag check)", () => {
    const encrypted = encryptField("sensitive value");
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tamperedByte = Buffer.from(ciphertext, "base64");
    tamperedByte[0] = tamperedByte[0] ^ 0xff;
    const tampered = [iv, authTag, tamperedByte.toString("base64")].join(":");
    expect(() => decryptField(tampered)).toThrow();
  });

  it("rejects a malformed stored value", () => {
    expect(() => decryptField("not-the-right-format")).toThrow(/Malformed/);
  });

  it("throws a clear error when ENCRYPTION_KEY is missing", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encryptField("x")).toThrow(/ENCRYPTION_KEY is not set/);
    } finally {
      process.env.ENCRYPTION_KEY = original;
    }
  });
});
