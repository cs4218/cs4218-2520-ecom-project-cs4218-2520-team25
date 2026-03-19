const { test, expect } = require("@playwright/test");

test.describe("Orders flow UI integration", () => {
  test("logged-in user can view orders returned from the API", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: "fake-token-123",
          user: {
            _id: "user123",
            name: "Han",
            email: "han@test.com",
            role: 0,
          },
        })
      );
    });

    await page.route("**/api/v1/auth/user-auth", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("fake-token-123");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/v1/auth/orders", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("fake-token-123");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            _id: "order1",
            status: "Processing",
            buyer: { name: "Han" },
            createAt: new Date().toISOString(),
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
        ]),
      });
    });

    await page.goto("/dashboard/user/orders");

    await expect(
      page.getByRole("heading", { name: /all orders/i })
    ).toBeVisible();

    await expect(page.getByText("Processing")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Han" })).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();
    await expect(page.getByText("Keyboard", { exact: true })).toBeVisible();
    await expect(page.getByText(/Mechanical keyboard/i)).toBeVisible();
    await expect(page.getByText(/Price : 120/i)).toBeVisible();
  });
});