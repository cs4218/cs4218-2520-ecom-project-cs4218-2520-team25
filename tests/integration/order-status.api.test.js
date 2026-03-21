import request from "supertest";
import JWT from "jsonwebtoken";

import app from "../../app.js";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Han Tae Won (A0021684E)

describe("Order Status API integration", () => {
  test("PUT /api/v1/auth/order-status/:orderId allows admin to update order status", async () => {
    const admin = await new userModel({
      name: "Admin User",
      email: "admin-status@test.com",
      password: await hashPassword("password123"),
      phone: "99999999",
      address: "Admin Address",
      answer: "admin-answer",
      role: 1,
    }).save();

    const buyer = await new userModel({
      name: "Buyer User",
      email: "buyer-status@test.com",
      password: await hashPassword("password123"),
      phone: "11111111",
      address: "Buyer Address",
      answer: "blue",
      role: 0,
    }).save();

    const order = await new orderModel({
      buyer: buyer._id,
      status: "Processing",
      payment: { success: true },
      products: [],
    }).save();

    const token = JWT.sign(
      { _id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set("Authorization", token)
      .send({ status: "Shipped" });

    expect(res.status).toBe(200);
    expect(res.body._id.toString()).toBe(order._id.toString());
    expect(res.body.status).toBe("Shipped");

    const updatedOrder = await orderModel.findById(order._id);
    expect(updatedOrder.status).toBe("Shipped");
  });
});