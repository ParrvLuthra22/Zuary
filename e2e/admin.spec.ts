import { expect, test } from "@playwright/test";

import { ADMIN, signIn } from "./support/session";

test.describe("admin", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!, ADMIN);
  });

  test("the orders queue loads", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /orders/i }).first()).toBeVisible();
    // The filter tabs are the thing the warehouse uses every morning.
    await expect(page.getByRole("link", { name: /unshipped/i }).first()).toBeVisible();
  });

  /**
   * Marking shipped must change the status AND leave an audit row.
   *
   * The audit row is the half that is easy to lose: it is written inside the
   * same transaction as the status change, so if it ever stops appearing, the
   * log has a silent gap and nobody can tell which rows are missing.
   */
  test("mark-shipped updates the status and writes an audit row", async ({
    page,
  }) => {
    const orderId = process.env.E2E_PAID_ORDER_ID;
    test.skip(!orderId, "needs seed:e2e to have written a paid order");

    await page.goto(`/admin/orders/${orderId}`);
    await expect(page.getByText(/paid/i).first()).toBeVisible();

    await page.getByRole("button", { name: /mark shipped|ship/i }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/courier/i).selectOption({ index: 1 });
    await dialog.getByLabel(/awb|tracking number/i).fill("E2E123456789");
    await dialog.getByRole("button", { name: /confirm|mark shipped|save/i }).click();

    await expect(page.getByText(/shipped/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // The audit trail is rendered on the order detail page.
    await page.reload();
    await expect(page.getByText(/order\.ship|shipped by/i).first()).toBeVisible();
    await expect(page.getByText(ADMIN.email).first()).toBeVisible();
  });

  /**
   * A stock edit must reach the storefront.
   *
   * The PDP reads a tag-cached catalogue, so this is really a test that
   * setStockAction revalidates CATALOGUE_TAG. Without it the admin shows the
   * new number and the customer keeps seeing the old one.
   */
  test("a stock edit shows up on the storefront PDP", async ({ page }) => {
    await page.goto("/admin/stock");

    const row = page.getByRole("row").filter({ hasText: /kohl/i }).first();
    const input = row.getByRole("spinbutton").first();
    await expect(input).toBeVisible();

    await input.fill("0");
    await input.press("Enter");
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // The size that was zeroed is now unselectable on the product page.
    await page.goto("/products/kohl");
    const soldOut = page.getByRole("button", { name: /Size M, sold out/i });
    await expect(soldOut).toBeDisabled();

    // Put it back so the suite can be run twice.
    await page.goto("/admin/stock");
    const restore = page
      .getByRole("row")
      .filter({ hasText: /kohl/i })
      .first()
      .getByRole("spinbutton")
      .first();
    await restore.fill("10");
    await restore.press("Enter");
  });

  test("an admin action by a customer is refused with a clean message", async ({
    page,
    context,
    baseURL,
  }) => {
    // Drop the admin cookie and come back as a customer.
    await context.clearCookies();
    await signIn(context, baseURL!, {
      id: "e2e-customer",
      email: "e2e-customer@zuary.test",
      role: "customer",
    });

    // The page itself is a 404, which is the first line of defence.
    const response = await page.goto("/admin/stock");
    expect(response?.status()).toBe(404);

    // And the token endpoint behind it refuses on its own, because a server
    // action is a public POST and the page gate is not the real one.
    const blob = await page.request.post("/api/admin/blob-token", {
      data: {},
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(blob.status());
    const body = await blob.json();
    expect(body.message).toBeTruthy();
    // A refusal must read like a sentence, not a stack trace.
    expect(JSON.stringify(body)).not.toMatch(/at .*\(|node_modules|\.ts:\d+/);
  });
});
