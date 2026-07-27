import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./env");
    validateEnv();

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // No-op if SENTRY_DSN is unset (e.g. local dev without a Sentry
      // project configured yet) — the SDK silently drops events instead
      // of throwing.
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
