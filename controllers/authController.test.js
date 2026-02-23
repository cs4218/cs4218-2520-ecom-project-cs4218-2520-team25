import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController, registerController, loginController, forgotPasswordController, testController } from "../controllers/authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken"

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

const mockReq = (overrides = {}) => ({
    body: {},
    params: {},
    user: {},
    ...overrides
})

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
  return res;
}

const makeUser = (overrides = {}) => ({
        name: "bob",
        email: "bob@gmail.com",
        password: "password",
        phone: "92156584",
        address: {},
        answer: "wat",
        role: 0,
        ...overrides
    });

const makeOrder = (overrides = {}) => ({
  _id: "order-1",
  products: [
    {
      _id: "prod-1",
      name: "Laptop",
      price: 2000
    }
  ],
  buyer: {
    _id: 1,
    name: "Bob"
  },
  payment: { method: "card", amount: 2000 },
  status: "Processing",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});


describe("updateProfileController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Owen Yeo Le Yang A0252047L
    it("Should reject short password", async () => {
        const shortPasswordReq = mockReq({body: {password: "abc"}, user: {_id: 1}});
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        await updateProfileController(shortPasswordReq, res);
        
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({ error: "Password is required and at least 6 characters long" });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });
    
    // Owen Yeo Le Yang A0252047L
    it("Should reject empty password", async () => {
        const shortPasswordReq = mockReq({body: {password: ""}, user: {_id: 1}});
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        await updateProfileController(shortPasswordReq, res);
        
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({ error: "Password is required and at least 6 characters long" });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });


    // Owen Yeo Le Yang A0252047L
    it("Should update name, phone, password and address successfully", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                password: "longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        hashPassword.mockResolvedValue("hashed-longpassword")
        
        const updatedUser = makeUser({
            name: "bobby", 
            password: "hashed-longpassword", 
            phone: 91234567,
            address: {home: "yes"}
        })
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "hashed-longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: updatedUser
        });
    });

    // Owen Yeo Le Yang A0252047L
    it("Should use defaults successfully", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());
        
        const updatedUser = makeUser({
            name: "bobby", 
            phone: 91234567,
            address: {home: "yes"}
        })
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "password", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: updatedUser
        });
    });

        // Owen Yeo Le Yang A0252047L
        it("Should return 400 if update throws error", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                password: "longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        hashPassword.mockResolvedValue("hashed-longpassword")
        
        const updatedUser = makeUser({
            name: "bobby", 
            password: "hashed-longpassword", 
            phone: 91234567,
            address: {home: "yes"}
        });

        const error = Error("User update failed!");
        userModel.findByIdAndUpdate.mockRejectedValue(error);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "hashed-longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Updating profile",
            error,
        });
    })
})

describe("getOrdersController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Owen Yeo Le Yang A0252047L
    it("Should get orders successfully", async () => {
        const fakeOrders = [makeOrder()]
        const query = {
            populate: jest.fn().mockReturnThis(),
            then: (resolve) => resolve(fakeOrders),
        }
        orderModel.find.mockReturnValue(query);

        const req = mockReq({user:{_id:1}});
        const res = mockRes();

        await getOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({buyer: 1});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");

        expect(res.json).toHaveBeenCalledWith(fakeOrders)
    })

    // Owen Yeo Le Yang A0252047L
    it("Should throw 500 when there is an error", async () => {
        const error = Error("Invalid User ID");
        const query = {
            populate: jest.fn().mockReturnThis(),
            then: (_resolve, reject) => reject(error)
        };
        orderModel.find.mockReturnValue(query);
        const req = mockReq({user: {_id: 1}});
        const res = mockRes();

        await getOrdersController(req, res)

        expect(orderModel.find).toHaveBeenCalledWith({buyer: 1});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error,
        });

        expect(res.json).not.toHaveBeenCalled();
    })
});

