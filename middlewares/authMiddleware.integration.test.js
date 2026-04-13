// Kailashwaran, A0253385Y

import { requireSignIn, isAdmin } from "./authMiddleware";
import userModel from "../models/userModel";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

describe("Auth Middleware Integration Tests", () => {
  beforeAll(async () => {
    const url = process.env.MONGO_URL;
    await mongoose.connect(url);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  let createdUserIds = [];

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await userModel.deleteMany({ _id: { $in: createdUserIds } });
      createdUserIds = [];
    }
  });

  // Test requireSignIn (Token Verification) 

  test("test_requireSignIn_with_valid_token_appends_user_to_req", async () => {
    // 1. Arrange
    const payload = { _id: new mongoose.Types.ObjectId().toString(), role: 1 };
    const token = JWT.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    const req = {
      headers: { authorization: token },
    };
    const res = {};
    const next = jest.fn();

    // 2. Act
    await requireSignIn(req, res, next);

    // 3. Assert
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user._id).toBe(payload._id);
  });

  test("test_requireSignIn_with_invalid_token_returns_401", async () => {
    // 1. Arrange
    const req = {
      headers: { authorization: "invalid-token" },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();

    // 2. Act
    await requireSignIn(req, res, next);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Unauthorized: Invalid or expired token" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // Test isAdmin (Database Role Check) 

  test("test_isAdmin_with_admin_role_calls_next", async () => {
    // 1. Arrange - Seed an Admin User
    const adminUser = await new userModel({
      name: "Admin",
      email: "admin@test.com",
      password: "hash",
      phone: "123",
      address: "HQ",
      answer: "AdminKey",
      role: 1, // Admin role
    }).save();
    createdUserIds.push(adminUser._id);

    const req = { user: { _id: adminUser._id } };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();

    // 2. Act
    await isAdmin(req, res, next);

    // 3. Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("test_isAdmin_with_regular_user_returns_401", async () => {
    // 1. Arrange - Seed a Regular User
    const regularUser = await new userModel({
      name: "User",
      email: "user79@test.com",
      password: "hash",
      phone: "123",
      address: "Home",
      answer: "UserKey",
      role: 0, // Not an admin
    }).save();
    createdUserIds.push(regularUser._id);

    const req = { user: { _id: regularUser._id } };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();

    // 2. Act
    await isAdmin(req, res, next);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "UnAuthorized Access" })
    );
    expect(next).not.toHaveBeenCalled();
  });
});