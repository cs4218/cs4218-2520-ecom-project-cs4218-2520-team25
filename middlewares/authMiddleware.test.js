import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "./authMiddleware.js";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

describe("Auth Middleware", () => {
  let req, res, next;

  beforeEach(() => {

    req = {
      headers: { authorization: "mock-token" },
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    next = jest.fn();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("requireSignIn", () => {
    // Valid Token Path
    test("should call next() and attach decode to req.user when token is valid", async () => {
      // --- Arrange ---
      const decodedUser = { _id: "user123", name: "Kailash" };
      JWT.verify.mockReturnValue(decodedUser);

      // --- Act ---
      await requireSignIn(req, res, next);

      // --- Assert ---
      expect(req.user).toEqual(decodedUser);
      expect(next).toHaveBeenCalled();
    });

    // Invalid/Expired Token Path
    test("should log error but not call next() when token verification fails", async () => {
      // --- Arrange ---
      JWT.verify.mockImplementation(() => { throw new Error("Invalid Token"); });

      // --- Act ---
      await requireSignIn(req, res, next);

      // --- Assert ---
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: "Error in signIn middleware"
      }));
    });
  });

  describe("Admin tests", () => {
    // isAdmin
    test("should call next() if user role is 1", async () => {
      // --- Arrange ---
      req.user = { _id: "adminId" };
      
      userModel.findById.mockResolvedValue({ _id: "adminId", role: 1 });

      // --- Act ---
      await isAdmin(req, res, next);

      // --- Assert ---
      expect(next).toHaveBeenCalled();
    });

    // Unauthorized (Role 0 or others)
    test("should return 401 if user role is not 1", async () => {
      // --- Arrange ---
      req.user = { _id: "userId" };
      userModel.findById.mockResolvedValue({ _id: "userId", role: 0 });

      // --- Act ---
      await isAdmin(req, res, next);

      // --- Assert ---
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        message: "UnAuthorized Access"
      }));
      expect(next).not.toHaveBeenCalled();
    });

    // System Error Path
    test("should return 500 and error message if call fails", async () => {
      // --- Arrange ---
      req.user = { _id: "userId" };
      userModel.findById.mockRejectedValue(new Error("DB Error"));

      // --- Act ---
      await isAdmin(req, res, next);

      // --- Assert ---
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in admin middleware"
      }));
    });
  });
});