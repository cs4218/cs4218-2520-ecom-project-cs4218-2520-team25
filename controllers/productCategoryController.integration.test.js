import request from "supertest";
import app from "../app.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

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
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe("Product Category Integration - GET /api/v1/product/product-category/:slug", () => {
    it("returns category and its products when category exists", async () => {
        const category = await categoryModel.create({ name: "Fish Tank", slug: "fish-tank" });

        const product = await productModel.create({
            name: "Goldfish",
            slug: "goldfish",
            description: "Small orange fish",
            price: 5,
            category: category._id,
            quantity: 10,
        });

        const res = await request(app).get(`/api/v1/product/product-category/${category.slug}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeTruthy();
        expect(res.body.category.name).toBe("Fish Tank");
        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products.length).toBe(1);
        const fetched = res.body.products[0];
        expect(fetched.name).toBe("Goldfish");
        // category should be populated
        expect(fetched.category).toBeTruthy();
        expect(fetched.category.name).toBe("Fish Tank");
        expect(fetched.category.slug).toBe("fish-tank");
    });

    it("returns category with empty products array when category has no products", async () => {
        const category = await categoryModel.create({ name: "Plants", slug: "plants" });

        const res = await request(app).get(`/api/v1/product/product-category/${category.slug}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeTruthy();
        expect(res.body.category.name).toBe("Plants");
        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products.length).toBe(0);
    });

    it("returns success with category null and no products when slug does not exist", async () => {
        const res = await request(app).get(`/api/v1/product/product-category/nonexistent-slug`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeNull();
        expect(Array.isArray(res.body.products)).toBe(true);
        expect(res.body.products.length).toBe(0);
    });

    it("populates multiple products and does not leak photo buffer in JSON", async () => {
        const category = await categoryModel.create({ name: "Aquaria", slug: "aquaria" });

        await productModel.create([
            {
                name: "Fish A",
                slug: "fish-a",
                description: "A",
                price: 1,
                category: category._id,
                quantity: 2,
            },
            {
                name: "Fish B",
                slug: "fish-b",
                description: "B",
                price: 2,
                category: category._id,
                quantity: 3,
            },
        ]);

        const res = await request(app).get(`/api/v1/product/product-category/${category.slug}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.products.length).toBe(2);
        // JSON returned by API should not include raw Buffer fields for photo
        res.body.products.forEach((p) => {
            expect(p).not.toHaveProperty("photo.data");
        });
    });
});
