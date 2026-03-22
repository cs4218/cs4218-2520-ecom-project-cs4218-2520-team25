// Kailashwaran, A0253385Y

import { test, expect } from '@playwright/test';

test.describe('Dashboard UI Integration', () => {

  const mockUser = {
    email: "user@test.com",
    password: "user",
    name: "userTest",
    address: "testadd"
  };

  test('test_manual_navigation_and_ui_consistency', async ({ page }) => {
    // 1. Step: Perform Login to establish the real session
    await page.goto('http://localhost:3000/login');
    await page.locator('input[type="email"]').fill(mockUser.email);
    await page.locator('input[type="password"]').fill(mockUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();

    await expect(page.getByText('login successfully')).toBeVisible();

    // This tests if the AuthContext persists the state across a hard navigation
    await page.goto('http://localhost:3000/dashboard/user');

    // 3. UI Assertion: Layout & UserMenu Integration
    const sidebar = page.locator('.col-md-3');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Profile')).toBeVisible();
    await expect(sidebar.getByText('Orders')).toBeVisible();

    // 4. UI Assertion: Content Card
    const infoCard = page.locator('.card');
    await expect(infoCard).toBeVisible();
    
    // Check for specific text content mapped in <h3> tags
    await expect(infoCard.locator('h3').filter({ hasText: mockUser.name })).toBeVisible();
    await expect(infoCard.locator('h3').filter({ hasText: mockUser.email })).toBeVisible();
    await expect(infoCard.locator('h3').filter({ hasText: mockUser.address })).toBeVisible();

    // 5. Global UI: Layout Title
    await expect(page).toHaveTitle('Dashboard - Ecommerce App');
  });
});


test.describe('User Profile UI Integration', () => {

  const mockUser = {
    email: "user@test.com",
    password: "user",
    name: "userTest",
    address: "testadd",
    phone: "user@test.com" 
  };

  test('test_navigation_to_profile_and_ui_layout', async ({ page }) => {
    // 1. Step: Login to establish session
    await page.goto('http://localhost:3000/login');
    await page.locator('input[type="email"]').fill(mockUser.email);
    await page.locator('input[type="password"]').fill(mockUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await expect(page.getByText('login successfully')).toBeVisible();

    // 2. Step: Navigate to Dashboard and Click "Profile" in Sidebar
    await page.goto('http://localhost:3000/dashboard/user');
    const profileLink = page.locator('.list-group-item', { hasText: 'Profile' });
    await profileLink.click();

    // 3. UI Assertion: Verify Header & Form Container
    await expect(page).toHaveURL(/.*profile/);
    await expect(page.locator('h4.title')).toHaveText('USER PROFILE');

    // 4. UI Assertion: Verify Form Fields are Populated 
    await expect(page.locator('input[placeholder="Enter Your Name"]')).toHaveValue(mockUser.name);
    await expect(page.locator('input[placeholder="Enter Your Email "]')).toHaveValue(mockUser.email);
    await expect(page.locator('input[placeholder="Enter Your Phone"]')).toHaveValue(mockUser.phone);
    await expect(page.locator('input[placeholder="Enter Your Address"]')).toHaveValue(mockUser.address);

    // 5. UI Assertion: State Check
    await expect(page.locator('input[placeholder="Enter Your Email "]')).toBeDisabled();

    // 6. UI Assertion: Footer Integration
    const footer = page.locator('.footer'); 
    await expect(page.getByText('All Rights Reserved © TestingComp')).toBeVisible();
    const aboutLink = page.getByRole('link', { name: 'About' });
    const contactLink = page.getByRole('link', { name: 'Contact' });
    const privacyLink = page.getByRole('link', { name: 'Privacy Policy' });

    await expect(aboutLink).toBeVisible();
    await expect(contactLink).toBeVisible();
    await expect(privacyLink).toBeVisible();
  });
});