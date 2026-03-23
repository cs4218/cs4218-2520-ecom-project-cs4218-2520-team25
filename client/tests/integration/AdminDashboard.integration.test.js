const { test, expect } = require("@playwright/test");

// Danielle Loh, A0257220N

test.describe("AdminDashboard UI Integration", () => {
  test("should be able to view admin info from localStorage via useAuth", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: "admin-fake-token-123",
          user: {
            _id: "admin123",
            name: "Admin User",
            email: "admin@test.com",
            phone: "91235678",
            role: 1,
          },
        })
      );
    });

    await page.route("**/api/v1/auth/admin-auth", async (route) => {
      const headers = route.request().headers();
      expect(headers["authorization"]).toBe("admin-fake-token-123");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/dashboard/admin");

    await expect(page.getByText(/Admin Name : Admin User/i)).toBeVisible();
    await expect(page.getByText(/Admin Email : admin@test.com/i)).toBeVisible();
    await expect(page.getByText(/Admin Contact : 91235678/i)).toBeVisible();
  });

  test("handles missing auth safely -> redirects user to login page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("auth");
    });

    await page.goto("/dashboard/admin");

    await expect(page).toHaveURL(/\/login/);
  });
});