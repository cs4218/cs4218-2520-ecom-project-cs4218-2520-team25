import request from "supertest";
import app from "../../app.js";

// Han Tae Won (A0021684E)

describe("Braintree Token API integration", () => {
  test("GET /api/v1/product/braintree/token returns a client token", async () => {
    const res = await request(app).get("/api/v1/product/braintree/token");

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.clientToken).toBeDefined();
    expect(typeof res.body.clientToken).toBe("string");
    expect(res.body.clientToken.length).toBeGreaterThan(0);
  });
});