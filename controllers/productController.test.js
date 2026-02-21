import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import e from "cors";

// --- mocks (must be declared before importing productController.js) ---
jest.mock("fs", () => ({ readFileSync: jest.fn() }));
jest.mock("slugify", () => jest.fn());

// productModel is used as constructor: new productModel(...)
jest.mock("../models/productModel.js", () => {
    const ctor = jest.fn();
    ctor.findByIdAndDelete = jest.fn();
    ctor.findByIdAndUpdate = jest.fn();
    ctor.find = jest.fn();
    ctor.findOne = jest.fn();
    ctor.findById = jest.fn();
    ctor.estimatedDocumentCount = jest.fn();
    ctor.countDocuments = jest.fn();
    return { __esModule: true, default: ctor };
});

// prevent dotenv from loading real env
jest.mock("dotenv", () => ({
    __esModule: true,
    default: { config: jest.fn() },
}));

// mock braintree so it won't validate env keys at import-time
jest.mock("braintree", () => ({
    __esModule: true,
    default: {
      Environment: { Sandbox: {} },
      BraintreeGateway: class {
        constructor() {}
      },
    },
}));

// we will import controller AFTER mocks are set
let createProductController;
const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
};

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    createProductController = mod.createProductController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("createProductController", () => {
    test("validation: missing name -> 500 Name is Required", async () => {
        const req = {
            fields: {
            name: "",
            description: "d",
            price: 10,
            category: "c1",
            quantity: 1,
            },
        files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test("validation: photo > 1MB -> 500 photo error", async () => {
      const req = {
          fields: {
            name: "A",
            description: "d",
            price: 10,
            category: "c1",
            quantity: 1,
          },
          files: {
            photo: { size: 1000001, path: "/tmp/x", type: "image/png" },
          },
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    test("happy path: creates product, reads photo, saves, returns 201", async () => {
        slugify.mockReturnValue("a-slug");
        fs.readFileSync.mockReturnValue(Buffer.from("img"));

        const saveMock = jest.fn().mockResolvedValue(undefined);

        productModel.mockImplementation(() => ({
            photo: { data: null, contentType: null },
            save: saveMock,
        }));

        const req = {
            fields: {
                name: "A",
                description: "d",
                price: 10,
                category: "c1",
                quantity: 1,
                shipping: true,
            },
            files: {
                photo: { size: 10, path: "/tmp/img.png", type: "image/png" },
            },
        };
        const res = makeRes();

        await createProductController(req, res);

        expect(slugify).toHaveBeenCalledWith("A");
        expect(productModel).toHaveBeenCalledWith(
            expect.objectContaining({ name: "A", slug: "a-slug" })
        );
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/img.png");
        expect(saveMock).toHaveBeenCalledTimes(1);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
            success: true,
            message: "Product Created Successfully",
        })
      );
  });

  test("error: save throws -> returns 500 Error in crearing product", async () => {
      slugify.mockReturnValue("a-slug");

      const saveMock = jest.fn().mockRejectedValue(new Error("DB down"));
      productModel.mockImplementation(() => ({
          photo: { data: null, contentType: null },
          save: saveMock,
      }));

      const req = {
          fields: {
              name: "A",
              description: "d",
              price: 10,
              category: "c1",
              quantity: 1,
          },
          files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
              success: false,
              message: "Error in crearing product",
          })
      );
    });
});

// Danielle Loh, A0257220N
let getProductController;

beforeAll(async () => {
    const mod = await import ("./productController.js");
    getProductController = mod.getProductController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('getProductController', () => {
    test('returns list of products', async () => {
        const fakeProducts = [
            { name: 'Test Product' }
        ];

        const sortMock = jest.fn().mockResolvedValue(fakeProducts);
        const limitMock = jest.fn().mockReturnValue({ sort: sortMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
        const populateMock = jest.fn().mockReturnValue({ select: selectMock});

        productModel.find.mockReturnValue({ populate: populateMock });

        const req = {}
        const res = makeRes();

        await getProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(populateMock).toHaveBeenCalledWith("category");
        expect(selectMock).toHaveBeenCalledWith("-photo");
        expect(limitMock).toHaveBeenCalledWith(12)
        expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            counTotal: 1,
            message: "All Products ",
            products: fakeProducts,
        });
    });

    test('handles errors', async () => {
        const mockError = new Error("[createProductController] DB error");

        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});

        productModel.find.mockImplementation(() => {
            throw mockError
        });

        const req = {};
        const res = makeRes();

        await getProductController(req, res);

        expect(consoleSpy).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in getting products",
            error: mockError,
        });
    });
});

// Danielle Loh, A0257220N
let getSingleProductController;

