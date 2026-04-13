// Daniel Loh, A0252099X
// Code was generated with the help of AI

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import encoding from "k6/encoding";
import crypto from "k6/crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = "http://localhost:6060";
const PRODUCT_ID = "69db6071a90a6e7edf4190da";
const PRODUCT_PRICE = 79.99
const JWT_SECRET = __ENV.JWT_SECRET;
const INVENTORY = 100;

// -----------------------------
// CUSTOM METRICS
// -----------------------------
export const successCount = new Counter("success_count");
export const failCount = new Counter("fail_count");
export const serverErrorCount = new Counter("server_error_count");

// -----------------------------
// OPTIONS
// -----------------------------
export const options = {
    scenarios: {
        spike_test: {
            executor: "constant-vus",
            vus: 200,           // simulate 200 concurrent buyers
            duration: "5s",     // short burst = real contention
        },
    },

    thresholds: {
        http_req_failed: ["rate==0.5"],       // <5% unexpected failures
        http_req_duration: ["p(95)<15000"],     // latency under load
        success_count: [`count<=${INVENTORY}`], // CRITICAL: no oversell
        server_error_count: ["count==0"],     // NO 500s allowed
    },
};

// -----------------------------
// HELPER: Generate JWT (HS256)
// -----------------------------
function generateJWT(userId) {
    const header = encoding.b64encode(JSON.stringify({
        alg: "HS256",
        typ: "JWT",
    }), "rawurl");

    const payload = encoding.b64encode(JSON.stringify({
        _id: userId,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    }), "rawurl");

    const unsignedToken = `${header}.${payload}`;

    const signature = encoding.b64encode(
        crypto.hmac("sha256", JWT_SECRET, unsignedToken, "binary"),
        "rawurl"
    );

    return `${unsignedToken}.${signature}`;
}

// -----------------------------
// HELPER: Generate Generate Mongo ObjectID
// -----------------------------
function generateObjectId() {
    const chars = "abcdef0123456789";
    let str = "";
    for (let i = 0; i < 24; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

// -----------------------------
// TEST LOGIC
// -----------------------------
export default function () {
    // unique "user"
    const userId = generateObjectId();
    const token = generateJWT(userId);

    const payload = JSON.stringify({
        nonce: "fake-valid-nonce",
        cart: [{
            _id: PRODUCT_ID,
            price: PRODUCT_PRICE
        }],
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            Authorization: token,
        },
    };

    const res = http.post(
        `${BASE_URL}/api/v1/product/braintree/payment`,
        payload,
        params
    );

    // -----------------------------
    // CLASSIFY RESPONSE
    // -----------------------------
    if (res.status === 200) {
        successCount.add(1);
    } else if (res.status === 400 || res.status === 409) {
        // expected: out of stock / rejected
        failCount.add(1);
    } else if (res.status >= 500) {
        serverErrorCount.add(1);
    } else {
        failCount.add(1);
    }

    // -----------------------------
    // CHECKS
    // -----------------------------
    check(res, {
        "no server error": (r) => r.status < 500,
        "valid response": (r) => [200, 400, 409].includes(r.status),
    });

    // tiny jitter (optional realism)
    sleep(Math.random() * 0.2);
}