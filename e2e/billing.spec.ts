import { test, expect } from "@playwright/test";

test("billing tab shows seat usage", async ({ page }) => {
  await page.goto("/settings");
  await page.click('button:has-text("Billing")');

  await expect(page.getByText("Seats & billing")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("seat-usage")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Subscribe monthly|Manage Billing/ }),
  ).toBeVisible();
});
