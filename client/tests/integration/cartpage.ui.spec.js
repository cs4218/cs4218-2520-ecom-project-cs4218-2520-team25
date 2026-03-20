const { test, expect } = require("@playwright/test");

// Han Tae Won (A0021684E)

test.describe("CartPage UI integration", () => {
  test("logged-in user can view cart, see total, remove item, and see payment section", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: "cart-token-123",
          user: {
            _id: "user123",
            name: "Han",
            email: "han@test.com",
            role: 0,
            address: "123 Test Street",
          },
        })
      );

      localStorage.setItem(
        "cart",
        JSON.stringify([
          {
            _id: "product1",
            name: "Keyboard",
            description: "Mechanical keyboard for typing and gaming use",
            price: 120,
          },
          {
            _id: "product2",
            name: "Mouse",
            description: "Wireless mouse for daily productivity work",
            price: 80,
          },
        ])
      );
    });

    await page.route("**/api/v1/product/braintree/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clientToken: "fake-client-token-123",
        }),
      });
    });

    await page.goto("/cart");

    await expect(page.getByText(/hello/i)).toBeVisible();
    await expect(page.getByText(/you have 2 items in your cart/i)).toBeVisible();

    await expect(page.getByText("Keyboard", { exact: true })).toBeVisible();
    await expect(page.getByText("Mouse", { exact: true })).toBeVisible();

    await expect(page.getByText(/Price : 120/i)).toBeVisible();
    await expect(page.getByText(/Price : 80/i)).toBeVisible();

    await expect(page.getByText(/Total : \$200\.00/i)).toBeVisible();

    const image = page.locator('img[alt="Keyboard"]');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/product1"
    );

    await expect(page.getByText(/Current Address/i)).toBeVisible();
    await expect(page.getByText("123 Test Street")).toBeVisible();

    await expect(page.getByRole("button", { name: /make payment/i })).toBeVisible();

    await page.getByRole("button", { name: "Remove" }).first().click();

    await expect(page.getByText(/you have 1 items in your cart/i)).toBeVisible();
    await expect(page.getByText("Keyboard", { exact: true })).not.toBeVisible();
    await expect(page.getByText(/Total : \$80\.00/i)).toBeVisible();
  });
});