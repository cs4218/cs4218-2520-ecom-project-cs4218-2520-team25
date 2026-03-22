import { test, expect } from '@playwright/test';

test.describe('Authentication: Logout Flow', () => {
  const BASE_URL = 'http://localhost:3000';

  /*
   * Verify session termination and redirect.
   */
  test('should_logout_successfully_and_clear_session', async ({ page }) => {
    // --- Arrange ---
    // Log in first to have an active session 
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder('Enter Your Email').fill('awdwd@gmail.com');
    await page.getByPlaceholder('Enter Your Password').fill('kailash');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // Confirm we are logged in and on the homepage
    await expect(page).toHaveURL(BASE_URL + '/');
    const navbar = page.locator('.navbar');
    await expect(navbar.getByText('KAILASH')).toBeVisible();

    // --- Act ---
    await navbar.getByText('KAILASH').click();
    await page.getByRole('link', { name: 'LOGOUT' }).click();

    // --- Assert ---
    await expect(page).toHaveURL(BASE_URL + '/login');

    const authData = await page.evaluate(() => localStorage.getItem('auth'));
    expect(authData).toBeNull();

    await expect(page.getByText('KAILASH')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'LOGIN' })).toBeVisible();
  });
});