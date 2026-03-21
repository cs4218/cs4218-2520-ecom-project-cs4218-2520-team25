import request from "supertest";
import JWT from "jsonwebtoken";

import app from "../../app.js";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Han Tae Won (A0021684E)

describe("Orders API integration", () => {
  test("GET /api/v1/auth/orders returns only the logged-in user's orders", async () => {
    const user1 = await new userModel({
      name: "User One",
      email: "user1@test.com",
      password: await hashPassword("password123"),
      phone: "11111111",
      address: "Address One",
      answer: "blue",
    }).save();

    const user2 = await new userModel({
      name: "User Two",
      email: "user2@test.com",
      password: await hashPassword("password123"),
      phone: "22222222",
      address: "Address Two",
      answer: "green",
    }).save();

    await orderModel.create([
      {
        buyer: user1._id,
        status: "Processing",
        payment: { success: true },
        products: [],
      },
      {
        buyer: user2._id,
        status: "Shipped",
        payment: { success: true },
        products: [],
      },
    ]);

    const token = JWT.sign(
      { _id: user1._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = await request(app)
      .get("/api/v1/auth/orders")
      .set("Authorization", token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("Processing");
    expect(res.body[0].buyer.name).toBe("User One");
  });
});