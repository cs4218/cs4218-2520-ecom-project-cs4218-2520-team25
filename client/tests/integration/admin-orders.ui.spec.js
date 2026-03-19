const { test, expect } = require("@playwright/test");

// Han Tae Won (A0021684E)

test.describe("Admin orders flow UI integration", () => {
  test("logged-in admin can view all orders returned from the API", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: "admin-fake-token-123",
          user: {
            _id: "admin123",
            name: "Admin",
            email: "admin@test.com",
            role: 1,
          },
        })
      );
    });

    await page.route("**/api/v1/auth/admin-auth", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("admin-fake-token-123");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/v1/auth/all-orders", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("admin-fake-token-123");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            _id: "order1",
            status: "Processing",
            buyer: { name: "User One" },
            createdAt: new Date().toISOString(),
            payment: { success: true },
            products: [
              {
                _id: "product1",
                name: "Keyboard",
                description: "Mechanical keyboard for typing and gaming use",
                price: 120,
              },
            ],
          },
          {
            _id: "order2",
            status: "Shipped",
            buyer: { name: "User Two" },
            createdAt: new Date().toISOString(),
            payment: { success: false },
            products: [
              {
                _id: "product2",
                name: "Mouse",
                description: "Wireless mouse for daily productivity work",
                price: 80,
              },
            ],
          },
        ]),
      });
    });

    await page.goto("/dashboard/admin/orders");

    await expect(
      page.getByRole("heading", { name: /all orders/i })
    ).toBeVisible();

    await expect(page.getByText("Processing")).toBeVisible();
    await expect(page.getByText("Shipped")).toBeVisible();

    await expect(page.getByRole("cell", { name: "User One" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "User Two" })).toBeVisible();

    await expect(page.getByText("Success")).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();

    await expect(page.getByText("Keyboard", { exact: true })).toBeVisible();
    await expect(page.getByText("Mouse", { exact: true })).toBeVisible();

    await expect(page.getByText(/Mechanical keyboard/i)).toBeVisible();
    await expect(page.getByText(/Wireless mouse/i)).toBeVisible();

    await expect(page.getByText(/Price : 120/i)).toBeVisible();
    await expect(page.getByText(/Price : 80/i)).toBeVisible();

    // verify product image is rendered with correct photo endpoint
    const image = page.locator('img[alt="Keyboard"]');
    await expect(image).toBeVisible();

    await expect(image).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/product1"
    );
  });
});