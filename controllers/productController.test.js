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
    res.json = jest.fn().mockReturnValue(res);
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

let searchProductController;

beforeAll(async () => {
    // dynamic import AFTER mocks are registered
    const mod = await import("./productController.js");
    searchProductController = mod.searchProductController;
});

beforeEach(() => {
    jest.clearAllMocks();
}); 

describe("searchProductController", () => {
    it("should query name/description by regex (case-insensitive) and exclude photo", async () => {
        const req = { params: { keyword: "phone" } };
        const res = makeRes();

        const mockProducts = [
            { _id: "1", name: "iPhone", description: "Apple phone", price: 1000 },
        ];

        const selectMock = jest.fn().mockResolvedValue(mockProducts);

        productModel.find.mockReturnValue({ select: selectMock });

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledTimes(1);
        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: "phone", $options: "i" } },
                { description: { $regex: "phone", $options: "i" } },
            ],
        });

        expect(selectMock).toHaveBeenCalledTimes(1);
        expect(selectMock).toHaveBeenCalledWith("-photo");

        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith(mockProducts);
    });

    it("should return empty array when no matches", async () => {
        const req = { params: { keyword: "nonexistent" } };
        const res = makeRes();

        const selectMock = jest.fn().mockResolvedValue([]);
        productModel.find.mockReturnValue({ select: selectMock });

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should still build query if keyword is undefined", async () => {
        const req = { params: { keyword: undefined } };
        const res = makeRes();

        const selectMock = jest.fn().mockResolvedValue([]);
        productModel.find.mockReturnValue({ select: selectMock });

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: undefined, $options: "i" } },
                { description: { $regex: undefined, $options: "i" } },
            ],
        });

        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should return 400 if productModel.find throws synchronously", async () => {
        const req = { params: { keyword: "phone" } };
        const res = makeRes();

        productModel.find.mockImplementation(() => {
            throw new Error("DB find error");
        });

        await searchProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error In Search Product API",
                error: expect.anything(),
            })
        );
    });

    it("should return 400 if select() rejects", async () => {
        const req = { params: { keyword: "phone" } };
        const res = makeRes();

        const selectMock = jest.fn().mockRejectedValue(new Error("select failed"));
        productModel.find.mockReturnValue({ select: selectMock });

        await searchProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
            success: false,
            message: "Error In Search Product API",
            error: expect.anything(),
        })
        );
    });

    it("should not accidentally include photo in response (contract check)", async () => {
        const req = { params: { keyword: "phone" } };
        const res = makeRes();

        const payloadWithoutPhoto = [{ _id: "1", name: "x" }];

        const selectMock = jest.fn().mockResolvedValue(payloadWithoutPhoto);
        productModel.find.mockReturnValue({ select: selectMock });

        await searchProductController(req, res);

        const returned = res.json.mock.calls[0][0];
        expect(returned[0]).not.toHaveProperty("photo");
    });
});

let realtedProductController;

beforeAll(async () => {
    const mod = await import("../controllers/productController.js");
    realtedProductController = mod.realtedProductController;
});

beforeEach(() => {
    jest.clearAllMocks(); 
});

describe("realtedProductController", () => {
    it("should find related products by category, exclude pid, exclude photo, limit 3, populate category, and return 200", async () => {
        const req = { params: { pid: "p1", cid: "c1" } };
        const res = makeRes();

        const mockProducts = [
            { _id: "p2", name: "A" },
            { _id: "p3", name: "B" },
        ];

        // Build chain: find().select().limit().populate()
        const populateMock = jest.fn().mockResolvedValue(mockProducts);
        const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

        productModel.find.mockReturnValue({ select: selectMock });

        await realtedProductController(req, res);

        expect(productModel.find).toHaveBeenCalledTimes(1);
        expect(productModel.find).toHaveBeenCalledWith({
            category: "c1",
            _id: { $ne: "p1" },
        });

        expect(selectMock).toHaveBeenCalledWith("-photo");
        expect(limitMock).toHaveBeenCalledWith(3);
        expect(populateMock).toHaveBeenCalledWith("category");

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            products: mockProducts,
        });
    });

    it("should return empty list if no related products found", async () => {
        const req = { params: { pid: "p1", cid: "c1" } };
        const res = makeRes();

        const populateMock = jest.fn().mockResolvedValue([]);
        const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

        productModel.find.mockReturnValue({ select: selectMock });

        await realtedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, products: [] });
    });

    it("should handle missing pid/cid", async () => {
        const req = { params: { pid: undefined, cid: undefined } };
        const res = makeRes();

        const populateMock = jest.fn().mockResolvedValue([]);
        const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

        productModel.find.mockReturnValue({ select: selectMock });

        await realtedProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: undefined,
            _id: { $ne: undefined },
        });

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 if productModel.find throws synchronously", async () => {
        const req = { params: { pid: "p1", cid: "c1" } };
        const res = makeRes();

        productModel.find.mockImplementation(() => {
        throw new Error("DB find error");
        });

        await realtedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
            success: false,
            message: "error while geting related product",
            error: expect.anything(),
        })
        );
    });

    it("should return 400 if populate rejects (async failure down the chain)", async () => {
        const req = { params: { pid: "p1", cid: "c1" } };
        const res = makeRes();

        const populateMock = jest.fn().mockRejectedValue(new Error("populate failed"));
        const limitMock = jest.fn().mockReturnValue({ populate: populateMock });
        const selectMock = jest.fn().mockReturnValue({ limit: limitMock });

        productModel.find.mockReturnValue({ select: selectMock });

        await realtedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
            success: false,
            message: "error while geting related product",
            error: expect.anything(),
        })
        );
    });
});