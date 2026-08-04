import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = "CareScot";

/** Generates a new base32 TOTP secret for a user enrolling in MFA. */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** Builds the otpauth:// URI an authenticator app's QR scanner reads. */
export function buildTotpUri(secret: string, accountEmail: string): string {
  return generateURI({ issuer: ISSUER, label: accountEmail, secret });
}

/**
 * Verifies a 6-digit code against a secret, allowing for the small clock
 * drift otplib's default window tolerates. Also rejects anything that isn't
 * a plausible 6-digit code before touching the crypto, so a malformed
 * client submission doesn't need a round-trip to find out.
 */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const result = await verify({ secret, token: code });
  return result.valid;
}
