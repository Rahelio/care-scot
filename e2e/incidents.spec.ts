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

test("a SAFEGUARDING incident links to a safeguarding concern without re-entering its details", async ({ page }) => {
  const description = `E2E safeguarding-link test ${Date.now()}`;

  await page.goto("/incidents/new");

  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole("option", { name: "Safeguarding" }).click();

  await page.locator('button[role="combobox"]').nth(1).click();
  await page.getByRole("option", { name: "High" }).click();

  // Pick a seeded demo client so the concern-creation step below can use the
  // read-only "Service user" summary (defaultServiceUserId flows through
  // from the incident) instead of needing its own client picker interaction.
  await page.locator('button[role="combobox"]').nth(2).click();
  await page.getByRole("option", { name: "Agnes Robertson" }).click();

  await page.fill('textarea[placeholder*="Describe what happened"]', description);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/incidents\/[a-f0-9-]+/, { timeout: 10_000 });

  const incident = await prisma.incident.findFirstOrThrow({ where: { description } });
  expect(incident.incidentType).toBe("SAFEGUARDING");

  // No linked concern yet — the incident page should offer to create one
  // rather than silently having none.
  await expect(page.getByText("Incident Details")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/No safeguarding concern has been raised/i)).toBeVisible();

  await page.getByRole("link", { name: "Create safeguarding concern" }).click();
  await expect(page).toHaveURL(/\/incidents\/safeguarding\/new\?/);

  // Description carried over from the incident — proof the link avoids
  // re-keying, not just that a bare form loaded.
  await expect(page.locator("textarea").first()).toHaveValue(description);

  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole("option", { name: "Neglect", exact: true }).click();

  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/incidents\/safeguarding\/[a-f0-9-]+/, { timeout: 10_000 });

  const concern = await prisma.safeguardingConcern.findFirstOrThrow({
    where: { description },
  });
  expect(concern.incidentId).toBe(incident.id);

  // Back on the incident, the concern should now show up as linked instead
  // of the "create one" prompt.
  await page.goto(`/incidents/${incident.id}`);
  await expect(page.getByText("Incident Details")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/No safeguarding concern has been raised/i)).not.toBeVisible();
  await expect(page.getByText("Neglect")).toBeVisible();

  await prisma.safeguardingConcern.deleteMany({ where: { incidentId: incident.id } });
  await prisma.notification.deleteMany({ where: { entityId: { in: [incident.id, concern.id] } } });
  await prisma.incident.delete({ where: { id: incident.id } });
});
