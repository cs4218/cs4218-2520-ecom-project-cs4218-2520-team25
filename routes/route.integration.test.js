import request from "supertest";
import app from "../app.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

jest.setTimeout(20000);

let mongo;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
});

beforeEach(async () => {
    // clear DB between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
});

describe("Route integration tests - basic route wiring and auth", () => {
    it("root route responds with welcome HTML", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.text).toMatch(/Welcome to ecommerce app/);
    });

    it("category listing returns empty array when none exist", async () => {
        const res = await request(app).get("/api/v1/category/get-category");
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("category");
        expect(Array.isArray(res.body.category)).toBe(true);
        expect(res.body.category.length).toBe(0);
    });

    it("protected user-auth fails without token and succeeds with valid token", async () => {
        // without token
        const unauth = await request(app).get("/api/v1/auth/user-auth");
        // middleware returns 500 and message on missing/invalid token
        expect(unauth.statusCode).toBe(401);
        expect(unauth.body).toHaveProperty("message", "Unauthorized: No token provided");

        // create a normal user and sign token
        const user = await userModel.create({
            name: "Normal",
            email: "normal@test.com",
            password: await hashPassword("password123"),
            phone: "12345678",
            address: "addr",
            answer: "ans",
        });

        const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        const auth = await request(app).get("/api/v1/auth/user-auth").set("Authorization", token);
        expect(auth.statusCode).toBe(200);
        expect(auth.body).toEqual({ ok: true });
    });

    it("create-category requires admin and succeeds with admin token", async () => {
        // create admin user
        const admin = await userModel.create({
            name: "Admin",
            email: "admin@test.com",
            password: await hashPassword("password123"),
            phone: "99999999",
            address: "admin address",
            answer: "a",
            role: 1,
        });

        const token = JWT.sign({ _id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        const res = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", token)
            .send({ name: "TestCategory" });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeTruthy();
        expect(res.body.category.name).toBe("TestCategory");

        // persisted in DB
        const db = await categoryModel.findOne({ name: "TestCategory" });
        expect(db).not.toBeNull();
    });
});
