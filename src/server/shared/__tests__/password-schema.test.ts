import { describe, it, expect } from "vitest";
import { passwordSchema } from "../validators";

describe("passwordSchema", () => {
  it("accepts a 12+ character password with a letter and a digit", () => {
    expect(passwordSchema.safeParse("Password123!").success).toBe(true);
    expect(passwordSchema.safeParse("abcdefghij12").success).toBe(true);
  });

  it("rejects anything under 12 characters, even with a letter and digit", () => {
    expect(passwordSchema.safeParse("Abc12345678").success).toBe(false); // 11 chars
  });

  it("rejects a 12+ character password with no digit", () => {
    expect(passwordSchema.safeParse("abcdefghijkl").success).toBe(false);
  });

  it("rejects a 12+ character password with no letter", () => {
    expect(passwordSchema.safeParse("123456789012").success).toBe(false);
  });
});
