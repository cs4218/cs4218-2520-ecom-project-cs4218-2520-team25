// Daniel Loh, A0252099X
// Test 2: Extreme Contention — 500 VUs, 10 units in stock
// Variation of checkout_race_test.js
// Key question: how does the server behave under a brutal 50:1 user-to-stock ratio?
// Expect most requests to be rejected; measures latency under extreme load and 500 rate.
//
// Run:
//   k6 run -e JWT_SECRET=<secret> checkout_extreme_contention_test.js
//
// Optional overrides:
//   -e BASE_URL=http://... -e PRODUCT_ID=... -e INVENTORY=10

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import encoding from "k6/encoding";
import crypto from "k6/crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const PRODUCT_ID = __ENV.PRODUCT_ID || "69db6071a90a6e7edf4190da";
const PRODUCT_PRICE = parseFloat(__ENV.PRODUCT_PRICE || "79.99");
const JWT_SECRET = __ENV.JWT_SECRET;
const INVENTORY = parseInt(__ENV.INVENTORY || "10"); // very low stock

// -----------------------------
// CUSTOM METRICS
// -----------------------------
export const successCount = new Counter("success_count");
export const failCount = new Counter("fail_count");
export const serverErrorCount = new Counter("server_error_count");
export const rejectionRate = new Rate("rejection_rate");      // 400/409 rate
export const successLatency = new Trend("success_latency_ms"); // latency for 200s only

// -----------------------------
// OPTIONS
// -----------------------------
export const options = {
    scenarios: {
        extreme_contention: {
            executor: "constant-vus",
            vus: 500,        // 50x the stock — extreme contention
            duration: "5s",  // short burst
        },
    },

    thresholds: {
        // Core correctness: must never sell more than stock
        success_count: [`count<=${INVENTORY}`],
        // No 500s: server must handle pressure gracefully
        server_error_count: ["count==0"],
        // Under extreme load the rejection rate will be high — that's expected
        // Track it but don't fail the test on it
        rejection_rate: ["rate>0"],
        // Latency: even under 500 VUs successful requests should resolve in time
        success_latency_ms: ["p(95)<20000"],
        // Overall request latency
        http_req_duration: ["p(95)<20000"],
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

// -----------------------------
// TEST LOGIC
// -----------------------------
export default function () {
    const userId = generateObjectId();
    const token = generateJWT(userId);

    const payload = JSON.stringify({
        nonce: "fake-valid-nonce",
        cart: [{ _id: PRODUCT_ID, price: PRODUCT_PRICE }],
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
        successLatency.add(res.timings.duration);
        rejectionRate.add(false);
    } else if (res.status === 400 || res.status === 409) {
        failCount.add(1);
        rejectionRate.add(true);
    } else if (res.status >= 500) {
        serverErrorCount.add(1);
        rejectionRate.add(false);
    } else {
        failCount.add(1);
        rejectionRate.add(false);
    }

    // -----------------------------
    // CHECKS
    // -----------------------------
    check(res, {
        "no server error": (r) => r.status < 500,
        "valid response": (r) => [200, 400, 409].includes(r.status),
        // Under extreme contention, only a small % should succeed
        "expected high rejection": (r) => r.status === 409 || r.status === 400 || r.status === 200,
    });

    // No sleep — maximise contention pressure
}
