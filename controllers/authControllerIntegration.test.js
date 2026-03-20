import { loginController, registerController } from "../controllers/authController";
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


describe("Register Controller Integration Tests", () => {
  beforeAll(async () => {
    const url = process.env.MONGO_URL
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

  // Missing Fields 

  test("test_register_missing_name_returns_error_message", async () => {
    // 1. Arrange
    const req = {
      body: {
        email: "test123@test.com",
        password: "123",
        phone: "123",
        address: "street",
        answer: "blue"
      } // name is missing
    };
    const res = { send: jest.fn() };

    // 2. Act
    await registerController(req, res);

    // 3. Assert
    expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });
  });

  // Existing User 

  test("test_register_duplicate_email_returns_failure", async () => {
    // 1. Arrange
    const existingEmail = "already@exists.com";
    const user = await new userModel({
      name: "Existing",
      email: existingEmail,
      password: "hash",
      phone: "111",
      address: "place",
      answer: "secret"
    }).save();
    createdUserIds.push(user._id);

    const req = {
      body: {
        name: "New Guy",
        email: existingEmail,
        password: "password",
        phone: "222",
        address: "elsewhere",
        answer: "secret"
      }
    };
    const res = { 
        status: jest.fn().mockReturnThis(), 
        send: jest.fn() 
    };

    // 2. Act
    await registerController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "User already registered please login"
    }));
  });

  // Successful Registration

  test("test_register_valid_data_saves_to_db_and_returns_201", async () => {
    // 1. Arrange
    const userData = {
      name: "Kailash",
      email: "kailash_new@test.com",
      password: "securePassword123",
      phone: "98765432",
      address: "Singapore",
      answer: "Software"
    };
    const req = { body: userData };
    const res = { 
        status: jest.fn().mockReturnThis(), 
        send: jest.fn() 
    };

    // 2. Act
    await registerController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(201);
    
    const responseData = res.send.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe("User Register Successfully");

    // Integration check: Verify the user actually exists in the database
    const savedUser = await userModel.findOne({ email: userData.email });
    expect(savedUser).not.toBeNull();
    expect(savedUser.name).toBe(userData.name);
    
    // Ensure the password was hashed (not stored in plain text)
    expect(savedUser.password).not.toBe(userData.password);

    // Cleanup: Add the newly created user's ID to the list
    createdUserIds.push(savedUser._id);
  });
});