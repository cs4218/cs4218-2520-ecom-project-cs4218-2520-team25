const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

test.describe("Create Product Page UI Integration", () => {
  test("admin can create products via the API", async ({ page }) => {
    const PRODUCT_NAME = `Test Product ${Date.now()}`;
    const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
    const PRODUCT_PRICE = "123";
    const PRODUCT_QUANTITY = "1234";

    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: "admin-fake-token-123",
          user: {
            _id: "admin123",
            name: "Admin User",
            email: "admin@test.com",
            phone: "91235678",
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

    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          category: [
            { _id: "cat-1", name: "Electronics" },
            { _id: "cat-2", name: "Books" },
          ],
        }),
      });
    });

    await page.route("**/api/v1/product/create-product", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("admin-fake-token-123");

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products: {
            _id: "test-product-123",
            slug: "test-product",
            name: PRODUCT_NAME,
          },
        }),
      });
    });

    await page.goto("/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    // verify get-category
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option1 = page.locator('.ant-select-item-option', { hasText: 'Electronics' });
    const option2 = page.locator('.ant-select-item-option', { hasText: 'Books' });
    
    await expect(option1).toBeVisible();
    await expect(option2).toBeVisible();

    await option1.click();
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY)

    await page.getByRole("button", { name: /create product/i }).click();

    // verify create-product
    await page.waitForResponse(res => 
      res.url().includes("/api/v1/product/create-product") && res.status() === 201
    );

    //await page.waitForURL("**/admin/products")
    await expect(page).toHaveURL(/\/admin\/products/);
  });
})