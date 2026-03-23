const { test, expect } = require("@playwright/test");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const resolveMongoUrl = () => {
  const fromEnv = process.env.MONGO_URL?.trim();
  if (fromEnv && /^(mongodb|mongodb\+srv):\/\//.test(fromEnv)) return fromEnv;

  try {
    const envRaw = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const line = envRaw
      .split(/\r?\n/)
      .find((l) => /^\s*MONGO_URL\s*=/.test(l));
    if (!line) return null;
    const value = line.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
    if (/^(mongodb|mongodb\+srv):\/\//.test(value)) return value;
  } catch (error) {
    return null;
  }

  return null;
};

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgRimG8QAAAAASUVORK5CYII=",
  "base64"
);

const baseCategories = [
  { _id: "cat1", name: "Phones", slug: "phones" },
  { _id: "cat2", name: "Accessories", slug: "accessories" },
];

const baseHomeProducts = [
  {
    _id: "prod1",
    name: "Alpha Phone",
    slug: "alpha-phone",
    description: "Flagship smartphone with great battery",
    price: 999.99,
    category: "cat1",
  },
  {
    _id: "prod2",
    name: "Gamma Headphones",
    slug: "gamma-headphones",
    description: "Wireless headphones with noise cancellation",
    price: 199.5,
    category: "cat2",
  },
];

const filteredProducts = [
  {
    _id: "prod3",
    name: "Budget Phone",
    slug: "budget-phone",
    description: "Affordable smartphone for daily use",
    price: 299.0,
    category: "cat1",
  },
];

const searchResults = [
  {
    _id: "prod1",
    name: "Alpha Phone",
    slug: "alpha-phone",
    description: "Flagship smartphone with great battery",
    price: 999.99,
  },
  {
    _id: "prod4",
    name: "Alpha Case",
    slug: "alpha-case",
    description: "Protective case for Alpha Phone",
    price: 39.0,
  },
];

const singleProduct = {
  _id: "prod1",
  name: "Alpha Phone",
  slug: "alpha-phone",
  description: "Flagship smartphone with great battery",
  price: 999.99,
  category: { _id: "cat1", name: "Phones", slug: "phones" },
};

const relatedProducts = [
  {
    _id: "prod5",
    name: "Alpha Phone Mini",
    slug: "alpha-phone-mini",
    description: "Compact version of Alpha Phone",
    price: 799.0,
    category: { _id: "cat1", name: "Phones", slug: "phones" },
  },
];

async function mockSearchFlowApis(
  page,
  {
    categories = baseCategories,
    homeProducts = baseHomeProducts,
    total = 5,
    filtersResponse = filteredProducts,
    searchResponse = searchResults,
    productResponse = singleProduct,
    relatedResponse = relatedProducts,
    onFiltersRequest,
    onSearchRequest,
    onProductListRequest,
    onSingleProductRequest,
    onRelatedRequest,
  } = {}
) {
  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: categories }),
    });
  });

  await page.route("**/api/v1/product/product-count", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, total }),
    });
  });

  await page.route("**/api/v1/product/product-list/*", async (route) => {
    if (onProductListRequest) onProductListRequest(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, products: homeProducts }),
    });
  });

  await page.route("**/api/v1/product/product-filters", async (route) => {
    if (onFiltersRequest) onFiltersRequest(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, products: filtersResponse }),
    });
  });

  await page.route("**/api/v1/product/search/*", async (route) => {
    if (onSearchRequest) onSearchRequest(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.route("**/api/v1/product/get-product/*", async (route) => {
    if (onSingleProductRequest) onSingleProductRequest(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, product: productResponse }),
    });
  });

  await page.route("**/api/v1/product/related-product/*/*", async (route) => {
    if (onRelatedRequest) onRelatedRequest(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, products: relatedResponse }),
    });
  });

  await page.route("**/api/v1/product/product-photo/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: tinyPng,
    });
  });
}

