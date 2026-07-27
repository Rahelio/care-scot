import { test, expect } from "@playwright/test";

// Unauthenticated tests — override the project's default storageState.
// Uses david@ (not sarah@) so this doesn't share a rate-limit bucket with
// the setup project's login.
test.use({ storageState: { cookies: [], origins: [] } });

test("rejects an incorrect password", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "david@highlandhomecare.co.uk");
  await page.fill('input[type="password"]', "definitely-wrong-password");
  await page.click('button[type="submit"]');
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logs in successfully with the correct password", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "david@highlandhomecare.co.uk");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(clients)?$/, { timeout: 10_000 });
  await expect(page.getByText("david@highlandhomecare.co.uk")).toBeVisible();
});

test("unauthenticated users are redirected away from dashboard routes", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login/);
});

test("public pages don't require auth", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
});
