const { test, expect } = require("@playwright/test");

async function mockCommonApi(page) {
  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: [] }),
    });
  });
}

test.describe("Miscellanous pages UI tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApi(page);
  });

  // Owen Yeo Le Yang A0252047L
  test("Contact page renders contact info", async ({ page }) => {
    await page.goto("/contact");

    await expect(page).toHaveURL(/\/contact$/);
    await expect(page).toHaveTitle(/contact us/i);
    await expect(
      page.getByRole("heading", { name: "CONTACT US", exact: true })
    ).toBeVisible();
    await expect(page.getByText("www.help@ecommerceapp.com")).toBeVisible();
    await expect(page.getByText("012-3456789")).toBeVisible();
    await expect(page.getByText("1800-0000-0000")).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("Contact button from homepage navigates to contact page", async ({page}) => {
    await page.goto("/");

    await page.getByRole("link", {name: /Contact/i} ).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page).toHaveTitle(/contact us/i);
    await expect(
      page.getByRole("heading", { name: "CONTACT US", exact: true })
    ).toBeVisible();
    await expect(page.getByText("www.help@ecommerceapp.com")).toBeVisible();
    await expect(page.getByText("012-3456789")).toBeVisible();
    await expect(page.getByText("1800-0000-0000")).toBeVisible();

  })

  // Owen Yeo Le Yang A0252047L
  test("About page renders about content", async ({ page }) => {
    await page.goto("/about");
    
    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle(/about us - ecommerce app/i);
    await expect(page.getByText("Add text")).toBeVisible();
    await expect(page.locator('img[alt="contactus"]')).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("About button in footer navigates to About page", async ({page}) => {
    await page.goto("/");
    await page.getByRole("link", {name: /About/i} ).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle(/about us - ecommerce app/i);
    await expect(page.getByText("Add text")).toBeVisible();
    await expect(page.locator('img[alt="contactus"]')).toBeVisible();
  })

  // Owen Yeo Le Yang A0252047L
  test("Policy page renders privacy policy content", async ({ page }) => {
    await page.goto("/policy");

    await expect(page).toHaveURL(/\/policy$/);
    await expect(page).toHaveTitle(/privacy policy/i);
    await expect(page.getByText("add privacy policy").first()).toBeVisible();
    await expect(page.locator("text=add privacy policy")).toHaveCount(7);
  });

  test("Policy button in footer navigates to Policy page", async ({page}) => {
    await page.goto("/");
    await page.getByRole("link", {name: /Policy/i} ).click();

    await expect(page).toHaveURL(/\/policy$/);
    await expect(page).toHaveTitle(/privacy policy/i);
    await expect(page.getByText("add privacy policy").first()).toBeVisible();
    await expect(page.locator("text=add privacy policy")).toHaveCount(7);
  });


  // Owen Yeo Le Yang A0252047L
  test("Unknown route renders page not found", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(page).toHaveURL(/\/this-route-does-not-exist$/);
    await expect(page).toHaveTitle(/go back- page not found/i);
    await expect(
      page.getByRole("heading", { name: "Oops ! Page Not Found", exact: true })
    ).toBeVisible();
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Back" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
