import { expect, test, devices, type Page } from "@playwright/test";

const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.use({
  ...devices["Pixel 7"]
});

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
}

test.describe("mobile layout resilience", () => {
  test("transactions and analytics avoid overflow and keep FAB separated from bottom nav", async ({ page }) => {
    test.skip(!E2E_USERNAME || !E2E_PASSWORD, "E2E_USERNAME/E2E_PASSWORD are required for authenticated mobile layout checks.");

    await page.goto("/login");
    await page.getByPlaceholder("Username").fill(E2E_USERNAME as string);
    await page.getByPlaceholder("Password").fill(E2E_PASSWORD as string);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/app\/dashboard/);

    await page.getByRole("link", { name: "Transactions" }).first().click();
    await page.waitForURL(/\/app\/transactions/);
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Create transaction" }).first().click();
    await page.getByRole("heading", { name: "Create transaction" }).waitFor();
    await assertNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Cancel" }).click();

    // Validate that the floating action button does not overlap the fixed bottom navigation.
    const fab = page.getByRole("button", { name: "Create transaction" }).first();
    const nav = page.getByRole("navigation", { name: "Main" });
    const fabBox = await fab.boundingBox();
    const navBox = await nav.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    if (fabBox && navBox) {
      expect(fabBox.y + fabBox.height).toBeLessThan(navBox.y);
    }

    await page.getByRole("link", { name: "Analytics" }).first().click();
    await page.waitForURL(/\/app\/analytics/);
    await assertNoHorizontalOverflow(page);
  });
});
