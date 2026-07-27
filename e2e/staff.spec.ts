import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("create a new staff member", async ({ page }) => {
  const lastName = `E2EStaff${Date.now()}`;

  await page.goto("/staff/new");
  await page.getByLabel("First Name", { exact: false }).fill("Test");
  await page.getByLabel("Last Name", { exact: false }).fill(lastName);
  // roleType/employmentType/startDate already have sensible defaults.
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/staff\/[a-f0-9-]+/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: new RegExp(lastName) })).toBeVisible();

  const created = await prisma.staffMember.findFirstOrThrow({ where: { lastName } });
  expect(created.firstName).toBe("Test");

  await prisma.staffMember.delete({ where: { id: created.id } });
});
