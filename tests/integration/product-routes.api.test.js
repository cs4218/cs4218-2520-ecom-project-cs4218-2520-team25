import request from "supertest";
import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import app from "../../app.js";
import productModel from "../../models/productModel.js";
import userModel from "../../models/userModel.js";
import { hashPassword } from "../../helpers/authHelper.js";
import categoryModel from "../../models/categoryModel.js";

describe("Product Routes API Integration", () => {

  let admin;
  let token;
  let category;

  beforeEach(async () => {
    // create admin user
    admin = await new userModel({
      name: "Admin User",
      email: "admin@test.com",
      password: await hashPassword("P@ssw0rd123"),
      phone: "91234567",
      address: "Admin Address",
      answer: "admin-answer",
      role: 1,
    }).save();

    token = JWT.sign(
      { _id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    category = await new categoryModel({
      name: "Test Category",
      slug: "test-category",
    }).save();
  });

  // =======================================================
  // TESTS
  // =======================================================
  
  // Danielle Loh, A0257220N
  test("POST /api/v1/product/create-product should create a product if user is logged in as admin", async () => {
    const res = await request(app)
      .post("/api/v1/product/create-product")
      .set("Authorization", token)
      .field("name", "Test Product")
      .field("description", "Test description")
      .field("price", 100)
      .field("quantity", 10)
      .field("category", category._id.toString());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // Danielle Loh, A0257220N
  test("PUT /api/v1/product/update-product/:pid should update a product if user is logged in as admin", async () => {
    const product = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 100,
      category: category._id,
      quantity: 10,
    }).save();
    
    const res = await request(app)
      .put(`/api/v1/product/update-product/${product._id}`)
      .set("Authorization", token)
      .field("name", "Updated Product")
      .field("description", "Updated test description")
      .field("price", 200)
      .field("quantity", 10)
      .field("category", category._id.toString());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // Danielle Loh, A0257220N
  test("GET /api/v1/product/get-product should return all products", async () => {
    const product = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 100,
      category: category._id,
      quantity: 10,
    }).save();

    const res = await request(app).get(`/api/v1/product/get-product`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  // Danielle Loh, A0257220N
  test("GET /api/v1/product/get-product/:slug should return a single product", async () => {
    const product = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 100,
      category: category._id,
      quantity: 10,
    }).save();

    const res = await request(app).get(`/api/v1/product/get-product/test-product`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.name).toBe("Test Product");
  });

  // Danielle Loh, A0257220N
  test("DELETE /api/v1/product/delete-product/:pid should delete product", async () => {
    const product = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 100,
      category: category._id,
      quantity: 10,
    }).save();

    const res = await request(app).delete(`/api/v1/product/delete-product/${product._id}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await productModel.findById(product._id);
    expect(deleted).toBeNull();
  });

  // Han Tae Won (A0021684E)
  test("GET /api/v1/product/product-photo/:pid returns image with correct content-type", async () => {
    // fake image buffer
    const fakeImage = Buffer.from("fake-image-data");

    // create product with photo
    const product = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "Test description",
      price: 100,
      category: new mongoose.Types.ObjectId(),
      quantity: 10,
      photo: {
        data: fakeImage,
        contentType: "image/png",
      },
    }).save();

    // call API
    const res = await request(app)
      .get(`/api/v1/product/product-photo/${product._id}`);

    // assertions
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.body).toBeDefined();
  });
});
