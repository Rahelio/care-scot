import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";

const RECOVERY_CODE_COUNT = 8;

/** A single human-typeable recovery code, formatted XXXX-XXXX-XXXX for readability. */
function generateOneRecoveryCode(): string {
  const raw = randomBytes(6).toString("hex").toUpperCase(); // 12 hex chars
  return raw.match(/.{1,4}/g)!.join("-");
}

/** Generates a fresh batch of plaintext recovery codes — shown to the user exactly once. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, generateOneRecoveryCode);
}

/** Hashes a recovery code for storage — same treatment as User.passwordHash. */
export function hashRecoveryCode(code: string): Promise<string> {
  return hash(code, 12);
}

/** Checks a submitted code against a stored hash. */
export function verifyRecoveryCode(code: string, codeHash: string): Promise<boolean> {
  return compare(code, codeHash);
}
