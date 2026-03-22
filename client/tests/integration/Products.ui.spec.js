const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

const PRODUCTS = [
  {
    _id: "productid-1",
    slug: "product-1",
    name: "Test Product 1",
    description: "Description 1",
  },
  {
    _id: "productid-2",
    slug: "product-2",
    name: "Test Product 2",
    description: "Description 2",
  },
];

test.describe("Product Page UI Integration", () => {
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

    await page.route("**/api/v1/product/get-product", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, products: PRODUCTS }),
      });
    });

    for (const p of PRODUCTS) {
      await page.route(`/api/v1/product/product-photo/${p._id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAUA...", "base64"),
        });
      });
    }
  });

  test("should load and display all products with correct details", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await expect(page.getByRole("heading", { name: "All Products List" })).toBeVisible();

    // verify get-product
    for (const product of PRODUCTS) {
      const productCard = page.locator('a.product-link', { hasText: product.name });

      await expect(productCard).toBeVisible();
      await expect(productCard.getByText(product.description)).toBeVisible();
      await expect(productCard).toHaveAttribute(
        "href", 
        `/dashboard/admin/product/${product.slug}`
      );

      // verify product-photo
      const image = productCard.locator("img");
      await expect(image).toHaveAttribute(
        "src",
        `/api/v1/product/product-photo/${product._id}`
      );
      await expect(image).toHaveAttribute("alt", product.name);
    }
  });
});
