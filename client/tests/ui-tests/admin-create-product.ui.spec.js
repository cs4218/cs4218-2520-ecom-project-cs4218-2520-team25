const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

// admin email and password (created manually beforehand)
const ADMIN_EMAIL = "admin_email@test.com";
const ADMIN_PASSWORD = "testPassword@123";

test.describe("Admin Product Management - End-to-End CRUD Product Flow", () => {
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
    await page.reload();

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

  test("product creation should fail if no category is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_NAME = `Failed Test Product ${Date.now()}`;
    const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
    const PRODUCT_PRICE = "123";
    const PRODUCT_QUANTITY = "1234";

    // fill in fields in page
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY);

    await page.getByRole("button", { name: /create product/i }).click();

    // no navigation back to products page happens and toast with error message appears
    await expect(page).toHaveURL(/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    // check that product was not created
    await page.goto("/dashboard/admin/products");
    await expect(page.locator('a.product-link', { hasText: PRODUCT_NAME })).not.toBeVisible();
  });

  test("product creation should fail if no name is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_DESC = `Description for product with no name`;
    const PRODUCT_PRICE = "123";
    const PRODUCT_QUANTITY = "1234";

    // fill in fields in page
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY);

    await page.getByRole("button", { name: /create product/i }).click();

    // no navigation back to products page happens and toast with error message appears
    await expect(page).toHaveURL(/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    // check that product was not created
    await page.goto("/dashboard/admin/products");
    await expect(page.getByText(PRODUCT_DESC)).not.toBeVisible();
  });

  test("product creation should fail if no description is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_NAME = `Failed Test Product ${Date.now()}`;
    const PRODUCT_PRICE = "123";
    const PRODUCT_QUANTITY = "1234";

    // fill in fields in page
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY);

    await page.getByRole("button", { name: /create product/i }).click();

    // no navigation back to products page happens and toast with error message appears
    await expect(page).toHaveURL(/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    // check that product was not created
    await page.goto("/dashboard/admin/products");
    await expect(page.locator('a.product-link', { hasText: PRODUCT_NAME })).not.toBeVisible();
  });

  test("product creation should fail if no price is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_NAME = `Failed Test Product ${Date.now()}`;
    const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
    const PRODUCT_QUANTITY = "1234";

    // fill in fields in page
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY);

    await page.getByRole("button", { name: /create product/i }).click();

    // no navigation back to products page happens and toast with error message appears
    await expect(page).toHaveURL(/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    // check that product was not created
    await page.goto("/dashboard/admin/products");
    await expect(page.locator('a.product-link', { hasText: PRODUCT_NAME })).not.toBeVisible();
  });

  test("product creation should fail if no quantity is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_NAME = `Failed Test Product ${Date.now()}`;
    const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
    const PRODUCT_PRICE = "123";

    // fill in fields in page
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);

    await page.getByRole("button", { name: /create product/i }).click();

    // no navigation back to products page happens and toast with error message appears
    await expect(page).toHaveURL(/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();

    // check that product was not created
    await page.goto("/dashboard/admin/products");
    await expect(page.locator('a.product-link', { hasText: PRODUCT_NAME })).not.toBeVisible();
  });

  test("product update should fail if no name, description, price or quantity is input", async ({ page }) => {
    // navigate to create product page
    await page.goto("http://localhost:3000/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    const PRODUCT_NAME = `Failed Update Product ${Date.now()}`;
    const PRODUCT_DESC = `Description for ${PRODUCT_NAME}`;
    const PRODUCT_PRICE = "123";
    const PRODUCT_QUANTITY = "1234";

    // ===============================================================================
    // create product
    // ===============================================================================

    // fill in fields in page
    const categoryDropdown = page.locator('.ant-select').first();
    await categoryDropdown.click();
    const option = page.locator('.ant-select-item-option', { hasText: 'Book' });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await page.getByPlaceholder(/write a name/i).fill(PRODUCT_NAME);
    await page.getByPlaceholder(/write a description/i).fill(PRODUCT_DESC);
    await page.getByPlaceholder(/write a price/i).fill(PRODUCT_PRICE);
    await page.getByPlaceholder(/write a quantity/i).fill(PRODUCT_QUANTITY);

    await page.getByRole("button", { name: /create product/i }).click();
    await page.waitForURL("**/dashboard/admin/products");
    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible();

    // ===============================================================================
    // update product (failed scenarios)
    // ===============================================================================

    // navigate to update product page
    const testProductCard = page.locator('a.product-link', { hasText: PRODUCT_NAME });
    await testProductCard.click();
    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

    // no name
    const nameInput = page.getByPlaceholder(/write a name/i);
    await nameInput.click();
    await nameInput.fill("");

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page.getByText(/something went wrong/i).last()).toBeVisible();

    // no description
    await nameInput.click();
    await nameInput.fill(PRODUCT_NAME);

    const descInput = page.getByPlaceholder(/write a description/i);
    await descInput.click();
    await descInput.fill("");

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page.getByText(/something went wrong/i).last()).toBeVisible();

    // no price
    await descInput.click();
    await descInput.fill(PRODUCT_DESC);

    const priceInput = page.getByPlaceholder(/write a price/i);
    await priceInput.click();
    await priceInput.fill("");

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page.getByText(/something went wrong/i).last()).toBeVisible();

    // no quantity
    await priceInput.click();
    await priceInput.fill(PRODUCT_PRICE);

    const quantityInput = page.getByPlaceholder(/write a quantity/i);
    await quantityInput.click();
    await quantityInput.fill("");

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page.getByText(/something went wrong/i).last()).toBeVisible();

    // ===============================================================================
    // delete product
    // ===============================================================================
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await Promise.all([
      page.waitForURL('**/dashboard/admin/products'),
      page.getByRole('button', { name: /delete product/i }).click()
    ]);

    await expect(page.locator('a.product-link', { hasText: PRODUCT_NAME })).not.toBeVisible();
  });
});