test.describe("Search flow UI integration - mocked comprehensive tests", () => {
  // Owen Yeo Le Yang A0252047L
  test("test HomePage applies selected filters and shows filtered products", async ({ page }) => {
    let filtersPayload;
    await mockSearchFlowApis(page, {
      onFiltersRequest: (payload) => {
        filtersPayload = payload;
      },
    });

    await page.goto("/");
    await page.getByRole("checkbox", { name: "Phones" }).check();

    await expect(page.getByText("Budget Phone")).toBeVisible();
    expect(filtersPayload.checked).toContain("cat1");
    expect(filtersPayload.radio).toEqual([]);
  });

  // Owen Yeo Le Yang A0252047L
  test("test HomePage uses product count to show load more when applicable", async ({ page }) => {
    await mockSearchFlowApis(page, { total: 10, homeProducts: baseHomeProducts });

    await page.goto("/");

    await expect(page.getByRole("button", { name: /loadmore/i })).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("test HomePage retrieves and renders initial product list", async ({ page }) => {
    let productListUrl = "";
    await mockSearchFlowApis(page, {
      onProductListRequest: (url) => {
        productListUrl = url;
      },
    });

    await page.goto("/");

    await expect(page.getByText("Alpha Phone", { exact: true })).toBeVisible();
    await expect(page.getByText("Gamma Headphones", { exact: true })).toBeVisible();
    expect(productListUrl).toContain("/api/v1/product/product-list/1");
  });

  // Owen Yeo Le Yang A0252047L
  test("test HomePage retrieves categories and renders filter checkboxes", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/");

    await expect(page.getByRole("checkbox", { name: "Phones" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Accessories" })).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("test HomePage search updates shared search state and navigates to results", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/");
    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText("Found 2")).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toHaveValue("alpha");
  });

  // Owen Yeo Le Yang A0252047L
  test("test HomePage product cards render images from product photo API", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/");

    const image = page.locator(`img[alt="${baseHomeProducts[0].name}"]`);
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${baseHomeProducts[0]._id}`
    );
  });

  // Owen Yeo Le Yang A0252047L
  test("test SearchInput submits keyword and retrieves matching products", async ({ page }) => {
    let searchUrl = "";
    await mockSearchFlowApis(page, {
      onSearchRequest: (url) => {
        searchUrl = url;
      },
    });

    await page.goto("/about");
    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/search$/);
    expect(searchUrl).toContain("/api/v1/product/search/alpha");
  });

  // Owen Yeo Le Yang A0252047L
  test("test SearchInput persists keyword through shared search state", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/contact");
    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page.getByText("Found 2")).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toHaveValue("alpha");
  });

  // Owen Yeo Le Yang A0252047L
  test("test Search page reflects shared search state and renders results", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/search");
    await expect(page.getByText("No Products Found")).toBeVisible();

    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();
    await expect(page.getByText("Found 2")).toBeVisible();
    await expect(page.getByText("Alpha Phone", { exact: true })).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("test Search page renders result images from product photo API", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/");
    await page.getByPlaceholder(/search/i).fill("alpha");
    await page.getByRole("button", { name: /^search$/i }).click();

    const searchImage = page.locator(`img[alt="${searchResults[0].name}"]`);
    await expect(searchImage).toBeVisible();
    await expect(searchImage).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${searchResults[0]._id}`
    );
  });

  // Owen Yeo Le Yang A0252047L
  test("test ProductDetails page retrieves related products and displays them", async ({ page }) => {
    let relatedUrl = "";
    await mockSearchFlowApis(page, {
      onRelatedRequest: (url) => {
        relatedUrl = url;
      },
    });

    await page.goto("/product/alpha-phone");

    await expect(page.getByRole("heading", { name: /similar products/i })).toBeVisible();
    await expect(page.getByText("Alpha Phone Mini", { exact: true })).toBeVisible();
    expect(relatedUrl).toContain("/api/v1/product/related-product/prod1/cat1");
  });

  // Owen Yeo Le Yang A0252047L
  test("test ProductDetails page renders main and related product images", async ({ page }) => {
    await mockSearchFlowApis(page);

    await page.goto("/product/alpha-phone");

    const mainImage = page.locator(`img[alt="${singleProduct.name}"]`).first();
    await expect(mainImage).toBeVisible();
    await expect(mainImage).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${singleProduct._id}`
    );

    const relatedImage = page.locator(`img[alt="${relatedProducts[0].name}"]`);
    await expect(relatedImage).toBeVisible();
    await expect(relatedImage).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${relatedProducts[0]._id}`
    );
  });

  // Owen Yeo Le Yang A0252047L
  test("test ProductDetails page retrieves and displays product details by slug", async ({ page }) => {
    let singleProductUrl = "";
    await mockSearchFlowApis(page, {
      onSingleProductRequest: (url) => {
        singleProductUrl = url;
      },
    });

    await page.goto("/product/alpha-phone");

    await expect(page.getByText(/Name : Alpha Phone/i)).toBeVisible();
    await expect(page.getByText(/Description : Flagship smartphone/i)).toBeVisible();
    await expect(page.getByText(/Category : Phones/i)).toBeVisible();
    expect(singleProductUrl).toContain("/api/v1/product/get-product/alpha-phone");
  });
});

