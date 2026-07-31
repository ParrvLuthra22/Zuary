import { expect, test } from "@playwright/test";

import { ADMIN, CUSTOMER, OTHER_CUSTOMER, signIn } from "./support/session";

test.describe("auth boundaries", () => {
  test("requesting a magic link shows the check-email page", async ({ page }) => {
    await page.goto("/login");
    /* Scoped by id: the footer newsletter field is also an email input, and an
       unscoped /email/i matches both. */
    await page.locator("#login-email").fill("someone@example.com");
    await page.getByRole("button", { name: /email|link|continue/i }).first().click();

    await expect(page).toHaveURL(/check-email/, { timeout: 15_000 });
    await expect(page.getByText(/check your (email|inbox)/i)).toBeVisible();
  });

  test("signed out, /account/orders redirects to login and remembers where", async ({
    page,
  }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/next=%2Faccount%2Forders/);
  });

  /**
   * 404, not 403.
   *
   * A 403 confirms the route exists, which tells a prober exactly where to
   * point a credential-stuffing run. A signed-in customer must get the same
   * answer as a stranger.
   */
  test("/admin as a customer is a 404, not a 403", async ({
    page,
    context,
    baseURL,
  }) => {
    await signIn(context, baseURL!, CUSTOMER);

    for (const path of ["/admin", "/admin/orders", "/admin/stock"]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} must 404`).toBe(404);
      // And nothing from the admin shell leaked into the body.
      await expect(page.getByText(/ZUARY admin/i)).toHaveCount(0);
    }
  });

  test("/admin as an admin loads", async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!, ADMIN);
    const response = await page.goto("/admin/orders");
    expect(response?.status()).toBe(200);
  });

  /**
   * One customer must not be able to read another's order.
   *
   * Ownership is in the query's WHERE clause, so someone else's id and a
   * nonexistent one are indistinguishable — both come back as "not found".
   * The test asserts that indistinguishability, not just the refusal.
   */
  test("a customer cannot open another customer's order", async ({
    page,
    context,
    baseURL,
    request,
  }) => {
    // Seeded: an order belonging to OTHER_CUSTOMER. See scripts/seed-e2e.ts.
    const foreignOrderId = process.env.E2E_FOREIGN_ORDER_ID;
    test.skip(!foreignOrderId, "needs seed:e2e to have written a foreign order");

    await signIn(context, baseURL!, CUSTOMER);

    const page404 = await page.goto(`/account/orders/${foreignOrderId}`);
    expect(page404?.status()).toBe(404);

    const api = await page.request.get(`/api/orders/${foreignOrderId}`);
    expect(api.status()).toBe(404);

    // A uuid that exists for nobody gets the identical answer.
    const nonexistent = await page.request.get(
      "/api/orders/00000000-0000-0000-0000-000000000000",
    );
    expect(nonexistent.status()).toBe(api.status());
    expect(await nonexistent.json()).toEqual(await api.json());

    void request;
    void OTHER_CUSTOMER;
  });

  test("the order API refuses an unauthenticated caller", async ({ request }) => {
    const response = await request.get(
      "/api/orders/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });
});
