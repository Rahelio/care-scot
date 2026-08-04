import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM field-level encryption for sensitive columns (niNumber,
// hourlyRate — see src/server/middleware/field-encryption.ts for where this
// is applied). GCM gives authenticated encryption: a tampered or truncated
// value fails to decrypt instead of silently returning garbage.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, the standard/recommended size for GCM

// Not cached: a base64 decode of 32 bytes is negligible cost next to the
// cipher operation itself, and re-reading process.env each call keeps this
// simple to test (no stale key across an env change within one process).
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — required to read/write encrypted fields.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).");
  }
  return key;
}

/**
 * Encrypts a plaintext string for storage. Output format is
 * `<iv>:<authTag>:<ciphertext>`, each segment base64-encoded — a fresh
 * random IV per call, so encrypting the same plaintext twice yields
 * different ciphertext (not deterministic/searchable by design).
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

/** Decrypts a value produced by encryptField(). Throws on a tampered/malformed value. */
export function decryptField(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted field value — expected `iv:authTag:ciphertext`.");
  }
  const [ivB64, authTagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
