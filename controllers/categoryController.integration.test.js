import request from "supertest";
import app from "../app.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "../models/categoryModel.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

// Daniel Loh, A0252099X

let mongo;
let token;

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
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        await collections[key].deleteMany({});
    }

    const admin = await new userModel({
        name: "Admin User",
        email: "admin@test.com",
        password: await hashPassword("password123"),
        phone: "99999999",
        address: "Admin Address",
        answer: "admin-answer",
        role: 1,
    }).save();

    token = JWT.sign(
        { _id: admin._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
});

describe("Category Controller Integration Tests", () => {

    // Create Category
    it("should create a new category", async () => {
        const res = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", token)
            .send({ name: "Fish Tank" });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.category.name).toBe("Fish Tank");

        const dbCategory = await categoryModel.findOne({ name: "Fish Tank" });
        expect(dbCategory).not.toBeNull();
    });

    it("should not create category without name", async () => {
        const res = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", token)
            .send({});

        expect(res.statusCode).toBe(401);
    });

    it("should not create duplicate category", async () => {
        await new categoryModel({ name: "Fish" }).save();

        const res = await request(app)
            .post("/api/v1/category/create-category")
            .set("Authorization", token)
            .send({ name: "Fish" });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Category Already Exists");
    });

    // GET ALL CATEGORIES
    it("should get all categories", async () => {
        await categoryModel.create([{ name: "Fish", slug: "fish" }, { name: "Tank", slug: "tank" }]);

        const res = await request(app).get("/api/v1/category/get-category");

        expect(res.statusCode).toBe(200);
        expect(res.body.category.length).toBe(2);
    });

    // GET SINGLE CATEGORY
    it("should get single category by slug", async () => {
        await categoryModel.create({ name: "Fish Tank", slug: "fish-tank" });

        const res = await request(app).get(
            "/api/v1/category/single-category/fish-tank"
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.category.name).toBe("Fish Tank");
    });

    // UPDATE CATEGORY
    it("should update category", async () => {
        const category = await categoryModel.create({ name: "Old Name" });

        const res = await request(app)
            .put(`/api/v1/category/update-category/${category._id}`)
            .set("Authorization", token)
            .send({ name: "New Name" });

        expect(res.statusCode).toBe(200);
        expect(res.body.category.name).toBe("New Name");

        const updated = await categoryModel.findById(category._id);
        expect(updated.name).toBe("New Name");
    });

    // DELETE CATEGORY
    it("should delete category", async () => {
        const category = await categoryModel.create({ name: "To Delete" });

        const res = await request(app)
            .delete(
                `/api/v1/category/delete-category/${category._id}`
            )
            .set("Authorization", token);

        expect(res.statusCode).toBe(200);

        const deleted = await categoryModel.findById(category._id);
        expect(deleted).toBeNull();
    });
});