beforeAll(async () => {
    const mod = await import ("./productController.js");
    getSingleProductController = mod.getSingleProductController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('getSingleProductController', () => {
    test('returns a single product', async () => {
        const fakeProduct = { name: 'Test Product' };

        const mockPopulate = jest.fn().mockResolvedValue(fakeProduct);
        const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
        productModel.findOne.mockReturnValue({ select: mockSelect });

        const req = { params: { slug: "test product" } };
        const res = makeRes();

        await getSingleProductController(req, res);

        expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test product" });
        expect(mockSelect).toHaveBeenCalledWith("-photo");
        expect(mockPopulate).toHaveBeenCalledWith("category");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single Product Fetched",
            product: fakeProduct,
        });
    });

    test('handles errors', async () => {
        const mockError = new Error("[getSingleProductController] DB Error");

        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});

        productModel.findOne.mockImplementation(() => {
            throw mockError
        });

        const req = { params: { slug: "test product" } }
        const res = makeRes();

        await getSingleProductController(req, res);

        expect(consoleSpy).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting single product",
            error: mockError,
        });
    });
});

// Danielle Loh, A0257220N
let productPhotoController;

beforeAll(async () => {
    const mod = await import ("./productController.js");
    productPhotoController = mod.productPhotoController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('productPhotoController', () => {
    test('returns product photo', async () => {
        const fakeProduct = {
            photo: {
                data: Buffer.from("img"),
                contentType: "image/png",
            },
        };

        const mockSelect = jest.fn().mockResolvedValue(fakeProduct);
        productModel.findById.mockReturnValue({ select: mockSelect });

        const req = { params: { pid: '123' } };
        const res = makeRes();

        await productPhotoController(req, res);

        expect(productModel.findById).toHaveBeenCalledWith('123');
        expect(mockSelect).toHaveBeenCalledWith("photo");
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(fakeProduct.photo.data);
    });

    test('handles errors', async () => {
        const fakeError = new Error("[productPhotoController] DB Error");

        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});

        productModel.findById.mockImplementation(() => {
            throw fakeError
        });

        const req = { params: { pid: '123' } };
        const res = makeRes();

        await productPhotoController(req, res);

        expect(consoleSpy).toHaveBeenCalledWith(fakeError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting photo",
            error: fakeError,
        });
    });
});

let deleteProductController;
beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    deleteProductController = mod.deleteProductController;
})

beforeEach(() => {
    jest.clearAllMocks();
});

describe("deleteProductController", () => {
    test("happy path: deletes product, returns 200", async () => {
        const selectMock = jest.fn().mockResolvedValue(undefined);
        productModel.findByIdAndDelete.mockReturnValue({
            select: selectMock,
        });

        const req = { params: { pid: "p1" } };
        const res = makeRes();

        await deleteProductController(req, res);

        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("p1");
        expect(selectMock).toHaveBeenCalledWith("-photo");

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Deleted successfully",
        });
    });

    test("error: findByIdAndDelete throws -> returns 500 Error while deleting product", async () => {
        productModel.findByIdAndDelete.mockImplementation(() => {
            throw new Error("DB down");
        });

        const req = { params: { pid: "p1" } };
        const res = makeRes();

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while deleting product",
            })
        );
    });
});

let updateProductController;

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    updateProductController = mod.updateProductController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("updateProductController", () => {
    test("validation: missing name -> 500 Name is Required", async () => {
        const req = {
            params: { pid: "p1" },
            fields: {
                name: "",
                description: "d",
                price: 10,
                category: "c1",
                quantity: 1,
            },
            files: {},
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("validation: photo > 1MB -> 500 photo error", async () => {
        const req = {
            params: { pid: "p1" },
            fields: {
                name: "A",
                description: "d",
                price: 10,
                category: "c1",
                quantity: 1,
            },
            files: {
                photo: { size: 1000001, path: "/tmp/x", type: "image/png" },
            },
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "photo is Required and should be less then 1mb",
        });
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("happy path: updates product, reads photo, saves, returns 201", async () => {
        slugify.mockReturnValue("a-slug");
        fs.readFileSync.mockReturnValue(Buffer.from("img"));

        const saveMock = jest.fn().mockResolvedValue(undefined);

        productModel.findByIdAndUpdate.mockResolvedValue({
            photo: { data: null, contentType: null },
            save: saveMock,
        });

        const req = {
            params: { pid: "p1" },
            fields: {
                name: "Updated Product",
                description: "desc",
                price: 20,
                category: "c1",
                quantity: 5,
                shipping: true,
            },
            files: {
                photo: { size: 10, path: "/tmp/img.png", type: "image/png" },
            },
        };
        const res = makeRes();

        await updateProductController(req, res);

        expect(slugify).toHaveBeenCalledWith("Updated Product");
        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "p1",
            expect.objectContaining({ name: "Updated Product", slug: expect.any(String) }),
            { new: true }
        );
        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/img.png");
        expect(saveMock).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Updated Successfully",
            })
        );
    });

    test("error: findByIdAndUpdate throws -> returns 500 Error in Updte product", async () => {

        productModel.findByIdAndUpdate.mockRejectedValue(new Error("DB down"));

        const req = {
            params: { pid: "p1" },
            fields: {
                name: "A",
                description: "d",
                price: 10,
                category: "c1",
                quantity: 1,
            },
            files: {},
        };

        const res = makeRes();

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in Updte product",
            })
        );
    });
}); 

