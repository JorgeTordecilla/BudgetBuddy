import { expect, test } from "@playwright/test";

const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test("loads login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome to BudgetBuddy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("deep-link to protected route resolves without 404", async ({ page }) => {
  await page.goto("/app/dashboard");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("login success and dashboard navigation", async ({ page }) => {
  test.skip(!E2E_USERNAME || !E2E_PASSWORD, "E2E_USERNAME/E2E_PASSWORD are required for authenticated smoke.");

  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(E2E_USERNAME as string);
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD as string);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("authenticated smoke covers analytics and logout", async ({ page }) => {
  test.skip(!E2E_USERNAME || !E2E_PASSWORD, "E2E_USERNAME/E2E_PASSWORD are required for authenticated smoke.");

  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(E2E_USERNAME as string);
  await page.getByPlaceholder("Password").fill(E2E_PASSWORD as string);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page).toHaveURL(/\/app\/analytics/);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
