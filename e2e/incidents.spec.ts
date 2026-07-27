import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("a DEATH-type incident escalates and generates a CI notification", async ({ page }) => {
  const description = `E2E escalation test ${Date.now()}`;

  await page.goto("/incidents/new");

  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole("option", { name: "Death" }).click();

  await page.locator('button[role="combobox"]').nth(1).click();
  await page.getByRole("option", { name: "Critical" }).click();

  await expect(page.getByText(/CI Notification Required/i)).toBeVisible();

  await page.fill('textarea[placeholder*="Describe what happened"]', description);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/incidents\/[a-f0-9-]+/, { timeout: 10_000 });

  const incident = await prisma.incident.findFirstOrThrow({ where: { description } });
  expect(incident.severity).toBe("CRITICAL");
  expect(incident.incidentType).toBe("DEATH");

  const ciNotification = await prisma.careInspectorateNotification.findFirst({
    where: { organisationId: incident.organisationId, notificationType: "DEATH" },
    orderBy: { createdAt: "desc" },
  });
  expect(ciNotification).not.toBeNull();

  await prisma.careInspectorateNotification.deleteMany({ where: { incidentId: incident.id } });
  await prisma.notification.deleteMany({ where: { entityId: incident.id } });
  await prisma.incident.delete({ where: { id: incident.id } });
});
