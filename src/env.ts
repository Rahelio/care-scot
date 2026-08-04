import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`"
    ),
  AUTH_URL: z.string().min(1, "AUTH_URL is required"),
  // Field-level encryption key for niNumber/hourlyRate (src/lib/encryption.ts)
  // — must decode from base64 to exactly 32 bytes (AES-256).
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required — generate one with `openssl rand -base64 32`")
    .refine(
      (v) => {
        try {
          return Buffer.from(v, "base64").length === 32;
        } catch {
          return false;
        }
      },
      "ENCRYPTION_KEY must be base64-encoded and decode to exactly 32 bytes — generate one with `openssl rand -base64 32`"
    ),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration — refusing to start:\n${issues}`
    );
  }
}