describe("getAllOrdersController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Owen Yeo Le Yang A0252047L
    it("should fetch all orders, populate products and buyer, sort by createdAt desc, and return via res.json", async () => {
        // arrange
        const fakeOrders = [
            makeOrder({ _id: "order-1" }),
            makeOrder({ _id: "order-2", status: "Shipped" }),
        ];

        const req = mockReq();
        const res = mockRes();

        const query = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            then: (resolve) => resolve(fakeOrders),
        };
        orderModel.find.mockReturnValue(query);

        // act
        await getAllOrdersController(req, res);

        // assert: query chain
        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
        expect(query.sort).toHaveBeenCalledWith({ createdAt: "-1" });

        // assert: response
        expect(res.json).toHaveBeenCalledWith(fakeOrders);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });
    // Owen Yeo Le Yang A0252047L
    it("Should throw 500 when there is an error", async () => {
        const error = Error("Invalid User ID");
        const query = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            then: (_resolve, reject) => reject(error),
        };

        orderModel.find.mockReturnValue(query);
        const req = mockReq();
        const res = mockRes();

        await getAllOrdersController(req, res)

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
        expect(query.sort).toHaveBeenCalledWith({ createdAt: "-1" });

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error,
        });
    })
});

describe("orderStatusController", () => {
    beforeEach(()=> {
        jest.clearAllMocks();
    });

    // Owen Yeo Le Yang A0252047L
    it("should update order status when given orderId and status", async () => {
        const res = mockRes();
        const req = mockReq({
            params: { orderId: "order-123" },
            body: { status: "Completed"}, 
        });

        const updated = makeOrder({ _id: "order-123", status: "Completed" });
        orderModel.findByIdAndUpdate.mockResolvedValue(updated);

        await orderStatusController(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "order-123",
            { status: "Completed" },
            {new: true}
        );
        expect(res.json).toHaveBeenCalledWith(updated);
    });

    // Owen Yeo Le Yang A0252047L
    it("should catch synchronous throws from findByIdAndUpdate and return 500", async () => {
        // Rare, but useful to prove try/catch catches sync throws too.
        const req = mockReq({
            params: { orderId: "order-123" },
            body: { status: "Processing" },
        });
        const res = mockRes();

        const err = new Error("sync throw");
        orderModel.findByIdAndUpdate.mockImplementation(() => {
            throw err;
        });

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Updating Order",
            error: err,
        });
        expect(res.json).not.toHaveBeenCalled();
    });
})


