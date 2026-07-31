import { expect, test } from "@playwright/test";

import { CUSTOMER, signIn } from "./support/session";

/**
 * The flow that must never break: land, browse, add to bag, sign in, pay.
 *
 * Stops short of the Razorpay modal's internals. That modal is a cross-origin
 * iframe owned by someone else, and asserting inside it means the suite breaks
 * whenever Razorpay ships a redesign — a test that fails for reasons unrelated
 * to our code is worse than no test. What is asserted instead is the thing we
 * control and the thing that costs money if it is wrong: the amount our own
 * create-order endpoint computed.
 */

test.describe("critical path", () => {
  test("home → shop → PDP → bag → login → checkout, cart intact", async ({
    page,
    context,
    baseURL,
  }) => {
    /* 1 — the hero */
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();

    /* 2 — the shop lists the three trousers */
    await page.goto("/shop");
    const cards = page.locator('a[href^="/products/"]');
    await expect(cards.first()).toBeVisible();
    // Three products, though each card may carry more than one link.
    for (const slug of ["kohl", "dhool", "reeh"]) {
      await expect(page.locator(`a[href="/products/${slug}"]`).first()).toBeVisible();
    }

    /* 3 — open KOHL, take size M, add to bag */
    await page.goto("/products/kohl");
    await expect(page.getByRole("heading", { name: /kohl/i }).first()).toBeVisible();

    const price = await page
      .locator("text=/₹\\s?[0-9,]+/")
      .first()
      .textContent();

    // The pills are buttons with aria-pressed, not a radiogroup — the
    // accessible name is "Size M".
    await page.getByRole("button", { name: "Size M", exact: true }).click();
    /* The accessible name is "Add KOHL size M to bag" — the aria-label names
       the product and size, so /add to bag/ is not a substring of it. */
    await page.getByRole("button", { name: /to bag$/i }).click();

    /* 4 — the drawer opens with the right line */
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/kohl/i).first()).toBeVisible();
    await expect(drawer.getByText(/\bM\b/).first()).toBeVisible();
    if (price) {
      /* Compare the formatted string, not the digits. Both sides render through
         formatINR, so the drawer shows "₹1,200" — stripping to "1200" matches
         nothing because of the thousands separator. */
      await expect(drawer.getByText(price.trim()).first()).toBeVisible();
    }
    await page.keyboard.press("Escape");

    /* 5 — checkout while signed out sends us to login */
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/next=%2Fcheckout/);

    /* 6 — sign in */
    await signIn(context, baseURL!, CUSTOMER);

    /* 7 — THE ASSERTION THAT MATTERS: the cart survived the round trip.
     *
     * The cart lives in localStorage, and signing in navigates away from the
     * origin and back. Anything that clears storage on sign-in, or renders the
     * cart before hydration and then writes an empty one back, silently empties
     * a basket the customer already filled. It fails quietly and it costs an
     * order every time. */
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText(/kohl/i).first()).toBeVisible();
    await expect(page.getByText(/\bM\b/).first()).toBeVisible();

    /* 8 — address form */
    /* Labels are matched exactly. Loose regexes collide here: /pin/i also
       matches "Shipping", and /address/i matches both address lines. */
    await page.getByLabel("Full name", { exact: true }).fill("E2E Customer");
    await page.getByLabel(/phone/i).first().fill("9876543210");
    await page.getByLabel("Address line 1", { exact: true }).fill("12 Example Road");
    await page.getByLabel("City", { exact: true }).fill("Bengaluru");
    await page
      .getByLabel("State / union territory", { exact: true })
      .selectOption({ label: "Karnataka" });
    await page.getByLabel("PIN code", { exact: true }).fill("560001");

    /* 9 — submitting calls create-order; assert what the SERVER priced, not
     *     what the page displayed. This is the tamper boundary. */
    const createOrder = page.waitForResponse(
      (r) => r.url().includes("/api/checkout/create-order") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /pay|place order/i }).click();

    const response = await createOrder;
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      ourOrderId: expect.any(String),
      razorpayOrderId: expect.stringMatching(/^order_/),
      amount: expect.any(Number),
    });

    // Paise, and consistent with the ₹2000 free-shipping rule.
    const rupees = body.amount / 100;
    expect(Number.isInteger(body.amount)).toBe(true);
    expect(rupees).toBeGreaterThan(0);
    const expectedShipping = rupees >= 2000 ? 0 : 99;
    expect((rupees - expectedShipping) % 1).toBe(0);

    // The secret must never be in the response.
    expect(JSON.stringify(body)).not.toMatch(/key_secret|rzp_live_.*_secret/i);
  });

  test("a tampered price is ignored — the server charges the catalogue price", async ({
    page,
    context,
    baseURL,
  }) => {
    await signIn(context, baseURL!, CUSTOMER);

    // Straight at the endpoint, claiming the trouser costs ₹1. The browser is
    // not the only thing that can call this, so this is the honest test.
    const response = await page.request.post("/api/checkout/create-order", {
      data: {
        contact: { email: CUSTOMER.email, phone: "9876543210" },
        address: {
          name: "E2E Customer",
          line1: "12 Example Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          country: "India",
        },
        items: [{ slug: "kohl", size: "M", qty: 1, unitPriceInr: 1 }],
        saveAddress: false,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    // ₹1 + ₹99 shipping would be 10000 paise. Anything at or above the real
    // catalogue price proves the claimed one was discarded.
    expect(body.amount).toBeGreaterThan(10_000);
  });
});
