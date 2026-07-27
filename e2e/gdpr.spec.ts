import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("export and erase a client's data", async ({ page }) => {
  const lastName = `E2EGdpr${Date.now()}`;

  // Create a throwaway client to export/erase.
  await page.goto("/clients/new");
  await page.getByLabel("First Name", { exact: false }).fill("Test");
  await page.getByLabel("Last Name", { exact: false }).fill(lastName);
  await page.getByLabel("Date of Birth", { exact: false }).fill("1950-01-01");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/, { timeout: 10_000 });

  const clientId = page.url().split("/clients/")[1].split("/")[0];
  const fullName = `Test ${lastName}`;

  // Export
  await page.click('button:has-text("Data")');
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10_000 }),
    page.getByRole("menuitem", { name: "Export Data (GDPR)" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain(clientId);

  // Reload for a clean DOM/component state before the next dropdown
  // interaction — more reliable than Escape, which can leave Radix's
  // dropdown trigger in a state where a second click doesn't reopen it.
  await page.reload();

  // Erase — wrong confirmation name should keep the button disabled
  await page.click('button:has-text("Data")');
  await page.getByRole("menuitem", { name: /Erase Data \(GDPR\)/ }).click();
  await page.fill("#confirm-name", "wrong name");
  await expect(page.getByRole("button", { name: "Erase Data" })).toBeDisabled();

  await page.fill("#confirm-name", "");
  await page.fill("#confirm-name", fullName);
  await expect(page.getByRole("button", { name: "Erase Data" })).toBeEnabled();
  await page.click('button:has-text("Erase Data")');

  await expect(page.getByRole("heading", { name: "Erased Data Subject" })).toBeVisible({
    timeout: 10_000,
  });

  const erased = await prisma.serviceUser.findUniqueOrThrow({ where: { id: clientId } });
  expect(erased.firstName).toBe("Erased");
  expect(erased.lastName).toBe("Data Subject");
  expect(erased.addressLine1).toBeNull();

  await prisma.auditLog.deleteMany({ where: { entityType: "ServiceUser", entityId: clientId } });
  await prisma.serviceUser.delete({ where: { id: clientId } });
});