let productFiltersController;

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    productFiltersController = mod.productFiltersController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("productFiltersController", () => {
    // tests for productFiltersController would go here
    test("checked empty and radio empty -> return 200 and find ({})", async () => {
        const fakeProducts = [{ _id: "p1" }];
        productModel.find.mockResolvedValue(fakeProducts);

        const req = {
            body: {
                checked: [],
                radio: [],
            },
        };
        const res = makeRes();

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: fakeProducts,
        });
    });

    test("checked non-empty -> find category:checked", async () => {
        const fakeProducts = [{ _id: "p2" }];
        productModel.find.mockResolvedValue(fakeProducts);

        const req = {
            body: {
                checked: ["c1", "c2"],
                radio: [],
            },
        };
        const res = makeRes();
        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: ["c1", "c2"],
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("radio non-empty -> find price gte/lte", async () => {
        const fakeProducts = [{ _id: "p3" }];
        productModel.find.mockResolvedValue(fakeProducts);

        const req = {
            body: {
                checked: [],
                radio: [10, 50],
            },
        };
        const res = makeRes();
        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            price: { $gte: 10, $lte: 50 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("checked + radio -> find category and price", async () => {
        const fakeProducts = [{ _id: "p4" }];
        productModel.find.mockResolvedValue(fakeProducts);

        const req = {
            body: {
                checked: ["c9"],
                radio: [5, 15],
            },
        };
        const res = makeRes();
        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: ["c9"],
            price: { $gte: 5, $lte: 15 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test("error: find throws -> returns 400 Error WHile Filtering Products", async () => {
        productModel.find.mockImplementation(() => {
            throw new Error("DB down");
        });     

        const req = { body: { checked: ["c1"], radio: [1, 2] } };
        const res = makeRes();
        await productFiltersController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error WHile Filtering Products",
            })
        );
    });
});

let productCountController;

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    productCountController = mod.productCountController;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("productCountController", () => {
    test("happy path: returns 200 with total", async () => {
        const estMock = jest.fn().mockResolvedValue(65);

        productModel.find.mockReturnValue({ estimatedDocumentCount: estMock });

        const req = {};
        const res = makeRes();

        await productCountController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(estMock).toHaveBeenCalledTimes(1);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            total: 65,
        });
    });

    test("error: estimatedDocumentCount throws -> returns 400 Error in product count", async () => {
        const estMock = jest.fn().mockImplementation(() => {
            throw new Error("DB down");
        });

        productModel.find.mockReturnValue({ estimatedDocumentCount: estMock });

        const req = {};
        const res = makeRes();

        await productCountController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in product count",
            })
        );
    });
});

let productListController;

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    productListController = mod.productListController;
});

beforeEach(() => {
    jest.clearAllMocks();
}); 

describe("productListController", () => {
    test("happy path: returns paginated products", async () => {
        const fakeProducts = [{ _id: "p1"}];

        const sortMock = jest.fn().mockResolvedValue(fakeProducts);
        const limitMock = jest.fn().mockReturnValue({ sort: sortMock });
        const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
        const selectMock = jest.fn().mockReturnValue({ skip: skipMock });

        productModel.find.mockReturnValue({ select: selectMock });

        const req = { params: { page: 2 } };
        const res = makeRes();

        await productListController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(selectMock).toHaveBeenCalledWith("-photo");
        expect(skipMock).toHaveBeenCalledWith((2 - 1) * 6);
        expect(limitMock).toHaveBeenCalledWith(6);
        expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: fakeProducts,
        });
    });

    test("error: find throws -> returns 400 error in per page ctrl", async () => {
        const sortMock = jest.fn().mockRejectedValue(new Error("DB down"));
        const limitMock = jest.fn().mockReturnValue({ sort: sortMock });
        const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
        const selectMock = jest.fn().mockReturnValue({ skip: skipMock });

        productModel.find.mockReturnValue({ select: selectMock });

        const req = { params: { page: 1 } };
        const res = makeRes();

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "error in per page ctrl",
            })
        );
    });
});