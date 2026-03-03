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

async function assertWebkitDateValueBounded(page: Page, selector: string) {
  const styles = await page.evaluate((inputSelector) => {
    const input = document.querySelector(inputSelector) as HTMLInputElement | null;
    if (!input) {
      return null;
    }
    const pseudo = getComputedStyle(input, "::-webkit-date-and-time-value");
    return {
      pseudoWidth: pseudo.width
    };
  }, selector);
  expect(styles).not.toBeNull();
  expect(styles?.pseudoWidth).not.toBe("auto");
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

    await page.getByRole("link", { name: "Transactions" }).first().click();
    await page.waitForURL(/\/app\/transactions/);
    await expect(page.getByLabel("From")).toHaveClass(/field-date-input/);
    await expect(page.getByLabel("To")).toHaveClass(/field-date-input/);
    await assertWebkitDateValueBounded(page, 'input[aria-label="From"]');
    await assertWebkitDateValueBounded(page, 'input[aria-label="To"]');
    await assertDateContainersBounded(page, 'input[aria-label="From"]');
    await assertDateContainersBounded(page, 'input[aria-label="To"]');
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Create transaction" }).first().click();
    await page.getByRole("heading", { name: "Create transaction" }).waitFor();
    await expect(page.getByLabel("Date")).toHaveClass(/field-date-input/);
    await assertWebkitDateValueBounded(page, 'input[type="date"]');
    await assertDateContainersBounded(page, 'input[type="date"]');
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
    await expect(page.getByLabel("From date")).toHaveClass(/field-date-input/);
    await expect(page.getByLabel("To date")).toHaveClass(/field-date-input/);
    await assertWebkitDateValueBounded(page, 'input[aria-label="From date"]');
    await assertWebkitDateValueBounded(page, 'input[aria-label="To date"]');
    await assertDateContainersBounded(page, 'input[aria-label="From date"]');
    await assertDateContainersBounded(page, 'input[aria-label="To date"]');
    await assertNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Budgets" }).first().click();
    await page.waitForURL(/\/app\/budgets/);
    await expect(page.getByLabel("From month")).toHaveClass(/field-date-input/);
    await expect(page.getByLabel("To month")).toHaveClass(/field-date-input/);
    await assertWebkitDateValueBounded(page, 'input[aria-label="From month"]');
    await assertWebkitDateValueBounded(page, 'input[aria-label="To month"]');
    await assertDateContainersBounded(page, 'input[aria-label="From month"]');
    await assertDateContainersBounded(page, 'input[aria-label="To month"]');
    await assertNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "New budget" }).click();
    await page.getByRole("heading", { name: "Create budget" }).waitFor();
    await expect(page.getByLabel("Month", { exact: true })).toHaveClass(/field-date-input/);
    await assertWebkitDateValueBounded(page, 'input[type="month"][aria-invalid]');
    await assertDateContainersBounded(page, 'input[type="month"][aria-invalid]');
    await assertNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
