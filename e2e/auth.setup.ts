import { test as setup, expect } from "@playwright/test";

const sarahAuthFile = "e2e/.auth/sarah.json";
const jamesAuthFile = "e2e/.auth/james.json";

setup("authenticate as sarah (Highland Home Care)", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "sarah@highlandhomecare.co.uk");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });
  await page.context().storageState({ path: sarahAuthFile });
});

setup("authenticate as james (Moray Care Services)", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "james@moraycare.co.uk");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });
  await page.context().storageState({ path: jamesAuthFile });
});
