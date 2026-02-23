// Daniel Loh, A0252099X

import mongoose from "mongoose";
import Product from "./productModel";

describe("Product Model Validation", () => {

  const validObjectId = new mongoose.Types.ObjectId();

  const validProductData = {
    name: "iPhone",
    slug: "iphone-15",
    description: "Latest Apple phone",
    price: 1500,
    category: validObjectId,
    quantity: 10,
    shipping: true,
  };

  it("should create a valid product", async () => {
    const product = new Product(validProductData);
    await expect(product.validate()).resolves.toBeUndefined();
  });

  it("should fail if name is missing", async () => {
    const product = new Product({ ...validProductData, name: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if slug is missing", async () => {
    const product = new Product({ ...validProductData, slug: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if description is missing", async () => {
    const product = new Product({ ...validProductData, description: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if price is missing", async () => {
    const product = new Product({ ...validProductData, price: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if category is missing", async () => {
    const product = new Product({ ...validProductData, category: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if quantity is missing", async () => {
    const product = new Product({ ...validProductData, quantity: undefined });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if price is not a number", async () => {
    const product = new Product({ ...validProductData, price: "cheap" });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if quantity is not a number", async () => {
    const product = new Product({ ...validProductData, quantity: "many" });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should fail if category is not ObjectId", async () => {
    const product = new Product({ ...validProductData, category: "not-an-id" });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should not allow negative price (this reveals missing min validation)", async () => {
    const product = new Product({ ...validProductData, price: -100 });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should allow negative quantity (this reveals missing min validation)", async () => {
    const product = new Product({ ...validProductData, quantity: -5 });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should allow empty string name (reveals missing trim/minLength)", async () => {
    const product = new Product({ ...validProductData, name: " " });
    await expect(product.validate()).rejects.toThrow();
  });

  it("should allow product without photo", async () => {
    const product = new Product(validProductData);
    await expect(product.validate()).resolves.toBeUndefined();
  });

  it("should allow photo with buffer data", async () => {
    const product = new Product({
      ...validProductData,
      photo: {
        data: Buffer.from("image"),
        contentType: "image/png",
      },
    });
    await expect(product.validate()).resolves.toBeUndefined();
  });

  it("should allow shipping to be undefined", async () => {
    const product = new Product({ ...validProductData, shipping: undefined });
    await expect(product.validate()).resolves.toBeUndefined();
  });

});