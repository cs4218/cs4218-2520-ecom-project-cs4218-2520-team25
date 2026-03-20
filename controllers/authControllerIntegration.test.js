import { loginController } from "../controllers/authController";
import userModel from "../models/userModel";
import { hashPassword } from "../helpers/authHelper";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

describe("Login Controller Integration Tests", () => {
  beforeAll(async () => {
    const url = process.env.MONGO_URL 
    await mongoose.connect(url);
  });
  
  // Clean up the database state after each test to ensure isolation
  let createdUserIds = [];

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await userModel.deleteMany({ _id: { $in: createdUserIds } });
      createdUserIds = []; 
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  //Invalid/Missing Inputs

  test("test_login_missing_fields_returns_400_error", async () => {
    // 1. Arrange
    const req = {
      body: {
        email: "test@example.com",
        // password missing
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // 2. Act
    await loginController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Email and password is required",
      })
    );
  });

  // Unregistered User

  test("test_login_unregistered_email_returns_400_error", async () => {
    // 1. Arrange
    const req = {
      body: {
        email: "nonexistent@example.com",
        password: "password123",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // 2. Act
    await loginController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Email is not registerd",
      })
    );
  });

  // Incorrect Password 

  test("test_login_invalid_password_returns_failure_message", async () => {
    // 1. Arrange
    const email = "user78@test.com";
    const correctPassword = "securePassword";
    const hashedPassword = await hashPassword(correctPassword);
    
    // Seed the database with a real user
    const user = await new userModel({
      name: "testuser78",
      email: email,
      password: hashedPassword,
      phone: "999999",
      address: "123 Street",
      answer: "test answer",
    }).save();

    createdUserIds.push(user._id);

    const req = {
      body: {
        email: email,
        password: "wrongPassword", 
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };


    // 2. Act
    await loginController(req, res);

    // 3. Assert
    // Note: Per your code logic, incorrect password returns status 200
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid Password",
      })
    );
  });

  // Successful Authentication 

  test("test_login_valid_credentials_returns_200_and_token", async () => {
    // 1. Arrange
    const email = "kailash_test@dev.com"; 
    const password = "mypassword123";
    const hashedPassword = await hashPassword(password);

    const user = await new userModel({
      name: "Kailash",
      email: email,
      password: hashedPassword,
      phone: "888888",
      address: "Singapore",
      answer: "Blue",
      role: 1,
    }).save();

    
    createdUserIds.push(user._id);

    // Double check the user is actually in the DB 
    const checkUser = await userModel.findOne({ email });
    if (!checkUser) throw new Error("User was not saved to DB correctly");

    const req = { 
      body: { 
        email: email, 
        password: password 
      } 
    };
    
    const res = { 
      status: jest.fn().mockReturnThis(), 
      send: jest.fn() 
    };

    // 2. Act
    await loginController(req, res);

    // 3. Assert
    if (res.status.mock.calls[0][0] === 400) {
        console.log("Controller 400 Error Message:", res.send.mock.calls[0][0].message);
    }

    expect(res.status).toHaveBeenCalledWith(200);
    
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("login successfully");
    expect(responseData.token).toBeDefined();
    
    expect(responseData.user).toEqual({
      _id: user._id,
      name: "Kailash",
      email: email,
      phone: "888888",
      address: "Singapore",
      role: 1
    });

    // Security Assertions: Ensure internal fields are excluded
    expect(responseData.user.password).toBeUndefined();
    expect(responseData.user.answer).toBeUndefined();
  });
});
