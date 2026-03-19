import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";
import { getProductController } from "./productController";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  jest.spyOn(console, 'log').mockImplementation(() => {}); // silence console.log
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log.mockRestore();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (let key in collections) {
    await collections[key].deleteMany({});
  }
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// ===========================================================
// TESTS
// ===========================================================

// Danielle Loh, A0257220N
describe("getProductController Integration Test (with productModel)", () => {
  test("should return all products when products exist", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const products = [
      {
        name: "Product 1",
        slug: "product-1",
        description: "Description 1",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true,
      },
      {
        name: "Product 2",
        slug: "product-2",
        description: "Description 2",
        price: 200,
        category: category._id,
        quantity: 2000,
        shipping: false,
      }, 
    ];
    await productModel.create(products[0]);
    await productModel.create(products[1]);

    const res = mockResponse();
    await getProductController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();

    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.countTotal).toBe(2);

    // controller sorts by createdAt
    // so last product inserted should be at the start of the list
    const firstProduct = responseData.products[0].toObject();
    expect(firstProduct.name).toBe(products[products.length - 1].name);
    expect(firstProduct.slug).toBe(products[products.length - 1].slug);
    expect(firstProduct.description).toBe(products[products.length - 1].description);
    expect(firstProduct.price).toBe(products[products.length - 1].price);
    expect(firstProduct.category.name).toBe("Electronics");
    expect(firstProduct.quantity).toBe(products[products.length - 1].quantity);
    expect(firstProduct.shipping).toBe(products[products.length - 1].shipping);
    expect(firstProduct.photo).toBeUndefined();
  });

  test("should return an empty array when no products exist", async () => {
    const res = mockResponse();
    await getProductController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.products).toEqual([]);
    expect(responseData.countTotal).toBe(0);
  });

  test("should limit results to 12 products", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });
    
    for (let i = 0; i < 15; i++) {
      await productModel.create({
        name: `Product ${i}`,
        slug: `product-${i}`,
        description: `Description ${i}`,
        price: i * 100,
        category: category._id,
        quantity: i * 1000,
      });
    }

    const res = mockResponse();
    await getProductController({}, res);

    const responseData = res.send.mock.calls[0][0];
    expect(responseData.products.length).toBe(12);
    expect(responseData.countTotal).toBe(12);
  });

  test("should sort products by createdAt (latest to earliest)", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const products = [
      {
        name: "Old Product",
        slug: "old-product",
        description: "Old description",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true,
      },
      {
        name: "New Product",
        slug: "new-product",
        description: "New description",
        price: 200,
        category: category._id,
        quantity: 2000,
        shipping: false,
      }, 
    ];

    const now = new Date();
    await productModel.create({ ...products[0], createdAt: new Date(now.getTime() - 1000) });
    await productModel.create({ ...products[1], createdAt: now });

    const res = mockResponse();
    await getProductController({}, res);

    const responseData = res.send.mock.calls[0][0];
    expect(responseData.products[0].name).toBe("New Product");
    expect(responseData.products[1].name).toBe("Old Product");
  });

  test("should handle errors and return status 500", async () => {
    await mongoose.disconnect();

    const res = mockResponse();
    await getProductController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(false);

    // reconnect for other tests
    await mongoose.connect(mongoServer.getUri());
  });
});