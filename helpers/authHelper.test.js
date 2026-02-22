// Kailashwaran, A0253385Y; Entire file

import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper";

jest.mock("bcrypt");

describe("Password Utility Functions", () => {
  
  describe("hashPassword", () => {
    
    test("should return a hashed string when provided a valid password", async () => {
      // --- Arrange ---
      const plainPassword = "securePassword123";
      const mockHash = "$2b$10$mockHashedValue";

      bcrypt.hash.mockResolvedValue(mockHash);

      // --- Act ---
      const result = await hashPassword(plainPassword);

      // --- Assert ---
      expect(result).toBe(mockHash);

      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
    });


    test("should log an error and return undefined when hashing fails", async () => {
      // --- Arrange ---
      const plainPassword = "anyPassword";
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      bcrypt.hash.mockRejectedValue(new Error("Hashing failed"));

      // --- Act ---
      const result = await hashPassword(plainPassword);

      // --- Assert ---
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore(); 
    });
  });

  describe("comparePassword", () => {


    test("should return true when password matches the hash", async () => {
      // --- Arrange ---
      const password = "myPassword";
      const hash = "$2b$10$validHash";
      bcrypt.compare.mockResolvedValue(true);

      // --- Act ---
      const result = await comparePassword(password, hash);

      // --- Assert ---
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });


    test("should return false when password does not match the hash", async () => {
      // --- Arrange ---
      const password = "wrongPassword";
      const hash = "$2b$10$validHash";
      bcrypt.compare.mockResolvedValue(false);

      // --- Act ---
      const result = await comparePassword(password, hash);

      // --- Assert ---
      expect(result).toBe(false);
    });
  });
});