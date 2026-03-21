const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

// admin email and password (created manually beforehand)
const ADMIN_EMAIL = "admin_email@test.com";
const ADMIN_PASSWORD = "testPassword@123";

test.describe("Admin Product Management - End-to-End Create Product Flow", () => {
  // log in as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");

    await page.getByPlaceholder(/Enter Your Email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/Enter Your Password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /login/i }).click();

    await page.waitForURL("http://localhost:3000/");
  });

  test("admin can create, update and delete a new product", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    // ===============================================================================
    // create product
    // ===============================================================================

    const productName = `Test Product ${Date.now()}`

    // category select
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();

    // product name fill
    await page.getByPlaceholder(/write a name/i).fill(productName);

    // product description fill
    await page.getByPlaceholder(/write a description/i).fill(`Description of ${productName}`);

    // product price fill
    await page.getByPlaceholder(/write a price/i).fill("123");

    // product quantity fill
    await page.getByPlaceholder(/write a quantity/i).fill("1234");

    // submit product creation
    await page.getByRole("button", { name: /create product/i }).click();

    await page.waitForURL("**/dashboard/admin/products");

    await expect(page.getByRole('heading', { name: productName })).toBeVisible();

    // ===============================================================================
    // edit product
    // ===============================================================================

    const newName = `Edited Product ${Date.now()}`

    // navigate to update product page
    const testProductCard = page.locator('a.product-link', { hasText: productName });
    await testProductCard.click();
    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

    // update name
    const nameInput = page.getByPlaceholder(/write a name/i);
    await nameInput.click();
    await nameInput.fill(newName);

    await page.getByRole("button", { name: /update product/i }).click();

    await page.waitForURL("**/dashboard/admin/products");
    await page.reload();

    await expect(page.getByRole('heading', { name: productName })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: newName })).toBeVisible();

    // ===============================================================================
    // delete product
    // ===============================================================================

    // clean up and delete the created product
    const editedProductCard = page.locator('a.product-link', { hasText: newName });
    await editedProductCard.click();

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await Promise.all([
      page.waitForURL('**/dashboard/admin/products'),
      page.getByRole('button', { name: /delete product/i }).click()
    ]);

    await expect(page.locator('a.product-link', { hasText: newName })).not.toBeVisible();
  });


});