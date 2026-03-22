import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import slugify from "slugify";
import productModel from "../models/productModel";
import categoryModel from "../models/categoryModel";
import {
  createProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  productCountController,
  productListController,
  productPhotoController,
  relatedProductController,
  searchProductController,
  updateProductController
} from "./productController";

// Daniel Loh, A0252099X

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  jest.spyOn(console, 'log').mockImplementation(() => { }); // silence console.log
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
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
}

// ===========================================================
// TESTS
// ===========================================================

// Danielle Loh, A0257220N
describe("createProductController Integration Test (with productModel)", () => {
  test("should create a product successfully (without photo)", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const req = {
      fields: {
        name: "Product 1",
        description: "Description 1",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    // check response
    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.products.name).toBe("Product 1");

    // check db
    const addedProduct = await productModel.findOne({ name: "Product 1" });
    expect(addedProduct).not.toBeNull();
    expect(addedProduct.slug).toBe(slugify("Product 1"));
    expect(addedProduct.price).toBe(100);
    expect(addedProduct.category.toString()).toBe(category._id.toString());
    expect(addedProduct.quantity).toBe(1000);
    expect(addedProduct.shipping).toBe(true);
  });

  test("should create product with photo", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const req = {
      fields: {
        name: "Product 1",
        description: "Description 1",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true
      },
      files: {
        photo: {
          path: __filename,
          type: "image/jpeg",
          size: 500,
        },
      },
    };

    const res = mockResponse();
    await createProductController(req, res);

    const addedProduct = await productModel.findOne({ name: "Product 1" });

    expect(addedProduct.photo.data).toBeDefined();
    expect(addedProduct.photo.contentType).toBe("image/jpeg");
  });

  test("should not create if name is missing", async () => {
    const req = {
      fields: {
        description: "Product with no name.",
        price: 100,
        category: "cat1",
        quantity: 1000,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("Name is Required");

    const addedProduct = await productModel.findOne({ description: "Product with no name." });
    expect(addedProduct).toBeNull();
  });

  test("should not create if description is missing", async () => {
    const req = {
      fields: {
        name: "No Desc Product",
        price: 100,
        category: "cat1",
        quantity: 1000,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("Description is Required");

    const addedProduct = await productModel.findOne({ name: "No Desc Product" });
    expect(addedProduct).toBeNull();
  });

  test("should not create if price is missing", async () => {
    const req = {
      fields: {
        name: "No Price Product",
        description: "Product with no price.",
        category: "cat1",
        quantity: 1000,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("Price is Required");

    const addedProduct = await productModel.findOne({ name: "No Price Product" });
    expect(addedProduct).toBeNull();
  });

  test("should not create if category is missing", async () => {
    const req = {
      fields: {
        name: "No Category Product",
        description: "Product with no category.",
        price: 100,
        quantity: 1000,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("Category is Required");

    const addedProduct = await productModel.findOne({ name: "No Category Product" });
    expect(addedProduct).toBeNull();
  });

  test("should not create if quantity is missing", async () => {
    const req = {
      fields: {
        name: "No Quantity Product",
        description: "Product with no quantity.",
        category: "cat1",
        price: 100,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("Quantity is Required");

    const addedProduct = await productModel.findOne({ name: "No Quantity Product" });
    expect(addedProduct).toBeNull();
  });

  test("should not create if photo exceeds size limit", async () => {
    const req = {
      fields: {
        name: "Large Photo Size Product",
        description: "Product with overly large photo size.",
        category: "cat1",
        price: 100,
        quantity: 1000,
      },
      files: {
        photo: {
          path: __filename,
          type: "image/jpeg",
          size: 2000000,
        },
      },
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].error).toBe("photo is Required and should be less then 1mb");

    const addedProduct = await productModel.findOne({ name: "Large Photo Size Product" });
    expect(addedProduct).toBeNull();
  });

  test("should handle errors", async () => {
    await mongoose.disconnect();

    const req = {
      fields: {
        name: "Error Product",
        description: "desc",
        price: 100,
        category: "invalid cat",
        quantity: 1,
      },
      files: {},
    };

    const res = mockResponse();
    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0].success).toBe(false);

    await mongoose.connect(mongoServer.getUri()); // reconnect for other tests
  });
});

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

    const returnedNames = responseData.products.map(p => p.name);
    expect(returnedNames).toEqual(
      expect.arrayContaining(["Product 1", "Product 2"])
    );

    // controller sorts by createdAt
    // so last product inserted should be at the start of the list
    const product1 = responseData.products.find(p => p.name === "Product 1").toObject();
    expect(product1.slug).toBe(products[0].slug);
    expect(product1.description).toBe(products[0].description);
    expect(product1.price).toBe(products[0].price);
    expect(product1.category.name).toBe("Electronics");
    expect(product1.quantity).toBe(products[0].quantity);
    expect(product1.shipping).toBe(products[0].shipping);
    expect(product1.photo).toBeUndefined();
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

// Danielle Loh, A0257220N
describe("getSingleProductController Integration Test (with productModel)", () => {
  test("should return a single product by slug", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const products = await productModel.create([
      {
        name: "Product 1",
        slug: "product-1",
        description: "Description of Product 1",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true,
      },
      {
        name: "Product 2",
        slug: "product-2",
        description: "Description of Product 2",
        price: 200,
        category: category._id,
        quantity: 2000,
        shipping: false,
      },
    ]);

    const req = {
      params: { slug: "product-1" },
    };
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.product.name).toBe("Product 1");
    expect(data.product.description).toBe("Description of Product 1");
    expect(data.product.price).toBe(100);
    expect(data.product.category.name).toBe("Electronics");
    expect(data.product.quantity).toBe(1000);
    expect(data.product.shipping).toBe(true);
  });

  test("should return null product when slug does not exist", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const products = await productModel.create([
      {
        name: "Product 1",
        slug: "product-1",
        description: "Description of Product 1",
        price: 100,
        category: category._id,
        quantity: 1000,
        shipping: true,
      },
      {
        name: "Product 2",
        slug: "product-2",
        description: "Description of Product 2",
        price: 200,
        category: category._id,
        quantity: 2000,
        shipping: false,
      },
    ]);

    const req = {
      params: { slug: "non-existent-slug" },
    };
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.product).toBeNull();
  });

  test("should not return photo field", async () => {
    const category = await categoryModel.create({
      name: "Electronics",
      slug: "electronics",
    });

    const product = await productModel.create({
      name: "Product With Photo",
      slug: "product-with-photo",
      description: "Product with photo description",
      price: 100,
      category: category._id,
      quantity: 1000,
      photo: {
        data: Buffer.from("test"),
        contentType: "image/jpeg",
      },
      shipping: true,
    });

    const req = {
      params: { slug: "product-with-photo" },
    };
    const res = mockResponse();

    await getSingleProductController(req, res);

    const data = res.send.mock.calls[0][0];
    expect(Object.keys(data.product)).not.toContain("photo");
  });

  test("should handle errors", async () => {
    await mongoose.disconnect();

    const req = {
      params: { slug: "random-slug" },
    };
    const res = mockResponse();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);

    await mongoose.connect(mongoServer.getUri()); // reconnect for other tests
  });
});

// Danielle Loh, A0257220N
const seedProductWithPhoto = async () => {
  const category = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });

  const photoBuffer = Buffer.from("test");

  const product = await productModel.create({
    name: "Test Product",
    slug: "test-product",
    description: "Test product description",
    price: 100,
    category: category._id,
    quantity: 1000,
    photo: {
      data: photoBuffer,
      contentType: "image/jpeg",
    },
    shipping: true,
  });

  return { product, photoBuffer };
};