test.describe("Search E2E tests", () => {
  const runId = `pw${Date.now()}`;
  const keyword = `e2ealpha${runId}`;
  const mainName = `${keyword} phone`;
  const relatedName = `${keyword} case`;
  const mainSlug = `${keyword}-phone`;
  const relatedSlug = `${keyword}-case`;
  const unavailableKeyword = `no-match-${runId}`;

  let client;
  let db;
  let useSeededData = false;
  let seeded = {
    categoryId: null,
    mainId: null,
    relatedId: null,
    otherId: null,
  };

  test.beforeAll(async () => {
    const mongoUrl = resolveMongoUrl();
    if (!mongoUrl) return;

    client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db();
    useSeededData = true;

    await db
      .collection("products")
      .deleteMany({ slug: { $regex: runId, $options: "i" } });
    await db
      .collection("categories")
      .deleteMany({ slug: { $regex: runId, $options: "i" } });

    seeded.categoryId = new ObjectId();
    seeded.mainId = new ObjectId();
    seeded.relatedId = new ObjectId();
    seeded.otherId = new ObjectId();

    await db.collection("categories").insertOne({
      _id: seeded.categoryId,
      name: `Search Category ${runId}`,
      slug: `search-category-${runId}`,
    });

    const now = new Date();
    const photoData = Buffer.from("search-e2e-image");

    await db.collection("products").insertMany([
      {
        _id: seeded.mainId,
        name: mainName,
        slug: mainSlug,
        description: `Main searchable product ${runId} with camera and battery`,
        price: 1299,
        category: seeded.categoryId,
        quantity: 20,
        shipping: true,
        photo: {
          data: photoData,
          contentType: "image/png",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: seeded.relatedId,
        name: relatedName,
        slug: relatedSlug,
        description: `Related accessory for ${mainName}`,
        price: 39,
        category: seeded.categoryId,
        quantity: 50,
        shipping: true,
        photo: {
          data: photoData,
          contentType: "image/png",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: seeded.otherId,
        name: `irrelevant-${runId}`,
        slug: `irrelevant-${runId}`,
        description: "Noise product for search e2e",
        price: 10,
        category: seeded.categoryId,
        quantity: 5,
        shipping: true,
        photo: {
          data: photoData,
          contentType: "image/png",
        },
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  test.afterAll(async () => {
    if (db) {
      await db.collection("products").deleteMany({
        _id: { $in: [seeded.mainId, seeded.relatedId, seeded.otherId].filter(Boolean) },
      });
      await db.collection("categories").deleteMany({
        _id: { $in: [seeded.categoryId].filter(Boolean) },
      });
    }
    if (client) {
      await client.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("cart");
      localStorage.removeItem("search");
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("test search existing product displays results on search page", async ({ page }) => {
    await page.goto("/");

    let keywordToSearch = keyword;
    let expectedResultName = mainName;

    if (!useSeededData) {
      const firstProductTitle = page.locator(".card .card-title").first();
      const firstProductName = (await firstProductTitle.textContent())?.trim();
      keywordToSearch = firstProductName ? firstProductName.split(/\s+/)[0] : "";
      expectedResultName = firstProductName || "";
      if (!keywordToSearch) {
        test.skip(true, "No searchable product found and no seeded DB data available.");
      }
    }

    await page.getByPlaceholder(/search/i).fill(keywordToSearch);
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: /search results/i })).toBeVisible();
    await expect(page.getByText(/Found\s+\d+/i)).toBeVisible();
    await expect(page.getByText("No Products Found")).not.toBeVisible();
    await expect(page.getByText(expectedResultName, { exact: false }).first()).toBeVisible();
  });

  // Owen Yeo Le Yang A0252047L
  test("test search unavailable product shows no products found", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder(/search/i).fill(unavailableKeyword);
    await page.getByRole("button", { name: /^search$/i }).click();

    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText("No Products Found")).toBeVisible();
    await expect(page.locator(".card.m-2")).toHaveCount(0);
  });

  test("test search results add to cart updates badge and local storage", async ({ page }) => {
    await page.goto("/");

    let keywordToSearch = keyword;
    if (!useSeededData) {
      const firstProductTitle = page.locator(".card .card-title").first();
      const firstProductName = (await firstProductTitle.textContent())?.trim();
      keywordToSearch = firstProductName ? firstProductName.split(/\s+/)[0] : "";
      if (!keywordToSearch) {
        test.skip(true, "No searchable product found and no seeded DB data available.");
      }
    }

    await page.getByPlaceholder(/search/i).fill(keywordToSearch);
    await page.getByRole("button", { name: /^search$/i }).click();

    const resultCard = useSeededData
      ? page.locator(".card.m-2", { hasText: mainName }).first()
      : page.locator(".card.m-2").first();
    await resultCard.getByRole("button", { name: "ADD TO CART" }).click();

    await expect(page.locator(".ant-badge-count", { hasText: "1" })).toBeVisible();

    const cartItems = await page.evaluate(() => {
      const raw = localStorage.getItem("cart");
      return raw ? JSON.parse(raw) : [];
    });
    expect(cartItems.length).toBeGreaterThan(0);
    if (useSeededData) {
      expect(cartItems[0].name.toLowerCase()).toContain(keyword.toLowerCase());
    }
  });

  // Owen Yeo Le Yang A0252047L
  test("test search results more details navigates to product page", async ({ page }) => {
    await page.goto("/");

    let keywordToSearch = keyword;
    if (!useSeededData) {
      const firstProductTitle = page.locator(".card .card-title").first();
      const firstProductName = (await firstProductTitle.textContent())?.trim();
      keywordToSearch = firstProductName ? firstProductName.split(/\s+/)[0] : "";
      if (!keywordToSearch) {
        test.skip(true, "No searchable product found and no seeded DB data available.");
      }
    }

    await page.getByPlaceholder(/search/i).fill(keywordToSearch);
    await page.getByRole("button", { name: /^search$/i }).click();

    const resultCard = useSeededData
      ? page.locator(".card.m-2", {
          has: page.locator(".card-title", { hasText: mainName }),
        }).first()
      : page.locator(".card.m-2").first();
    await resultCard.getByRole("button", { name: /more details/i }).click();

    if (useSeededData) {
      await expect(page).toHaveURL(new RegExp(`/product/${mainSlug}$`));
      await expect(page.getByText(new RegExp(`Name\\s*:\\s*${keyword}`, "i"))).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/product\//);
      await expect(page.getByRole("heading", { name: /product details/i })).toBeVisible();
    }
  });

  // Owen Yeo Le Yang A0252047L
  test("test product details page shows related products from same category", async ({ page }) => {
    if (!useSeededData) {
      test.skip(true, "Seeded DB data unavailable for deterministic related-product assertion.");
    }

    await page.goto(`/product/${mainSlug}`);

    await expect(page.getByRole("heading", { name: /similar products/i })).toBeVisible();
    await expect(page.getByText(relatedName, { exact: false })).toBeVisible();
  });
});
