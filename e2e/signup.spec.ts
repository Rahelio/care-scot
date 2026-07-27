import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

test.use({ storageState: { cookies: [], origins: [] } });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("full signup -> verify -> login flow", async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@example.com`;
  const password = "E2ESignupPassword123!";

  await page.goto("/signup");
  await page.fill('input[placeholder="Highland Home Care Ltd"]', "E2E Test Org");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10_000 });

  // Org + user should exist but be inactive until verified.
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.isActive).toBe(false);

  const verification = await prisma.verificationToken.findFirstOrThrow({
    where: { identifier: email },
  });

  await page.goto(
    `/verify-email?token=${verification.token}&email=${encodeURIComponent(email)}`,
  );
  // Must not auto-verify on load — requires the explicit button click.
  await expect(page.getByText("Verify your email")).toBeVisible();
  await page.click('button:has-text("Verify my email")');
  await expect(page.getByText("Account verified")).toBeVisible({ timeout: 10_000 });

  const activatedUser = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(activatedUser.isActive).toBe(true);

  const org = await prisma.organisation.findUniqueOrThrow({
    where: { id: activatedUser.organisationId },
  });
  expect(org.isActive).toBe(true);

  // New account can actually log in.
  await page.click('a:has-text("Go to sign in")');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });

  // Cleanup — this is a throwaway org+user, remove it.
  await prisma.organisationSubscription.deleteMany({ where: { organisationId: org.id } });
  await prisma.user.deleteMany({ where: { organisationId: org.id } });
  await prisma.organisation.delete({ where: { id: org.id } });
});

test("duplicate signup with an already-verified email is rejected", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('input[placeholder="Highland Home Care Ltd"]', "Duplicate Test Org");
  await page.fill('input[type="email"]', "sarah@highlandhomecare.co.uk");
  await page.fill('input[type="password"]', "SomePassword123!");
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("An account with this email already exists"),
  ).toBeVisible({ timeout: 10_000 });
});