const seedProductWithNoPhoto = async () => {
  const category = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });

  const product = await productModel.create({
    name: "Test Product With No Photo",
    slug: "test-product-with-no-photo",
    description: "Test product with no photo description",
    price: 200,
    category: category._id,
    quantity: 2000,
    shipping: true,
  });

  return { product };
};

describe("productPhotoController Integration Test (with productModel)", () => {
  test("should return product photo with correct content type", async () => {
    const { product, photoBuffer } = await seedProductWithPhoto();

    const req = {
      params: { pid: product._id },
    };
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.send.mock.calls[0][0];
    expect(data.equals(photoBuffer)).toBe(true);
  });

  test("should not return anything if product has no photo", async () => {
    const { product } = await seedProductWithNoPhoto();

    const req = {
      params: { pid: product._id },
    };
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(200);
    expect(res.send).not.toHaveBeenCalled();
  });

  test("should handle invalid product id", async () => {
    const req = {
      params: { pid: "invalid-pid" },
    };
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
    expect(data.message).toBe("Error while getting photo");
  });

  test("should handle database errors", async () => {
    const { product, photoBuffer } = await seedProductWithPhoto();

    await mongoose.disconnect();

    const req = {
      params: { pid: product._id },
    };
    const res = mockResponse();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);

    await mongoose.connect(mongoServer.getUri());
  });
});

