import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow: Register -> Login -> Home', () => {

  const BASE_URL = 'http://localhost:3000';
  const UNIQUE_EMAIL = `testuser_${Date.now()}@example.com`;
  const PASSWORD = 'TestPassword123';
  const EXISTING_EMAIL = 'awdwd@gmail.com'; 
  const EXISTING_PASSWORD = 'kailash';

  test('should_register_new_user_login_and_verify_homepage', async ({ page }) => {
    
    // --- 1. ARRANGE: Go to Register Page ---
    await page.goto(`${BASE_URL}/register`);

    // --- 2. ACT: Registration ---
    await page.getByPlaceholder('Enter Your Name').fill('Kailash');
    await page.getByPlaceholder('Enter Your Email').fill(UNIQUE_EMAIL);
    await page.getByPlaceholder('Enter Your Password').fill(PASSWORD);
    await page.getByPlaceholder('Enter Your Phone').fill('1234567890');
    await page.getByPlaceholder('Enter Your Address').fill('123 Test Street, Singapore');
    
    // Date of birth 
    await page.locator('input[type="date"]').fill('1995-01-01');
    
    // Security Question
    await page.getByPlaceholder('What is Your Favorite sports').fill('Basketball');

    // Submit Registration
    await page.getByRole('button', { name: 'REGISTER' }).click();

    // --- 3. ASSERT: Registration Success ---
    // Check for success toast or redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);


    // --- 4. ACT: Login with new credentials ---
    await page.getByPlaceholder('Enter Your Email').fill(UNIQUE_EMAIL);
    await page.getByPlaceholder('Enter Your Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'LOGIN' }).click();


    // --- 5. ASSERT: Homepage State ---
    // Verify landing on homepage
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Verify Navbar shows the registered user's name
    const navbar = page.locator('.navbar');
    await expect(navbar.getByText('KAILASH')).toBeVisible();

    // Verify Sidebar filters are present (Integration check)
    const sidebar = page.locator('.filters');
    await expect(sidebar.getByRole('heading', { name: 'Filter By Category' })).toBeVisible();

    // Verify Product List has loaded from the database
    const productCard = page.locator('.card').first();
    await expect(productCard).toBeVisible();
  });

  test('should_fail_registration_when_email_already_exists', async ({ page }) => {
    // --- Arrange ---
    await page.goto(`${BASE_URL}/register`);

    // --- Act ---
    await page.getByPlaceholder('Enter Your Name').fill('Duplicate User');
    await page.getByPlaceholder('Enter Your Email').fill(EXISTING_EMAIL);
    await page.getByPlaceholder('Enter Your Password').fill(EXISTING_PASSWORD);
    await page.getByPlaceholder('Enter Your Phone').fill('00000000');
    await page.getByPlaceholder('Enter Your Address').fill('Duplicate St');
    await page.getByPlaceholder('What is Your Favorite sports').fill('None');
    
    await page.getByRole('button', { name: 'REGISTER' }).click();

    // --- Assert ---
    // Verify that the user is NOT redirected to Login
    await expect(page).toHaveURL(`${BASE_URL}/register`);
    
    // Verify that the email field still contains the duplicate email
    await expect(page.getByPlaceholder('Enter Your Email')).toHaveValue(EXISTING_EMAIL);
  });

});