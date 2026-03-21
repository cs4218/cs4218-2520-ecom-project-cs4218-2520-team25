import request from "supertest";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../../app.js";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Han Tae Won (A0021684E)

describe("Admin Orders API integration", () => {
  test("GET /api/v1/auth/all-orders returns all orders for an admin user", async () => {
    const admin = await new userModel({
      name: "Admin User",
      email: "admin@test.com",
      password: await hashPassword("password123"),
      phone: "99999999",
      address: "Admin Address",
      answer: "admin-answer",
      role: 1,
    }).save();

    const user1 = await new userModel({
      name: "User One",
      email: "user1@test.com",
      password: await hashPassword("password123"),
      phone: "11111111",
      address: "Address One",
      answer: "blue",
      role: 0,
    }).save();

    const user2 = await new userModel({
      name: "User Two",
      email: "user2@test.com",
      password: await hashPassword("password123"),
      phone: "22222222",
      address: "Address Two",
      answer: "green",
      role: 0,
    }).save();

    const category = await new categoryModel({
      name: "Electronics",
      slug: "electronics",
    }).save();

    const product1 = await new productModel({
      name: "Keyboard",
      slug: "keyboard",
      description: "Mechanical keyboard for typing and gaming use",
      price: 120,
      category: category._id,
      quantity: 10,
      shipping: true,
    }).save();

    const product2 = await new productModel({
      name: "Mouse",
      slug: "mouse",
      description: "Wireless mouse for daily productivity work",
      price: 80,
      category: category._id,
      quantity: 15,
      shipping: true,
    }).save();

    await orderModel.create([
      {
        buyer: user1._id,
        status: "Processing",
        payment: { success: true },
        products: [product1._id],
      },
      {
        buyer: user2._id,
        status: "Shipped",
        payment: { success: false },
        products: [product2._id],
      },
    ]);

    const token = JWT.sign(
      { _id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = await request(app)
      .get("/api/v1/auth/all-orders")
      .set("Authorization", token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    const statuses = res.body.map((order) => order.status);
    expect(statuses).toContain("Processing");
    expect(statuses).toContain("Shipped");

    const buyerNames = res.body.map((order) => order.buyer.name);
    expect(buyerNames).toContain("User One");
    expect(buyerNames).toContain("User Two");

    expect(res.body[0].products).toBeDefined();
    expect(Array.isArray(res.body[0].products)).toBe(true);
  });
});