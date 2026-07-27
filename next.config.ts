import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Next.js App Router injects inline hydration/streaming <script> tags and
// Radix UI (used throughout the component library) sets inline positioning
// `style` attributes on portalled content (dropdowns, dialogs, tooltips) —
// both require 'unsafe-inline' without a per-request nonce wired through
// proxy.ts. A stricter nonce-based CSP is worth revisiting later, but this
// is the practical baseline that doesn't break the existing UI.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // https://challenges.cloudflare.com is Cloudflare Turnstile (signup CAPTCHA widget)
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Source-map upload is silently skipped when SENTRY_AUTH_TOKEN is unset —
  // fine for local dev, needed for readable stack traces in production.
  silent: true,
});
