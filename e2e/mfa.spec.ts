import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generate } from "otplib";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Uses emma@ (OFFICE_STAFF, not an admin) — isolates this spec's rate-limit
// bucket from other e2e specs' users, and doubles as coverage that a
// non-admin lands on the Security tab (not the admin-only org tabs) since
// Settings is otherwise gated by role.
const EMAIL = "emma@highlandhomecare.co.uk";
const PASSWORD = "Password123!";

test.use({ storageState: { cookies: [], origins: [] } });

async function clearRateLimit() {
  await prisma.loginAttempt.deleteMany({ where: { email: EMAIL } });
}

test.afterAll(async () => {
  // Leave the test user in a clean, MFA-disabled state for repeatability.
  const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
  await prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } });
  await prisma.$disconnect();
});

test("enroll in MFA via Settings, then sign in with a TOTP code, a wrong code, and a recovery code", async ({ page }) => {
  await clearRateLimit();

  // ── Log in (no MFA yet) and reach Settings ──────────────────────────────
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });

  await page.goto("/settings");
  // Non-admin: Security should be the only tab, shown by default.
  await expect(page.getByText("Two-Factor Authentication", { exact: true })).toBeVisible();
  await expect(page.getByText("Organisation", { exact: true })).not.toBeVisible();

  // ── Enroll ───────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Enable two-factor authentication" }).click();
  await expect(page.getByText("Can't scan? Enter this key manually:")).toBeVisible({ timeout: 10_000 });
  const secret = await page.locator("code.font-mono").innerText();
  expect(secret.length).toBeGreaterThan(10);

  const enrollCode = await generate({ secret });
  await page.getByLabel("6-digit code").fill(enrollCode);
  await page.getByRole("button", { name: "Confirm and enable" }).click();

  await expect(page.getByText("Save your recovery codes")).toBeVisible({ timeout: 10_000 });
  const recoveryCodes = await page.locator(".font-mono span").allInnerTexts();
  expect(recoveryCodes.length).toBe(8);
  await page.getByRole("button", { name: "I've saved these" }).click();

  await expect(
    page.getByText(/Enabled — sign-in requires a code/i)
  ).toBeVisible();

  // ── Sign out, sign back in with a valid TOTP code ───────────────────────
  // Clearing the session cookie directly rather than clicking the sidebar's
  // Sign out button — Next.js's dev-mode overlay portal sits in that exact
  // corner and intercepts pointer events there, which is a dev-tool
  // artifact, not something worth fighting in a test that only cares about
  // reaching a logged-out state.
  await page.context().clearCookies();
  await page.goto("/login");
  await clearRateLimit();

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Enter the 6-digit code from your authenticator app.")).toBeVisible({
    timeout: 10_000,
  });

  const loginCode = await generate({ secret });
  await page.getByLabel("Authenticator code").fill(loginCode);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });

  // ── Sign out, try a wrong code — must be rejected, must stay on the code step ──
  // Clearing the session cookie directly rather than clicking the sidebar's
  // Sign out button — Next.js's dev-mode overlay portal sits in that exact
  // corner and intercepts pointer events there, which is a dev-tool
  // artifact, not something worth fighting in a test that only cares about
  // reaching a logged-out state.
  await page.context().clearCookies();
  await page.goto("/login");
  await clearRateLimit();

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByLabel("Authenticator code")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Authenticator code").fill("000000");
  await page.click('button[type="submit"]');
  await expect(page.getByText("Incorrect code — please try again.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/login/);

  // ── Same session: switch to a recovery code and succeed ────────────────
  await page.getByRole("button", { name: "Use a recovery code instead" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });

  // ── Sign out, try to REUSE the same recovery code — must be rejected (single-use) ──
  // Clearing the session cookie directly rather than clicking the sidebar's
  // Sign out button — Next.js's dev-mode overlay portal sits in that exact
  // corner and intercepts pointer events there, which is a dev-tool
  // artifact, not something worth fighting in a test that only cares about
  // reaching a logged-out state.
  await page.context().clearCookies();
  await page.goto("/login");
  await clearRateLimit();

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.getByLabel("Authenticator code")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Use a recovery code instead" }).click();
  await page.getByLabel("Recovery code").fill(recoveryCodes[0]);
  await page.click('button[type="submit"]');
  await expect(page.getByText("That recovery code is invalid or already used.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page).toHaveURL(/\/login/);
});
