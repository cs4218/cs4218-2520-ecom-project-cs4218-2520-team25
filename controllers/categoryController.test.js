import { 
  createCategoryController, 
  updateCategoryController, 
  deleteCategoryCOntroller 
} from "./categoryController.js";

import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

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
}

beforeEach(() => {
  jest.clearAllMocks();
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
      message: "Category Already Exisits",
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
      .mockImplementation(() => {});

    const mockError = new Error("DB error");
    categoryModel.findOne.mockRejectedValue(mockError);

    await createCategoryController(req, res);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Errro in Category",
    });

    consoleSpy.mockRestore();
  });
});