const { test, expect } = require("@playwright/test");

const fakeHomeProducts = [
  {
    _id: "prod1",
    name: "Alpha Phone",
    slug: "alpha-phone",
    description: "Flagship smartphone with OLED display and long battery life",
    price: 999.99,
  },
];

async function mockHomeApi(page, products = fakeHomeProducts) {
  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: [] }),
    });
  });

  await page.route("**/api/v1/product/product-count", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: products.length }),
    });
  });

  await page.route("**/api/v1/product/product-list/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products }),
    });
  });
}

test.describe("Search flow UI integration", () => {
  // Owen Yeo Le Yang A0252047L
  test("test_add_to_cart_from_homepage_updates_badge_and_local_storage", async ({ page }) => {
    // Arrange
    await mockHomeApi(page);

    // Act
    await page.goto("/");
    await page.getByRole("button", { name: "ADD TO CART" }).first().click();

    // Assert
    await expect(page.locator(".ant-badge-count", { hasText: "1" })).toBeVisible();
    await expect(page.getByText("Item Added to cart")).toBeVisible();

    const cartItems = await page.evaluate(() => {
      const raw = localStorage.getItem("cart");
      return raw ? JSON.parse(raw) : [];
    });

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].name).toBe("Alpha Phone");
  });

  // Owen Yeo Le Yang A0252047L
  test("test_valid_search_keyword_navigates_to_search_page_and_displays_results", async ({
    page,
  }) => {
    // Arrange
    await mockHomeApi(page);
    await page.route("**/api/v1/product/search/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            _id: "prod1",
            name: "Alpha Phone",
            slug: "alpha-phone",
            description: "Flagship smartphone",
            price: 999.99,
          },
          {
            _id: "prod2",
            name: "Alpha Phone Case",
            slug: "alpha-phone-case",
            description: "Protective case",
            price: 19.9,
          },
        ]),
      });
    });

    // Act
    await page.goto("/");
    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: /search resuts/i })).toBeVisible();
    await expect(page.getByText("Found 2")).toBeVisible();
    await expect(page.getByText("Alpha Phone", { exact: true })).toBeVisible();
    await expect(page.getByText("Alpha Phone Case", { exact: true })).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L 
  test("test_invalid_search_keyword_displays_no_products_found_message", async ({ page }) => {
    // Arrange
    await mockHomeApi(page);
    await page.route("**/api/v1/product/search/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Act
    await page.goto("/");
    await page.getByPlaceholder(/search/i).fill("zzzz-no-match");
    await page.getByRole("button", { name: /^search$/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText("No Products Found")).toBeVisible();
    await expect(page.locator(".card.m-2")).toHaveCount(0);
  });

  // Owen Yeo Le Yang A0252047L
  test("test_live_mongodb_search_flow_add_to_cart_then_search_product", async ({ page }) => {
    // Arrange
    await page.goto("/");
    const firstProductTitle = page.locator(".card .card-title").first();

    if ((await firstProductTitle.count()) === 0) {
      test.skip(true, "No products are available in the live database to validate search flow.");
    }

    const firstProductName = (await firstProductTitle.textContent())?.trim();
    const searchKeyword = firstProductName ? firstProductName.split(/\s+/)[0] : "";

    if (!searchKeyword) {
      test.skip(true, "Could not derive a stable search keyword from the first product.");
    }

    // Act
    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await page.getByPlaceholder(/search/i).fill(searchKeyword);
    await page.getByRole("button", { name: /^search$/i }).click();

    // Assert
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText(/Found\s+\d+/i)).toBeVisible();
    await expect(page.getByText("No Products Found")).not.toBeVisible();
    await expect(page.locator(".ant-badge-count", { hasText: "1" })).toBeVisible();
    await expect(page.getByText(firstProductName || "", { exact: false }).first()).toBeVisible();
  });
});