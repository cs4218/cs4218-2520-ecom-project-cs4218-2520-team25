import request from "supertest";
import JWT from "jsonwebtoken";

import app from "../../app.js";
import userModel from "../../models/userModel.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import { hashPassword } from "../../helpers/authHelper.js";

// Han Tae Won (A0021684E)

describe("Braintree Payment API integration", () => {
  test("POST /api/v1/product/braintree/payment processes payment and creates order", async () => {
    const user = await new userModel({
      name: "Payment User",
      email: "payment-user@test.com",
      password: await hashPassword("password123"),
      phone: "11111111",
      address: "123 Payment Street",
      answer: "blue",
      role: 0,
    }).save();

    const category = await new categoryModel({
      name: "Electronics",
      slug: "electronics-payment",
    }).save();

    const product = await new productModel({
      name: "Keyboard",
      slug: "keyboard-payment",
      description: "Mechanical keyboard for typing and gaming use",
      price: 120,
      category: category._id,
      quantity: 10,
      shipping: true,
    }).save();

    const token = JWT.sign(
      { _id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = await request(app)
      .post("/api/v1/product/braintree/payment")
      .set("Authorization", token)
      .send({
        nonce: "fake-valid-nonce",
        cart: [product],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const orders = await orderModel.find({ buyer: user._id });
    expect(orders.length).toBeGreaterThan(0);
  });
});