// Danielle Loh, A0257220N
const seedProductForDeletion = async () => {
  const category = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });

  const product = await productModel.create({
    name: "Test Product",
    slug: "test-product",
    description: "Test product description",
    price: 100,
    category: category._id,
    quantity: 1000,
    shipping: true,
  });

  return product;
};

describe("deleteProductController Integration Test (with productModel)", () => {
  test("should delete existing product seccessfully", async () => {
    const product = await seedProductForDeletion();

    const req = {
      params: { pid: product._id },
    };
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(true);

    // database check
    const deleteProduct = await productModel.findById(product._id);
    expect(deleteProduct).toBeNull();
  });

  test("should still return success even if product does not exist", async () => {
    const req = {
      params: { pid: new mongoose.Types.ObjectId() },
    };
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
  });

  test("should handle invalid product id", async () => {
    const req = {
      params: { pid: "invalid-pid" },
    };
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
  });

  test("should handle database errors", async () => {
    const product = await seedProductForDeletion();

    await mongoose.disconnect();

    const req = {
      params: { pid: product._id },
    };
    const res = mockResponse();

    await deleteProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);

    await mongoose.connect(mongoServer.getUri());
  });
});

// Danielle Loh, A0257220N
const seedProductForUpdate = async () => {
  const category = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });

  const product = await productModel.create({
    name: "Old Product",
    slug: "old-product",
    description: "Old product description",
    price: 100,
    category: category._id,
    quantity: 1000,
    shipping: true,
  });

  return { product, category };
};

