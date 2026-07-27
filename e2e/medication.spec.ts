import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("a category H medication error escalates and generates a CI notification", async ({ page }) => {
  const description = `E2E medication escalation test ${Date.now()}`;

  await page.goto("/medication/errors/new");

  // combobox 0 = Service User (optional), 1 = Error Type, 2 = NCC MERP Category
  await page.locator('button[role="combobox"]').nth(1).click();
  await page.locator('[role="option"]').first().click();

  await page.locator('button[role="combobox"]').nth(2).click();
  await page.getByRole("option", { name: /^H —/ }).click();

  await expect(page.getByText(/Care Inspectorate Notification Required/i)).toBeVisible();

  await page.fill('input[type="date"]', new Date().toISOString().split("T")[0]);
  await page.fill('textarea[placeholder*="Describe what happened"]', description);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/medication\/errors$/, { timeout: 10_000 });

  const error = await prisma.medicationError.findFirstOrThrow({ where: { description } });
  expect(error.nccMerpCategory).toBe("H");

  const ciNotification = await prisma.careInspectorateNotification.findFirst({
    where: { organisationId: error.organisationId, notificationType: "MEDICATION_ERROR_E_PLUS" },
    orderBy: { createdAt: "desc" },
  });
  expect(ciNotification).not.toBeNull();

  await prisma.careInspectorateNotification.deleteMany({ where: { id: ciNotification!.id } });
  await prisma.notification.deleteMany({ where: { entityId: error.id } });
  await prisma.medicationError.delete({ where: { id: error.id } });
});
