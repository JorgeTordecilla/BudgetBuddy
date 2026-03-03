import { expect, test, type Page } from "@playwright/test";

const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
}

type ContainerMetric = {
  role: "input" | "label" | "wrapper";
  scrollWidth: number;
  clientWidth: number;
};

type OverflowSnapshot = {
  metrics: ContainerMetric[];
  firstOverflowRole: ContainerMetric["role"] | null;
};

async function assertDateContainersBounded(page: Page, selector: string) {
  const snapshot = await page.evaluate((inputSelector): OverflowSnapshot | null => {
    const input = document.querySelector(inputSelector) as HTMLInputElement | null;
    if (!input) {
      return null;
    }

    const label = input.closest("label");
    const wrapper = label?.parentElement ?? input.parentElement;
    const nodes: Array<{ role: ContainerMetric["role"]; node: HTMLElement | null }> = [
      { role: "input", node: input },
      { role: "label", node: label as HTMLElement | null },
      { role: "wrapper", node: wrapper as HTMLElement | null }
    ];

    const metrics = nodes
      .filter((entry): entry is { role: ContainerMetric["role"]; node: HTMLElement } => Boolean(entry.node))
      .map((entry) => ({
        role: entry.role,
        scrollWidth: Math.ceil(entry.node.scrollWidth),
        clientWidth: Math.ceil(entry.node.clientWidth)
      }));

    const firstOverflow = metrics.find((entry) => entry.scrollWidth > entry.clientWidth);
    return {
      metrics,
      firstOverflowRole: firstOverflow?.role ?? null
    };
  }, selector);

  expect(snapshot).not.toBeNull();
  expect(snapshot?.firstOverflowRole, JSON.stringify(snapshot?.metrics ?? [])).toBeNull();
}

test.describe("mobile layout resilience", () => {
  test("date controls remain overflow-safe across transactions, analytics, and budgets", async ({ page }) => {
    test.skip(!E2E_USERNAME || !E2E_PASSWORD, "E2E_USERNAME/E2E_PASSWORD are required for authenticated mobile layout checks.");

    await page.goto("/login");
    await page.getByPlaceholder("Username").fill(E2E_USERNAME as string);
    await page.getByPlaceholder("Password").fill(E2E_PASSWORD as string);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/app\/dashboard/);

    await page.goto("/app/transactions");
    await page.waitForURL(/\/app\/transactions/);
    await expect(page.locator('input[aria-label="From"]')).toHaveClass(/field-date-input/);
    await expect(page.locator('input[aria-label="To"]')).toHaveClass(/field-date-input/);
    await assertDateContainersBounded(page, 'input[aria-label="From"]');
    await assertDateContainersBounded(page, 'input[aria-label="To"]');
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Create transaction" }).first().click();
    await page.getByRole("heading", { name: "Create transaction" }).waitFor();
    await expect(page.locator('input[aria-label="Date"]')).toHaveClass(/field-date-input/);
    await assertDateContainersBounded(page, 'input[aria-label="Date"]');
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

    await page.goto("/app/analytics");
    await page.waitForURL(/\/app\/analytics/);
    await expect(page.locator('input[aria-label="From date"]')).toHaveClass(/field-date-input/);
    await expect(page.locator('input[aria-label="To date"]')).toHaveClass(/field-date-input/);
    await assertDateContainersBounded(page, 'input[aria-label="From date"]');
    await assertDateContainersBounded(page, 'input[aria-label="To date"]');
    await assertNoHorizontalOverflow(page);

    await page.goto("/app/budgets");
    await page.waitForURL(/\/app\/budgets/);
    await expect(page.locator('input[aria-label="From month"]')).toHaveClass(/field-date-input/);
    await expect(page.locator('input[aria-label="To month"]')).toHaveClass(/field-date-input/);
    await assertDateContainersBounded(page, 'input[aria-label="From month"]');
    await assertDateContainersBounded(page, 'input[aria-label="To month"]');
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "New budget" }).click();
    await page.getByRole("heading", { name: "Create budget" }).waitFor();
    await expect(page.locator('input[aria-label="Month"]')).toHaveClass(/field-date-input/);
    await assertDateContainersBounded(page, 'input[aria-label="Month"]');
    await assertNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
