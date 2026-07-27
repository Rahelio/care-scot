import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Override the default (sarah/Highland) storageState — this test logs in as
// james from Moray Care Services to confirm he cannot reach Highland's data.
test.use({ storageState: "e2e/.auth/james.json" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("a user from one org cannot view another org's client by direct URL", async ({ page }) => {
  const highlandOrgId = "00000000-0000-0000-0000-000000000001";
  const highlandClient = await prisma.serviceUser.findFirstOrThrow({
    where: { organisationId: highlandOrgId },
  });

  await page.goto(`/clients/${highlandClient.id}`);

  // Org-scoping makes a cross-org record behave as not-found, not a 403 —
  // either way, Highland's data must not render.
  await expect(page.getByText(highlandClient.firstName)).not.toBeVisible();
});

test("a user from one org cannot export another org's client data via the API", async ({ page }) => {
  const highlandOrgId = "00000000-0000-0000-0000-000000000001";
  const highlandClient = await prisma.serviceUser.findFirstOrThrow({
    where: { organisationId: highlandOrgId },
  });

  await page.goto("/clients");
  const result = await page.evaluate(async (clientId) => {
    const res = await fetch(
      `/api/trpc/clients.exportData?input=${encodeURIComponent(JSON.stringify({ json: { id: clientId } }))}`,
    );
    return { status: res.status, body: await res.json() };
  }, highlandClient.id);

  expect(result.status).toBeGreaterThanOrEqual(400);
  expect(JSON.stringify(result.body)).not.toContain(highlandClient.firstName);
});
