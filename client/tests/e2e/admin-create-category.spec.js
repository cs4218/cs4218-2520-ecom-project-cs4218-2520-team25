import { test, expect } from '@playwright/test';

// Daniel Loh, A0252099X

// Helper: log in as admin and open the Create Category page
async function loginAndOpenCreateCategory(page) {
  await page.goto(`/`);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('daniel.loh@gmail.com');
  await page.getByRole('textbox', { name: 'Enter Your Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('test');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.getByRole('button', { name: 'Daniel Loh' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Create Category' }).click();
}

// Helper: create one or more categories via the Create Category form
async function createCategories(page, names) {
  for (const name of names) {
    await page.getByRole('textbox', { name: 'Enter new category' }).click();
    await page.getByRole('textbox', { name: 'Enter new category' }).press('ControlOrMeta+a');
    await page.getByRole('textbox', { name: 'Enter new category' }).fill(name);
    await page.getByRole('button', { name: 'Submit' }).click();
  }
}

async function clearTestCategories(page) {
  await page.goto(`dashboard/admin/create-category`)

  const catA = page.locator('tbody tr', { hasText: 'CategoryA' });
  await expect(catA).toBeVisible();
  await catA.getByRole('button', { name: 'Delete' }).click();
  const catB = page.locator('tbody tr', { hasText: 'CategoryB' });
  await expect(catB).toBeVisible();
  await catB.getByRole('button', { name: 'Delete' }).click();
  const catC = page.locator('tbody tr', { hasText: 'CategoryC' });
  await expect(catC).toBeVisible();
  await catC.getByRole('button', { name: 'Delete' }).click();
}

test.describe('Admin - Create Category Flow', () => {
  // ensure no auth state leaks between tests
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/`);
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) { }
    });
  });

  test('admin logs in, creates multiple categories, and verifies them in the list', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['CategoryA', 'CategoryB', 'CategoryC'])

    // verify categories exist in the list
    await expect(page.getByRole('cell', { name: 'CategoryB' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CategoryC' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CategoryA' })).toBeVisible();

    await clearTestCategories(page);
  });

  test('check category exist in  homepage', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['CategoryA', 'CategoryB', 'CategoryC'])

    // verify in homepage

    await page.getByRole('link', { name: '🛒 Virtual Vault' }).click();
    await expect(page.getByRole('main').getByText('CategoryA', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('CategoryB', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('CategoryC', { exact: true })).toBeVisible();

    await clearTestCategories(page);
  });

  test('check category exist in dropdown', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['CategoryA', 'CategoryB', 'CategoryC'])

    // verify in drop down
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page.getByRole('link', { name: 'CategoryA' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CategoryB' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CategoryC' })).toBeVisible();

    await clearTestCategories(page);
  });

  test('check category navigation is correct by dropdown', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['CategoryA', 'CategoryB', 'CategoryC'])

    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'CategoryA' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryA');
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'CategoryB' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryB');
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'CategoryC' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryC');

    await clearTestCategories(page);
  });

  test('check category navigation is correct by categories page', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['CategoryA', 'CategoryB', 'CategoryC'])

    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'All Categories' }).clic
    await expect(page.getByRole('main')).toContainText('CategoryA');
    await expect(page.getByRole('main')).toContainText('CategoryB');
    await expect(page.getByRole('main')).toContainText('CategoryC');
    await page.getByRole('link', { name: 'CategoryA' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryA');
    await page.goto('http://localhost:3000/categories');
    await page.getByRole('link', { name: 'CategoryB' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryB');
    await page.goto('http://localhost:3000/categories');
    await page.getByRole('link', { name: 'CategoryC' }).click();
    await expect(page.getByRole('main')).toContainText('Category - CategoryC');

    await clearTestCategories(page);
  });

  test('admin can update category', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['Test'])


    // click the Edit button for the row that contains the category named 'Test'
    const testRow = page.locator('tbody tr', { hasText: 'Test' });
    await expect(testRow).toBeVisible();
    await testRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).press('ControlOrMeta+a');
    await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill('UpdatedTest');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('tbody')).toContainText('UpdatedTest');
  });

  test('admin can delete category', async ({ page }) => {
    await loginAndOpenCreateCategory(page)

    await page.getByRole('button', { name: 'Daniel Loh' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // create categories
    await createCategories(page, ['UpdatedTest'])

    // Delete category
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await expect(page.locator('tbody')).not.toHaveText('UpdatedTest');
  });
});