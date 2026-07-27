import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { appendFileSync } from "fs";

// SES_ENDPOINT is only for pointing at a local mock/dev endpoint — unset in
// production, where the SDK talks to real AWS SES.
const client = new SESClient({
  region: process.env.AWS_REGION ?? "eu-west-2",
  ...(process.env.SES_ENDPOINT && { endpoint: process.env.SES_ENDPOINT }),
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(params: SendEmailParams): Promise<void> {
  const from = process.env.SES_FROM_ADDRESS;
  if (!from) {
    // Safe no-op default — matches the Sentry/DSN-unset pattern elsewhere in
    // this app. Local dev without SES configured shouldn't crash the flow.
    // Logs the full body (not just subject/recipient) so links like the
    // password-reset URL are still usable during local development.
    console.warn(
      `[email] SES_FROM_ADDRESS not set — would have sent "${params.subject}" to ${params.to}:\n${params.text}`,
    );
    // Test-only capture hook: never set outside e2e test runs. Lets tests
    // read the actual email body (e.g. a verification/reset link) without
    // a real inbox or scraping server logs.
    if (process.env.EMAIL_CAPTURE_FILE) {
      appendFileSync(process.env.EMAIL_CAPTURE_FILE, JSON.stringify(params) + "\n");
    }
    return;
  }

  await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.html, Charset: "UTF-8" },
          Text: { Data: params.text, Charset: "UTF-8" },
        },
      },
    }),
  );
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your CareScot password",
    text: `We received a request to reset your CareScot password.\n\nFollow this link to choose a new one (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't be changed.`,
    html: `
      <p>We received a request to reset your CareScot password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a> (valid for 1 hour).</p>
      <p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
    `.trim(),
  });
}

export async function sendSignupVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your CareScot account",
    text: `Thanks for signing up to CareScot.\n\nFollow this link to verify your email and activate your account (valid for 24 hours):\n${verifyUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <p>Thanks for signing up to CareScot.</p>
      <p><a href="${verifyUrl}">Click here to verify your email and activate your account</a> (valid for 24 hours).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `.trim(),
  });
}
