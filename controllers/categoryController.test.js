import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller
} from "./categoryController.js";

import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";
import { mock } from "node:test";

jest.mock("../models/categoryModel.js");
jest.mock("slugify");

const mockRequest = (body = {}, params = {}) => ({
  body,
  params,
});

const mockResponse = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Danielle Loh, A0257220N
describe("createCategoryController", () => {
  test('returns 401 if name is missing', async () => {
    const req = mockRequest({});
    const res = mockResponse();

    await createCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({
      message: "Name is required",
    });
  });

  test('returns existing category message', async () => {
    const req = mockRequest({ name: 'Electronics' });
    const res = mockResponse();

    categoryModel.findOne.mockResolvedValue({ name: 'Electronics' });

    await createCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({
      name: 'Electronics'
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category Already Exists",
    });
  });

  test('creates new category successfully', async () => {
    const req = mockRequest({ name: 'Electronics' });
    const res = mockResponse();

    categoryModel.findOne.mockResolvedValue(null);
    slugify.mockReturnValue("electronics");

    categoryModel.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({
        name: "Electronics",
        slug: "electronics",
      }),
    }));

    await createCategoryController(req, res);

    expect(slugify).toHaveBeenCalledWith("Electronics");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "new category created",
      })
    );
  });

  test('handles errors', async () => {
    const req = mockRequest({ name: "Electronics" });
    const res = mockResponse();

    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => { });

    const mockError = new Error("DB error");
    categoryModel.findOne.mockRejectedValue(mockError);

    await createCategoryController(req, res);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error in Category",
    });
  });
});

// Danielle Loh, A0257220N
describe("updateCategoryController", () => {
  test('updates category successfully', async () => {
    const req = mockRequest(
      { name: 'Electronics' },
      { id: '123' }
    );
    const res = mockResponse();

    slugify.mockReturnValue('electronics');
    categoryModel.findByIdAndUpdate.mockResolvedValue({
      name: 'Electronics',
      slug: 'electronics',
    });

    await updateCategoryController(req, res);

    expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '123',
      { name: 'Electronics', slug: 'electronics' },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category Updated Successfully",
      })
    );
  });

  test('handles errors', async () => {
    const req = mockRequest(
      { name: 'Electronics' },
      { id: '123' }
    );
    const res = mockResponse();

    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => { });

    const mockError = new Error('DB Error');
    categoryModel.findByIdAndUpdate.mockRejectedValue(mockError);

    await updateCategoryController(req, res);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error while updating category",
    });
  });
});

// Daniel Loh, A0252099X

let req;
let res;

beforeEach(() => {
  req = { params: {} };
  res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  jest.clearAllMocks();
});

describe("categoryControlller", () => {
  it("should return all categories successfully", async () => {
    const mockCategories = [{ name: "Electronics" }, { name: "Books" }];
    categoryModel.find.mockResolvedValue(mockCategories);

    await categoryControlller(req, res);

    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "All Categories List",
      category: mockCategories,
    });
  });

  it("should return 500 if categoryModel.find throws an error", async () => {
    const mockError = new Error("DB Error");
    categoryModel.find.mockRejectedValue(mockError);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    await categoryControlller(req, res);

    expect(categoryModel.find).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error while getting all categories",
    });

    consoleSpy.mockRestore();
  });
});

// Daniel Loh, A0252099X

describe("singleCategoryController", () => {
  it("should return a single category successfully", async () => {
    req.params.slug = "electronics";
    const mockCategory = { name: "Electronics", slug: "electronics" };
    categoryModel.findOne.mockResolvedValue(mockCategory);

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get Single Category Successfully",
      category: mockCategory,
    });
  });

  it("should return 500 if categoryModel.findOne throws an error", async () => {
    req.params.slug = "electronics";
    const mockError = new Error("DB Error");
    categoryModel.findOne.mockRejectedValue(mockError);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error While getting Single Category",
    });

    consoleSpy.mockRestore();
  });

  it("should handle case where category is not found", async () => {
    req.params.slug = "unknown";
    categoryModel.findOne.mockResolvedValue(null);

    await singleCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "unknown" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Get Single Category Successfully",
      category: null,
    });
  });
});

// Danielle Loh, A0257220N
describe("deleteCategoryCOntroller", () => {
  test('deletes category successfully', async () => {
    const req = mockRequest(
      {},
      { id: '123' }
    );
    const res = mockResponse();

    categoryModel.findByIdAndDelete.mockResolvedValue({
      name: 'Electronics',
      slug: 'electronics'
    });

    await deleteCategoryCOntroller(req, res);

    expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith('123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category Deleted Successfully",
    });
  });

  test('handles errors', async () => {
    const req = mockRequest(
      {},
      { id: '123' }
    );
    const res = mockResponse();

    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => { });

    const mockError = new Error("DB error");
    categoryModel.findByIdAndDelete.mockRejectedValue(mockError);

    await deleteCategoryCOntroller(req, res);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "error while deleting category",
      error: mockError,
    });
  });
});