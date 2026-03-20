import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js";
import productModel from "../../models/productModel.js";

// Han Tae Won (A0021684E)

describe("Product Photo API integration", () => {
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