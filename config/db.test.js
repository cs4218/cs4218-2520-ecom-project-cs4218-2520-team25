import mongoose from "mongoose";
import connectDB from "../config/db.js"; // adjust path

jest.mock("mongoose");

describe("connectDB", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it("should connect to MongoDB and log success message", async () => {
        process.env.MONGO_URL = "mongodb://localhost:27017/testdb";

        const mockConnection = {
            connection: {
                host: "localhost",
            },
        };

        mongoose.connect.mockResolvedValue(mockConnection);

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await connectDB();

        expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URL);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Connected To Mongodb Database localhost")
        );

        consoleSpy.mockRestore();
    });

    it("should log error if connection fails", async () => {
        process.env.MONGO_URL = "mongodb://localhost:27017/testdb";

        const mockError = new Error("Connection failed");
        mongoose.connect.mockRejectedValue(mockError);

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await connectDB();

        expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URL);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Error in Mongodb")
        );

        consoleSpy.mockRestore();
    });
});