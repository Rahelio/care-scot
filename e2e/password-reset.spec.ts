import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { getLatestEmailLink } from "./helpers/email";

test.use({ storageState: { cookies: [], origins: [] } });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const email = `e2e-reset-${Date.now()}@example.com`;
const originalPassword = "OriginalPassword123!";
const newPassword = "BrandNewPassword456!";
let organisationId: string;

test.beforeAll(async () => {
  const org = await prisma.organisation.create({
    data: { name: "E2E Password Reset Org", isActive: true },
  });
  organisationId = org.id;
  await prisma.user.create({
    data: {
      organisationId: org.id,
      email,
      passwordHash: await hash(originalPassword, 12),
      role: "ORG_ADMIN",
      isActive: true,
    },
  });
});

test.afterAll(async () => {
  // The reset flow's manual createAuditLog() call leaves a row referencing
  // this org — must clear it before the org itself can be deleted.
  await prisma.auditLog.deleteMany({ where: { organisationId } });
  await prisma.user.deleteMany({ where: { organisationId } });
  await prisma.organisation.delete({ where: { id: organisationId } });
  await prisma.$disconnect();
});

test("forgot password -> reset -> login with new password", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });

  const resetUrl = getLatestEmailLink(email);

  await page.goto(resetUrl);
  await page.fill('input[autocomplete="new-password"]', newPassword);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(newPassword);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Password updated")).toBeVisible({ timeout: 10_000 });

  // Old password should no longer work.
  await page.click('a:has-text("Go to sign in")');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', originalPassword);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  // New password should work.
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', newPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });
});

test("a reused reset token is rejected", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');
  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });

  const resetUrl = getLatestEmailLink(email);
  await page.goto(resetUrl);
  await page.fill('input[autocomplete="new-password"]', "FirstUse123!");
  await page.locator('input[autocomplete="new-password"]').nth(1).fill("FirstUse123!");
  await page.click('button[type="submit"]');
  await expect(page.getByText("Password updated")).toBeVisible({ timeout: 10_000 });

  // Reusing the same link should now fail.
  await page.goto(resetUrl);
  await page.fill('input[autocomplete="new-password"]', "SecondUse123!");
  await page.locator('input[autocomplete="new-password"]').nth(1).fill("SecondUse123!");
  await page.click('button[type="submit"]');
  await expect(page.getByText(/invalid or has expired/i)).toBeVisible({ timeout: 10_000 });
});
