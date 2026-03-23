import { test, expect } from '@playwright/test';

// Daniel Loh, A0252099X

test.describe('Home Page Product Tests', () => {
  test('load more renders when product count > 6', async ({ page }) => {
    // Start waiting for API response BEFORE navigation
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/product/product-count') &&
      response.request().method() === 'GET'
    );

    await page.goto(`/`);

    // Get the response
    const response = await responsePromise;
    const data = await response.json();

    // adjust depending on your API shape
    const productCount = data.total || 0;

    // Skip if not enough products
    test.skip(productCount <= 6, `Only ${productCount} products from API`);

    // Now run your assertions
    await expect(page.getByRole('main')).toContainText('Loadmore');
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - heading /\\$\\d+,\\d+\\.\\d+/ [level=5]
      - button "More Details"
      - button "ADD TO CART"
    `);
  });

  test('product card shows up properly', async ({ page }) => {
    await page.goto(`/`);

    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - heading /\\$\\d+,\\d+\\.\\d+/ [level=5]
      - button "More Details"
      - button "ADD TO CART"
    `);
  });

  test('product details matches first API product', async ({ page }) => {
    // Wait for product list API
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/product/product-list/1') &&
      response.request().method() === 'GET'
    );

    await page.goto(`/`);

    // Get API response
    const response = await responsePromise;
    const data = await response.json();

    // Adjust depending on your API shape
    const products = data.products || data.data || [];

    test.skip(products.length === 0, 'No products returned from API');

    const firstProduct = products[0];

    const name = firstProduct.name;
    const price = `$${firstProduct.price}`;
    const description = firstProduct.description;
    const category = firstProduct.category?.name;

    // -----------------------------
    // Click first product card
    // -----------------------------

    await page.locator('.card', { hasText: firstProduct.name })
      .getByRole('button', { name: 'More Details' })
      .click();

    // -----------------------------
    // Assertions using API data
    // -----------------------------
    await expect(page.getByRole('main')).toContainText(`Name : ${name}`);
    await expect(page.getByRole('main')).toContainText(`Description : ${description}`);
    await expect(page.getByRole('main')).toContainText(`Price :${price}`);

    if (category) {
      await expect(
        page.getByRole('heading', { name: `Category : ${category}` })
      ).toBeVisible();
    }

    await expect(page.getByRole('button', { name: 'ADD TO CART' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Similar Products/i })
    ).toBeVisible();
  });
});
