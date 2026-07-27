import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("create a new client", async ({ page }) => {
  const lastName = `E2EClient${Date.now()}`;

  await page.goto("/clients/new");
  await page.getByLabel("First Name", { exact: false }).fill("Test");
  await page.getByLabel("Last Name", { exact: false }).fill(lastName);
  await page.getByLabel("Date of Birth", { exact: false }).fill("1950-01-01");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: new RegExp(lastName) })).toBeVisible();

  const created = await prisma.serviceUser.findFirstOrThrow({ where: { lastName } });
  expect(created.firstName).toBe("Test");

  await prisma.serviceUser.delete({ where: { id: created.id } });
});