// Kailashwaran, A0253385Y
describe("Auth Controllers", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("registerController", () => {
    // Validation Failures
    test("should return error if name is missing", async () => {
      // Arrange
      req.body = {};

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });

    });

    test("should return error if email is missing", async () => {
      // Arrange
      req.body = { name: "Kailash" };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });

    });

    test("should return error if password is missing", async () => {
      // Arrange
      req.body = { name: "Kailash", email: "test@test.com" };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });
    });

    test("should return error if phone is missing", async () => {
      // Arrange
      req.body = { name: "Kailash", email: "test@test.com", password: "123" };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });

    });

    test("should return error if address is missing", async () => {
      // Arrange
      req.body = { name: "Kailash", email: "test@test.com", password: "123", phone: "123" };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });

    });

    test("should return error if answer is missing", async () => {
      // Arrange
      req.body = { name: "Kailash", email: "test@test.com", password: "123", phone: "123", address: "SG" };

      // Act
      await registerController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });
      

    // Existing User
    test("should return 200 if user already exists", async () => {
      // Arrange
      req.body = { name: "Kailash", email: "existing@test.com", password: "123", phone: "123", address: "SG", answer: "blue" };
      userModel.findOne.mockResolvedValue({ email: "existing@test.com" });

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "User already registered please login" }));
    });

    test("should register user successfully", async () => {
      // Arrange
      const userData = { name: "Kailash", email: "new@test.com", password: "123", phone: "123", address: "SG", answer: "blue" };
      req.body = userData;
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPwd");
      
      const saveSpy = jest.fn().mockResolvedValue({ ...userData, password: "hashedPwd" });
      userModel.prototype.save = saveSpy; 

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    // Registration failed
    test("should return error if registration fails", async () => {
      // Arrange
      const userData = { name: "Kailash", email: "new@test.com", password: "123", phone: "123", address: "SG", answer: "blue" };
      req.body = userData;
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPwd");
      
      
      const saveSpy = jest.fn().mockRejectedValue(new Error("Registration failed"));
      userModel.prototype.save = saveSpy; 

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: "Error in Registeration" }));
    });
  });

  
  describe("loginController", () => {
    // Invalid password
    test("should return 200 and success false for invalid password", async () => {
      // Arrange
      req.body = { email: "test@test.com", password: "wrong" };
      userModel.findOne.mockResolvedValue(makeUser());
      comparePassword.mockResolvedValue(false);

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid Password" }));
    });

    // Successful login
    test("should return 200 and token on successful login", async () => {
      // Arrange
      req.body = { email: "test@test.com", password: "right" };
      userModel.findOne.mockResolvedValue(makeUser());
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("mockToken");

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ token: "mockToken", success: true }));
    });

    // Missing password
    test("should return 400 if password is missing", async () => {
      // Arrange
      req.body = { email: "test@test.com" }; 

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Email and password is required" }));
    });

    // User not regiestered
    test("should return 400 if user is not registered", async () => {
      // Arrange
      req.body = { email: "nonexistent@test.com", password: "password" };
      userModel.findOne.mockResolvedValue(null);

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Email is not registerd" }));
    });

    // Error during login
    test("should return 500 if an error occurs during login", async () => {
      // Arrange
      req.body = { email: "test@test.com", password: "password" };
      userModel.findOne.mockRejectedValue(new Error("Database error"));

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  
  describe("forgotPasswordController", () => {
    // Invalid details
    test("should return 401 if user not found with provided email and answer", async () => {
      // Arrange
      req.body = { email: "test@test.com", answer: "wrong", newPassword: "new" };
      userModel.findOne.mockResolvedValue(null);

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Wrong Email Or Answer" }));
    });

    test("should reset password successfully", async () => {
      // Arrange
      req.body = { email: "test@test.com", answer: "blue", newPassword: "new" };
      userModel.findOne.mockResolvedValue({ _id: "123" });
      hashPassword.mockResolvedValue("newHashed");
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: "123", password: "newHashed" });

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("123", { password: "newHashed" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Password Reset Successfully" }));
    });

    // Missing email
    test("should return 400 if email is missing", async () => {
      // Arrange
      req.body = { answer: "blue", newPassword: "new" };

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Email is required" }));
    });

    // Missing answer
    test("should return 400 if answer is missing", async () => {
      // Arrange
      req.body = { email: "test@test.com", newPassword: "new" };

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "answer is required" }));
    });

    // Missing newPassword
    test("should return 400 if newPassword is missing", async () => {
      // Arrange
      req.body = { email: "test@test.com", answer: "blue" };

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "New Password is required" }));
    });

    // Missing answer
    test("should return 400 if answer is missing", async () => {
      // Arrange
      req.body = { email: "test@test.com", newPassword: "new" };

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "answer is required" }));
    });

    // Missing email
    test("should return 400 if email is missing", async () => {
      // Arrange
      req.body = { answer: "blue", newPassword: "new" };

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Email is required" }));
    });

    // Error in password reset
    test("should return 500 if an error occurs during password reset", async () => {
      // Arrange
      req.body = { email: "test@test.com", answer: "blue", newPassword: "new" };
      userModel.findOne.mockRejectedValue(new Error("Database error"));

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: "Something went wrong" }));
    });
  });


  describe("testController", () => {

    test("should send 'Protected Routes' string on successful execution", () => {
      // --- Arrange ---

      // --- Act ---
      testController(req, res);

      // --- Assert ---
      expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });

    test("should send error object if an exception occurs", () => {
        // --- Arrange ---
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const mockError = new Error("Test Error");
      res.send.mockImplementationOnce(() => {
        throw mockError;
      });

      // --- Act ---
      testController(req, res);

      // --- Assert ---
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      expect(res.send).toHaveBeenCalledWith({ error: mockError });

      consoleSpy.mockRestore();
    });
  });

});