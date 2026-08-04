import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// marRecord requires ctx.user.staffMemberId (a MAR entry needs a real staff
// member to attribute administration to), and voiding requires MANAGER+.
// sarah (the default chromium-project session) is ORG_ADMIN but has no
// linked StaffMember, so this test logs in as david — MANAGER, linked to a
// seeded StaffMember — instead of reusing the shared session.
test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("recording a MAR administration requires confirmation, and a manager can void a mis-recorded entry", async ({ page }) => {
  const suffix = Date.now();
  const org = await prisma.organisation.findFirstOrThrow({ where: { name: "Highland Home Care Ltd" } });

  const client = await prisma.serviceUser.create({
    data: {
      organisationId: org.id,
      firstName: "MarTest",
      lastName: `Client${suffix}`,
      dateOfBirth: new Date("1945-01-01"),
      status: "ACTIVE",
    },
  });
  const medName = `E2E Test Med ${suffix}`;
  const med = await prisma.serviceUserMedication.create({
    data: {
      organisationId: org.id,
      serviceUserId: client.id,
      medicationName: medName,
      dose: "10mg",
      form: "TABLET",
      frequency: "Once daily",
      isPrn: false,
      isControlledDrug: false,
      status: "ACTIVE",
      startDate: new Date("2024-01-01"),
    },
  });

  await page.goto("/login");
  await page.fill('input[type="email"]', "david@highlandhomecare.co.uk");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });

  const todayDay = new Date().getDate();

  await page.goto(`/medication/${client.id}/mar`);
  await expect(page.getByText(medName)).toBeVisible({ timeout: 10_000 });

  // The day cell's button has no accessible name (empty cells render no
  // icon/text) — the day number "3" is the column header, not the button
  // label. The medication-name <td> is column 0, so day N's <td> is the
  // Nth cell in the row.
  const medRow = page.locator("tr", { hasText: medName });
  const dayCellButton = medRow.locator("td").nth(todayDay).locator("button");
  await dayCellButton.click();

  // ── Confirmation step is required before the mutation fires ────────────
  await expect(page.getByText("Confirm administration")).not.toBeVisible();
  await page.click('button[type="submit"]'); // outcome defaults to "Administered"
  await expect(page.getByText("Confirm administration")).toBeVisible({ timeout: 5_000 });

  // No record should exist yet — confirming is what actually creates it.
  let count = await prisma.medicationAdminRecord.count({ where: { medicationId: med.id } });
  expect(count).toBe(0);

  // "Back" returns to the form without submitting.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Confirm administration")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Record" })).toBeVisible();

  // Submit again and actually confirm this time.
  await page.click('button[type="submit"]');
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Administration recorded")).toBeVisible({ timeout: 10_000 });

  count = await prisma.medicationAdminRecord.count({ where: { medicationId: med.id } });
  expect(count).toBe(1);
  const record = await prisma.medicationAdminRecord.findFirstOrThrow({ where: { medicationId: med.id } });
  expect(record.voidedAt).toBeNull();

  // ── Void the entry ──────────────────────────────────────────────────────
  await dayCellButton.click();
  await expect(page.getByText("Already recorded today")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Void" }).click();
  await page.getByPlaceholder(/Why is this entry being voided/).fill("Wrong client selected — E2E test");
  await page.getByRole("button", { name: "Confirm void" }).click();
  await expect(page.getByText("Entry voided")).toBeVisible({ timeout: 10_000 });

  const voided = await prisma.medicationAdminRecord.findUniqueOrThrow({ where: { id: record.id } });
  expect(voided.voidedAt).not.toBeNull();
  expect(voided.voidReason).toBe("Wrong client selected — E2E test");

  // Voiding doesn't auto-close the dialog (deliberately — lets the user see
  // the updated state), so close it before reopening the cell.
  await page.keyboard.press("Escape");
  await expect(page.getByText("Already recorded today")).not.toBeVisible();

  // Reopening should show the voided entry, struck through, with no live "Given" status.
  await dayCellButton.click();
  await expect(page.getByText(/^Voided by/)).toBeVisible({ timeout: 5_000 });

  await prisma.medicationAdminRecord.deleteMany({ where: { medicationId: med.id } });
  await prisma.serviceUserMedication.delete({ where: { id: med.id } });
  await prisma.serviceUser.delete({ where: { id: client.id } });
});
