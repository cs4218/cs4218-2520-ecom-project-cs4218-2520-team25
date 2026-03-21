import { loginController, registerController, forgotPasswordController, updateProfileController } from "../controllers/authController";
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


describe("Forgot Password Controller Integration Tests", () => {
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

  //  Missing Fields

  test("test_forgot_password_missing_fields_returns_400", async () => {
    // 1. Arrange
    const req = {
      body: {
        email: "test@test.com",
        answer: "blue",
        // newPassword missing
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // 2. Act
    await forgotPasswordController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "New Password is required" })
    );
  });

  // Incorrect Answer/Email Combination 

  test("test_forgot_password_wrong_answer_returns_401", async () => {
    // 1. Arrange
    const email = "security@test.com";
    const user = await new userModel({
      name: "Security User",
      email: email,
      password: "oldPasswordHash",
      phone: "123",
      address: "123",
      answer: "CorrectAnswer", // Set correct answer in DB
    }).save();
    createdUserIds.push(user._id);

    const req = {
      body: {
        email: email,
        answer: "WrongAnswer", // Provide incorrect answer
        newPassword: "newSecurePassword",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // 2. Act
    await forgotPasswordController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Wrong Email Or Answer",
      })
    );
  });

  // Successful Password Reset

  test("test_forgot_password_valid_reset_updates_db_and_returns_200", async () => {
    // 1. Arrange
    const email = "reset@test.com";
    const secretAnswer = "MyFirstPet";
    const oldPassword = "oldPassword123";
    const newPassword = "brandNewPassword456";

    const user = await new userModel({
      name: "Reset User",
      email: email,
      password: await hashPassword(oldPassword),
      phone: "555555",
      address: "Road",
      answer: secretAnswer,
    }).save();
    createdUserIds.push(user._id);

    const req = {
      body: {
        email: email,
        answer: secretAnswer,
        newPassword: newPassword,
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // 2. Act
    await forgotPasswordController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Password Reset Successfully",
      })
    );

    // Integration check: Retrieve user from DB and verify the password has changed
    const updatedUser = await userModel.findById(user._id);
    
    // Check that the new password is NOT the old one and NOT the plain text new password
    expect(updatedUser.password).not.toBe(user.password);
    expect(updatedUser.password).not.toBe(newPassword);
    
    
  });
});


describe("Update Profile Controller Integration Tests", () => {
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

  // Password Length 

  test("test_updateProfile_short_password_returns_error_json", async () => {
    // 1. Arrange
    const userId = new mongoose.Types.ObjectId();
    const req = {
      user: { _id: userId },
      body: { password: "123" } // Boundary: < 6 characters
    };
    const res = { 
      json: jest.fn() 
    };

    // 2. Act
    await updateProfileController(req, res);

    // 3. Assert
    expect(res.json).toHaveBeenCalledWith({
      error: "Password is required and at least 6 characters long"
    });
  });

  //  Partial Update (No Password)

  test("test_updateProfile_name_only_updates_correctly", async () => {
    // 1. Arrange
    const originalUser = await new userModel({
      name: "Old Name",
      email: "update@test.com",
      password: "hashedPassword123",
      phone: "111",
      address: "Old Address",
      answer: "secret"
    }).save();
    createdUserIds.push(originalUser._id);

    const req = {
      user: { _id: originalUser._id },
      body: { name: "New Name" } // Only updating name
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    // 2. Act
    await updateProfileController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.send.mock.calls[0][0];
    
    expect(responseData.updatedUser.name).toBe("New Name");
    expect(responseData.updatedUser.phone).toBe("111"); // Should remain unchanged
    
    // Database Verification
    const dbUser = await userModel.findById(originalUser._id);
    expect(dbUser.name).toBe("New Name");
  });

  // Full Profile Update with Password 

  test("test_updateProfile_all_fields_success", async () => {
    // 1. Arrange
    const user = await new userModel({
      name: "Kailash",
      email: "kailash@test.com",
      password: "oldHash",
      phone: "000",
      address: "Old Singapore",
      answer: "Software"
    }).save();
    createdUserIds.push(user._id);

    const newPassword = "newSecurePassword789";
    const req = {
      user: { _id: user._id },
      body: {
        name: "Kailash Updated",
        phone: "999",
        address: "New Singapore",
        password: newPassword
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    // 2. Act
    await updateProfileController(req, res);

    // 3. Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      message: "Profile Updated Successfully"
    }));

    // Verification of Hash Integration
    const updatedDbUser = await userModel.findById(user._id);
    expect(updatedDbUser.name).toBe("Kailash Updated");
    expect(updatedDbUser.password).not.toBe("oldHash");
    expect(updatedDbUser.password).not.toBe(newPassword); 
  });
});