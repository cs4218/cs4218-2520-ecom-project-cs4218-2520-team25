import { test, expect } from '@playwright/test';

test.describe('Login Flow: Login -> Home', () => {

  const BASE_URL = 'http://localhost:3000';

  /**
   * Valid User
   */
  test('should_successfully_login_and_load_real_home_page_data', async ({ page }) => {
    // --- Arrange --- 
    await page.goto(`${BASE_URL}/login`);

    // --- Act ---
    await page.getByPlaceholder('Enter Your Email').fill('awdwd@gmail.com');
    await page.getByPlaceholder('Enter Your Password').fill('kailash');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // --- Assert ---
    // 1. Verify URL and Navigation to Home
    await expect(page).toHaveURL(BASE_URL + '/');

    // 2. TOP NAVBAR CHECK (Based on your screenshot)
    const navbar = page.locator('.navbar'); 
    await expect(navbar.getByText('KAILASH')).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'CART' })).toBeVisible();
    
    // Verify user-specific item in navbar (the dropdown showing "KAILASH")
    await expect(page.getByText('KAILASH', { exact: false })).toBeVisible();
    
    // Verify Cart link is present
    await expect(page.getByRole('link', { name: 'CART' })).toBeVisible();

    // 3. FILTER SIDEBAR CHECK
    // Verify "Filter By Category" heading exists
    const sidebar = page.locator('.filters'); 
    
    await expect(sidebar.getByRole('heading', { name: 'Filter By Category' })).toBeVisible();
    
    await expect(sidebar.getByText('Book', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Clothing', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Electronics', { exact: true })).toBeVisible();
    await expect(sidebar.getByRole('heading', { name: 'Filter By Price' })).toBeVisible();
    
    // Verify Reset Button is visible at the bottom of the sidebar
    await expect(page.getByRole('button', { name: 'RESET FILTERS' })).toBeVisible();
  });


  /**
   * Invalid Input
   */
  test('should_prevent_access_and_show_error_with_wrong_credentials', async ({ page }) => {
    // --- Arrange ---
await page.goto(`${BASE_URL}/login`);

    // --- Act ---
    // Fill in credentials that do not exist in your real database
    await page.getByPlaceholder('Enter Your Email').fill('nonexistent@user.com');
    await page.getByPlaceholder('Enter Your Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // --- Assert ---
    const errorMessage = page.locator('text=Invalid email or password').or(page.locator('text=Something went wrong'));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // 2. Verify State: 
    await expect(page).toHaveURL(`${BASE_URL}/login`);

    // 3. Verify Input Persistence: 
    await expect(page.getByPlaceholder('Enter Your Email')).toHaveValue('nonexistent@user.com');
  });

});