describe("updateProductController Integration Test (with productModel)", () => {
  test("should update existing product successfully (without photo)", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        price: 200,
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);

    // database check
    const updatedProduct = await productModel.findById(product._id);
    expect(updatedProduct.name).toBe("New Product");
    expect(updatedProduct.slug).toBe(slugify("New Product"));
    expect(updatedProduct.description).toBe("New product description");
    expect(updatedProduct.price).toBe(200);
    expect(updatedProduct.category.toString()).toBe(newCategory._id.toString());
    expect(updatedProduct.quantity).toBe(2000);
    expect(updatedProduct.shipping).toBe(false);
  });

  test("should update existing product with photo", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        price: 200,
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {
        photo: {
          path: __filename,
          type: "image/jpeg",
          size: 500,
        },
      },
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);

    const updatedProduct = await productModel.findById(product._id);
    expect(updatedProduct.photo.data).toBeDefined();
    expect(updatedProduct.photo.contentType).toBe("image/jpeg");
  });

  test("should not update if name is missing", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        description: "New product description",
        price: 200,
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.error).toBe("Name is Required");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
  });

  test("should not update if description is missing", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        price: 200,
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.error).toBe("Description is Required");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
  });

  test("should not update if price is missing", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.error).toBe("Price is Required");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
  });

  test("should not update if category is missing", async () => {
    const { product, category } = await seedProductForUpdate();

    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        price: 200,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.error).toBe("Category is Required");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
  });

  test("should not update if quantity is missing", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        category: newCategory._id,
        price: 200,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.error).toBe("Quantity is Required");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
  });

  test("should not update if photo exceeds size limit", async () => {
    const { product, category } = await seedProductForUpdate();

    const newCategory = await categoryModel.create({
      name: "New Category",
      slug: "new-category",
    });
    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        price: 200,
        category: newCategory._id,
        quantity: 2000,
        shipping: false,
      },
      files: {
        photo: {
          path: __filename,
          type: "image/jpeg",
          size: 2000000,
        },
      },
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const data = res.send.mock.calls[0][0];
    expect(data.error).toBe("photo is Required and should be less then 1mb");

    // database check
    const calledProduct = await productModel.findById(product._id);
    expect(calledProduct.name).toBe("Old Product");
    expect(calledProduct.slug).toBe("old-product");
    expect(calledProduct.description).toBe("Old product description");
    expect(calledProduct.price).toBe(100);
    expect(calledProduct.category.toString()).toBe(category._id.toString());
    expect(calledProduct.quantity).toBe(1000);
    expect(calledProduct.shipping).toBe(true);
    expect(calledProduct.photo.data).toBeUndefined();
  });

  test("should handle non-existent product id", async () => {
    const req = {
      params: { pid: new mongoose.Types.ObjectId() },
      fields: {
        name: "Test Product",
        description: "Test product description",
        price: 200,
        category: "test-cat",
        quantity: 2000,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(false);
  });

  test("should handle invalid product id", async () => {
    const req = {
      params: { pid: "invalid-id" },
      fields: {
        name: "Test Product",
        description: "Test product description",
        price: 200,
        category: "test-cat",
        quantity: 2000,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(false);
  });

  test("should handle database errors", async () => {
    const { product, category } = await seedProductForUpdate();

    await mongoose.disconnect();

    const req = {
      params: { pid: product._id },
      fields: {
        name: "New Product",
        description: "New product description",
        price: 200,
        category: category._id,
        quantity: 2000,
        shipping: false,
      },
      files: {},
    };
    const res = mockResponse();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(false);

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("searchProductController Integration Test (with productModel)", () => {
  // Owen Yeo Le Yang A0252047L
  test("should return products that match keyword in name or description", async () => {
    const category = await categoryModel.create({
      name: "Search Category",
      slug: "search-category",
    });

    await productModel.create([
      {
        name: "Alpha Phone",
        slug: "alpha-phone",
        description: "Flagship device",
        price: 1000,
        category: category._id,
        quantity: 10,
      },
      {
        name: "Travel Bag",
        slug: "travel-bag",
        description: "Perfect for alpha travellers",
        price: 80,
        category: category._id,
        quantity: 30,
      },
      {
        name: "Desk Lamp",
        slug: "desk-lamp",
        description: "Warm lighting",
        price: 40,
        category: category._id,
        quantity: 15,
      },
    ]);

    const req = { params: { keyword: "alpha" } };
    const res = mockResponse();

    await searchProductController(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const results = res.json.mock.calls[0][0];
    expect(results).toHaveLength(2);
    expect(results.map((p) => p.name)).toEqual(
      expect.arrayContaining(["Alpha Phone", "Travel Bag"])
    );
    expect(Object.keys(results[0])).not.toContain("photo");
  });

  // Owen Yeo Le Yang A0252047L
  test("should handle database errors", async () => {
    await mongoose.disconnect();

    const req = { params: { keyword: "alpha" } };
    const res = mockResponse();

    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
    expect(data.message).toBe("Error In Search Product API");

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("relatedProductController Integration Test (with productModel)", () => {
  // Owen Yeo Le Yang A0252047L
  test("should return at most 3 related products in same category excluding current product", async () => {
    const sameCategory = await categoryModel.create({
      name: "Phones",
      slug: "phones",
    });
    const otherCategory = await categoryModel.create({
      name: "Laptops",
      slug: "laptops",
    });

    const current = await productModel.create({
      name: "Main Phone",
      slug: "main-phone",
      description: "current product",
      price: 1000,
      category: sameCategory._id,
      quantity: 9,
    });

    await productModel.create([
      {
        name: "Phone 1",
        slug: "phone-1",
        description: "related 1",
        price: 800,
        category: sameCategory._id,
        quantity: 5,
      },
      {
        name: "Phone 2",
        slug: "phone-2",
        description: "related 2",
        price: 850,
        category: sameCategory._id,
        quantity: 5,
      },
      {
        name: "Phone 3",
        slug: "phone-3",
        description: "related 3",
        price: 900,
        category: sameCategory._id,
        quantity: 5,
      },
      {
        name: "Phone 4",
        slug: "phone-4",
        description: "related 4",
        price: 950,
        category: sameCategory._id,
        quantity: 5,
      },
      {
        name: "Laptop 1",
        slug: "laptop-1",
        description: "other category",
        price: 1200,
        category: otherCategory._id,
        quantity: 7,
      },
    ]);

    const req = {
      params: {
        pid: current._id.toString(),
        cid: sameCategory._id.toString(),
      },
    };
    const res = mockResponse();

    await relatedProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.products).toHaveLength(3);
    data.products.forEach((product) => {
      expect(product._id.toString()).not.toBe(current._id.toString());
      expect(product.category.name).toBe("Phones");
      expect(Object.keys(product.toObject())).not.toContain("photo");
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("should handle invalid object id params", async () => {
    const req = {
      params: {
        pid: "invalid-pid",
        cid: "invalid-cid",
      },
    };
    const res = mockResponse();

    await relatedProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
    expect(data.message).toBe("error while geting related product");
  });
});

describe("productListController Integration Test (with productModel)", () => {
  // Owen Yeo Le Yang A0252047L
  test("should return paginated products with 6 items on page 1 and remaining on page 2", async () => {
    const category = await categoryModel.create({
      name: "Paged Category",
      slug: "paged-category",
    });

    for (let i = 1; i <= 8; i++) {
      await productModel.create({
        name: `Paged Product ${i}`,
        slug: `paged-product-${i}`,
        description: `Paged description ${i}`,
        price: i * 10,
        category: category._id,
        quantity: i,
        photo: {
          data: Buffer.from(`photo-${i}`),
          contentType: "image/png",
        },
      });
    }

    const resPage1 = mockResponse();
    await productListController({ params: { page: 1 } }, resPage1);
    const page1Data = resPage1.send.mock.calls[0][0];

    const resPage2 = mockResponse();
    await productListController({ params: { page: 2 } }, resPage2);
    const page2Data = resPage2.send.mock.calls[0][0];

    expect(resPage1.status).toHaveBeenCalledWith(200);
    expect(page1Data.success).toBe(true);
    expect(page1Data.products).toHaveLength(6);

    expect(resPage2.status).toHaveBeenCalledWith(200);
    expect(page2Data.success).toBe(true);
    expect(page2Data.products).toHaveLength(2);
    page1Data.products.forEach((product) => {
      expect(Object.keys(product.toObject())).not.toContain("photo");
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("should handle database errors", async () => {
    await mongoose.disconnect();

    const req = { params: { page: 1 } };
    const res = mockResponse();

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
    expect(data.message).toBe("error in per page ctrl");

    await mongoose.connect(mongoServer.getUri());
  });
});

describe("productCountController Integration Test (with productModel)", () => {
  // Owen Yeo Le Yang A0252047L
  test("should return total product count", async () => {
    const category = await categoryModel.create({
      name: "Count Category",
      slug: "count-category",
    });

    await productModel.create([
      {
        name: "Count Product 1",
        slug: "count-product-1",
        description: "count product 1",
        price: 20,
        category: category._id,
        quantity: 1,
      },
      {
        name: "Count Product 2",
        slug: "count-product-2",
        description: "count product 2",
        price: 30,
        category: category._id,
        quantity: 2,
      },
      {
        name: "Count Product 3",
        slug: "count-product-3",
        description: "count product 3",
        price: 40,
        category: category._id,
        quantity: 3,
      },
    ]);

    const res = mockResponse();
    await productCountController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(true);
    expect(data.total).toBe(3);
  });

  // Owen Yeo Le Yang A0252047L
  test("should handle database errors", async () => {
    await mongoose.disconnect();

    const res = mockResponse();
    await productCountController({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const data = res.send.mock.calls[0][0];
    expect(data.success).toBe(false);
    expect(data.message).toBe("Error in product count");

    await mongoose.connect(mongoServer.getUri());
  });
});
