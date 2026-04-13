// Daniel Loh, A0252099X
// Test 1: Variable Cart Size (1–5 items per checkout)
// Variation of checkout_race_test.js
// Key question: does the server prevent overselling when users buy varying quantities?
//
// Run:
//   k6 run -e JWT_SECRET=<secret> checkout_variable_cart_test.js
//
// Optional overrides:
//   -e BASE_URL=http://... -e INVENTORY=100

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import encoding from "k6/encoding";
import crypto from "k6/crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const JWT_SECRET = __ENV.JWT_SECRET;
const INVENTORY = parseInt(__ENV.INVENTORY || "100");

// Single product pool — only one product is available with limited stock
const PRODUCT_ID = __ENV.PRODUCT_ID || "69db6071a90a6e7edf4190da";
const PRODUCT_PRICE = parseFloat(__ENV.PRODUCT_PRICE || "79.99");

// -----------------------------
// CUSTOM METRICS
// -----------------------------
export const successCount = new Counter("success_count");
export const failCount = new Counter("fail_count");
export const serverErrorCount = new Counter("server_error_count");
export const unitsAttempted = new Counter("units_attempted");  // tracks total qty attempted
export const unitsSold = new Counter("units_sold");       // tracks total qty sold on 200s

// -----------------------------
// OPTIONS
// -----------------------------
export const options = {
    scenarios: {
        variable_cart_spike: {
            executor: "constant-vus",
            vus: 200,       // same concurrency as baseline
            duration: "10s", // slightly longer to ensure all carts get processed
        },
    },

    thresholds: {
        // No server errors
        server_error_count: ["count==0"],
        // Units sold must never exceed inventory (core oversell check)
        // Note: units_sold tracks cumulative qty from 200 responses;
        // a stricter check would be done server-side via DB audit.
        units_sold: [`count<=${INVENTORY}`],
        // Latency tolerance: allow more headroom since carts can be larger
        http_req_duration: ["p(95)<20000"],
        // Failure rate: majority of requests should resolve (200 or 400/409)
        http_req_failed: ["rate<0.6"],
    },
};

// -----------------------------
// HELPERS
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

function generateObjectId() {
    const chars = "abcdef0123456789";
    let str = "";
    for (let i = 0; i < 24; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}

// Returns a random integer in [min, max] inclusive
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Build a cart with `qty` units of the single product
function buildCart(qty) {
    const items = [];
    for (let i = 0; i < qty; i++) {
        items.push({ _id: PRODUCT_ID, price: PRODUCT_PRICE });
    }
    return items;
}

// -----------------------------
// TEST LOGIC
// -----------------------------
export default function () {
    const userId = generateObjectId();
    const token = generateJWT(userId);

    // Each VU picks a random cart size of 1–5 units
    const cartQty = randInt(1, 5);
    const cart = buildCart(cartQty);

    const payload = JSON.stringify({
        nonce: "fake-valid-nonce",
        cart,
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            Authorization: token,
        },
    };

    unitsAttempted.add(cartQty);

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
        unitsSold.add(cartQty); // assume server fulfilled the full cart on 200
    } else if (res.status === 400 || res.status === 409) {
        failCount.add(1);       // expected rejection: out of stock / validation error
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

    sleep(Math.random() * 0.2);
}
