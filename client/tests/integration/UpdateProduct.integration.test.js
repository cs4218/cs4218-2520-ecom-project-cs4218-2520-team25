const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

const PRODUCT_ID = "test-product-123";
const PRODUCT_NAME = `[Update Product Integration] Test Product ${Date.now()}`;
const PRODUCT_SLUG = "test-product-slug";
const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
const PRODUCT_PRICE = "111";
const PRODUCT_QUANTITY = "12345";

const UPDATED_NAME = `[Update Product Integration] Updated Product ${Date.now()}`;

test.describe("Update Product Page UI Integration", () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route(`**/api/v1/product/get-product/${PRODUCT_SLUG}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          product: {
            _id: PRODUCT_ID,
            name: PRODUCT_NAME,
            description: PRODUCT_DESC,
            price: PRODUCT_PRICE,
            quantity: PRODUCT_QUANTITY,
            category: { _id: "cat-1", name: "Electronics" },
            shipping: true,
          },
        }),
      });
    });
  });

  test("admin can update product information via the API", async ({ page }) => {
    await page.route(`**/api/v1/product/update-product/${PRODUCT_ID}`, async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("admin-fake-token-123");

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // navigate to update product page
    await page.goto(`/dashboard/admin/product/${PRODUCT_SLUG}`);
    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

    // verify get-product
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();
    await expect(page.getByText(PRODUCT_DESC)).toBeVisible();

    // verify get-category
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option1 = page.locator('.ant-select-item-option', { hasText: 'Electronics' });
    const option2 = page.locator('.ant-select-item-option', { hasText: 'Books' });

    await expect(option1).toBeVisible();
    await expect(option2).toBeVisible();

    await option2.click();

    // update the product
    const nameInput = page.getByPlaceholder(/write a name/i);
    await nameInput.click();
    await nameInput.fill(UPDATED_NAME);

    await page.getByRole("button", { name: /update product/i }).click();

    // verify update-product
    await page.waitForResponse(res => 
      res.url().includes(`/api/v1/product/update-product/${PRODUCT_ID}`) && res.status() === 201
    );
    await expect(page).toHaveURL(/\/admin\/products/);
  });
});
