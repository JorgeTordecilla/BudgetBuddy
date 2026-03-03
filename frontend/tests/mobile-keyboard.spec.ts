import { expect, test, devices } from "@playwright/test";

test.use({
  ...devices["Pixel 7"]
});

test.describe("mobile keyboard stability", () => {
  test("login focus/blur keeps stable scale and layout classes", async ({ page }) => {
    await page.goto("/login");

    const username = page.getByPlaceholder("Username");
    const password = page.getByPlaceholder("Password");
    const container = page.locator("div.flex").filter({ has: username }).first();

    await expect(container).toBeVisible();
    await expect(container).toHaveClass(/min-h-\[100svh\]/);
    await expect(container).toHaveClass(/md:min-h-screen/);
    await expect(username).toHaveClass(/text-base/);
    await expect(username).toHaveClass(/md:text-sm/);
    await expect(password).toHaveClass(/text-base/);
    await expect(password).toHaveClass(/md:text-sm/);

    const beforeScale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    await username.click();
    await page.keyboard.type("demo-user");
    await page.keyboard.press("Tab");
    const afterScale = await page.evaluate(() => window.visualViewport?.scale ?? 1);

    expect(beforeScale).toBe(1);
    expect(afterScale).toBe(1);
    await expect(container).toBeVisible();
  });

  test("register focus/blur keeps stable scale and layout classes", async ({ page }) => {
    await page.goto("/register");

    const username = page.getByPlaceholder("Username");
    const password = page.locator('input[name="password"]');
    const confirmPassword = page.locator('input[name="confirmPassword"]');
    const currency = page.getByRole("combobox");
    const container = page.locator("div.flex").filter({ has: confirmPassword }).first();

    await expect(container).toBeVisible();
    await expect(container).toHaveClass(/min-h-\[100svh\]/);
    await expect(container).toHaveClass(/md:min-h-screen/);
    await expect(username).toHaveClass(/text-base/);
    await expect(password).toHaveClass(/text-base/);
    await expect(confirmPassword).toHaveClass(/text-base/);
    await expect(currency).toHaveClass(/text-base/);

    const beforeScale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    await username.click();
    await page.keyboard.type("demo-user");
    await page.keyboard.press("Tab");
    const afterScale = await page.evaluate(() => window.visualViewport?.scale ?? 1);

    expect(beforeScale).toBe(1);
    expect(afterScale).toBe(1);
    await expect(container).toBeVisible();
  });
});
