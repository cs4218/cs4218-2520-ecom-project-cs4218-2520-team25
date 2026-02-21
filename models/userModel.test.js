import userModel from "../models/userModel.js";

describe("User Model Schema Validation", () => {
  

  // Valid Data
  test("should validate a correct user object", async () => {
    // --- Arrange ---
    const validUser = {
      name: "Kailash",
      email: "test@example.com",
      password: "hashedpassword123",
      phone: "91234567",
      address: { street: "123 Main St", city: "Singapore" },
      answer: "Blue",
      role: 1,
    };

    // --- Act ---
    const user = new userModel(validUser);
    const err = user.validateSync(); 

    // --- Assert ---
    expect(err).toBeUndefined();
    expect(user.role).toBe(1); 
  });

  // Missing Required Fields
  test("should throw error if required fields are missing", () => {
    // --- Arrange ---
    const incompleteUser = {}; 

    // --- Act ---
    const user = new userModel(incompleteUser);
    const err = user.validateSync();

    // --- Assert ---
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.phone).toBeDefined();
    expect(err.errors.address).toBeDefined();
    expect(err.errors.answer).toBeDefined();
  });

  // Default Values
  test("should set default role to 0 if not provided", () => {
    // --- Arrange ---
    const user = new userModel({
        name: "Kailash",
        email: "k@test.com",
        password: "pw",
        phone: "123",
        address: {},
        answer: "ans"
    });

    // --- Act & Assert ---
    expect(user.role).toBe(0);
  });

});