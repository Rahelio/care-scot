import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptDataObject,
  decryptResultInPlace,
  ENCRYPTED_FIELDS_BY_MODEL,
} from "../field-encryption";
import { encryptField } from "@/lib/encryption";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "UyJDwUHsBGcw62vaJOgRoiHR88G0lBhAqBwzSujn+9s=";
});

describe("ENCRYPTED_FIELDS_BY_MODEL", () => {
  it("covers the schema fields commented as app-layer encrypted", () => {
    expect(ENCRYPTED_FIELDS_BY_MODEL.StaffMember).toEqual(
      expect.arrayContaining(["niNumber", "hourlyRate"]),
    );
    expect(ENCRYPTED_FIELDS_BY_MODEL.ServiceUser).toEqual(expect.arrayContaining(["niNumber"]));
  });
});

describe("encryptDataObject", () => {
  const fields = ["niNumber", "hourlyRate"];

  it("encrypts each listed string field, leaving other fields untouched", () => {
    const out = encryptDataObject(fields, {
      firstName: "Jane",
      niNumber: "AB123456C",
      hourlyRate: "12.50",
    });
    expect(out.firstName).toBe("Jane");
    expect(out.niNumber).not.toBe("AB123456C");
    expect(out.hourlyRate).not.toBe("12.50");
    // Ciphertext round-trips back via the same shared helper.
    expect(out.niNumber).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });

  it("leaves null and undefined fields unchanged (clearing / not-setting a field)", () => {
    const out = encryptDataObject(fields, { niNumber: null, hourlyRate: undefined });
    expect(out.niNumber).toBeNull();
    expect(out.hourlyRate).toBeUndefined();
  });

  it("is a no-op when the listed fields aren't present in data", () => {
    const out = encryptDataObject(fields, { firstName: "Jane" });
    expect(out).toEqual({ firstName: "Jane" });
  });
});

describe("decryptResultInPlace", () => {
  const fields = ["niNumber", "hourlyRate"];

  it("decrypts each listed field in place, leaving other fields untouched", () => {
    const row = {
      firstName: "Jane",
      niNumber: encryptField("AB123456C"),
      hourlyRate: encryptField("12.50"),
    };
    decryptResultInPlace(fields, row);
    expect(row.firstName).toBe("Jane");
    expect(row.niNumber).toBe("AB123456C");
    expect(row.hourlyRate).toBe("12.50");
  });

  it("leaves null fields as null", () => {
    const row = { niNumber: null };
    decryptResultInPlace(fields, row);
    expect(row.niNumber).toBeNull();
  });

  it("sets a malformed/undecryptable value to null instead of throwing (defensive, matches audit.ts's best-effort convention)", () => {
    const row = { niNumber: "not-valid-ciphertext" };
    expect(() => decryptResultInPlace(fields, row)).not.toThrow();
    expect(row.niNumber).toBeNull();
  });

  it("is a no-op when a listed field isn't present (e.g. excluded via `select`)", () => {
    const row = { firstName: "Jane" };
    decryptResultInPlace(fields, row);
    expect(row).toEqual({ firstName: "Jane" });
  });
});

describe("round trip via encryptDataObject + decryptResultInPlace", () => {
  it("recovers the original values end to end", () => {
    const fields = ["niNumber", "hourlyRate"];
    const written = encryptDataObject(fields, { niNumber: "CD654321A", hourlyRate: "15.25" });
    const row = { ...written };
    decryptResultInPlace(fields, row);
    expect(row.niNumber).toBe("CD654321A");
    expect(row.hourlyRate).toBe("15.25");
  });
});
