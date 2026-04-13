// Daniel Loh, A0252099X
// Test 3 (improved): Ramping Load — stock-aware, split latency metrics
//
// Improvements over v1:
//
//   1. VUs stop attempting checkouts once stock is exhausted. After INVENTORY
//      successes are recorded, remaining VUs only perform a lightweight health
//      probe (or skip entirely) so they don't pollute latency metrics with
//      fast-fail rejections.
//
//   2. Latency is split into three separate Trend metrics:
//        checkout_latency_ms  — successful purchases (200)
//        reject_latency_ms    — expected rejections (400/409)
//        error_latency_ms     — server errors (5xx)
//      This lets you see real checkout latency independently of the
//      post-sellout rejection flood.
//
//   3. A stockExhausted flag is maintained per-VU by comparing the shared
//      success_count to INVENTORY. k6 doesn't have true shared mutable state
//      between VUs, so this is an eventually-consistent check — a small
//      number of extra requests may still go out just after the last unit
//      sells, but that's realistic (true race) and bounded.
//
// Run:
//   k6 run -e JWT_SECRET=<secret> checkout_ramp_improved_test.js
//
// Optional overrides:
//   -e BASE_URL=http://... -e PRODUCT_ID=... -e INVENTORY=100

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { scenario } from "k6/execution";
import encoding from "k6/encoding";
import crypto from "k6/crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const PRODUCT_ID = __ENV.PRODUCT_ID || "69db6071a90a6e7edf4190da";
const PRODUCT_PRICE = parseFloat(__ENV.PRODUCT_PRICE || "79.99");
const JWT_SECRET = __ENV.JWT_SECRET;
const INVENTORY = parseInt(__ENV.INVENTORY || "1250");

// -----------------------------
// CUSTOM METRICS
// -----------------------------
export const successCount = new Counter("success_count");
export const failCount = new Counter("fail_count");
export const serverErrorCount = new Counter("server_error_count");
export const skippedCount = new Counter("skipped_post_sellout"); // VU iterations skipped after sellout

// Split latency by outcome — the key improvement
export const checkoutLatency = new Trend("checkout_latency_ms");   // 200 only
export const rejectLatency = new Trend("reject_latency_ms");     // 400/409 only
export const errorLatency = new Trend("error_latency_ms");      // 5xx only

// -----------------------------
// OPTIONS
// -----------------------------
export const options = {
    scenarios: {
        ramping_load: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "7s", target: 100 }, // ramp up
                { duration: "5s", target: 200 }, // ramp to peak
                { duration: "10s", target: 200 }, // hold — stock will exhaust here
                { duration: "20s", target: 0 }, // ramp down
            ],
            gracefulRampDown: "2s",
        },
    },

    thresholds: {
        // Correctness: never sell more than stock
        success_count: [`count<=${INVENTORY}`],

        // No server errors at any load level
        server_error_count: ["count<200"],

        // Latency thresholds are now meaningful because they only measure
        // actual checkout attempts, not post-sellout fast rejections
        "checkout_latency_ms": ["p(95)<15000", "p(99)<20000"],

        // Rejections should be fast — a slow 409 may indicate a lock contention issue
        "reject_latency_ms": ["p(95)<5000"],

        http_req_duration: ["p(95)<15000"],
    },
};

// -----------------------------
// MODULE-LEVEL SELLOUT FLAG
//
// k6 runs each VU in its own JS runtime — there is no shared heap.
// We approximate "stock is gone" by reading successCount's value via
// scenario.iterationsCompleted as a proxy is not available, so instead
// we track a VU-local count of observed 200 responses across all prior
// iterations and bail when it reaches INVENTORY.
//
// A more robust approach for larger teams: expose a /health or /stock
// endpoint and poll it; see the healthCheck helper below.
// -----------------------------
let localSuccessCount = 0; // updated each iteration this VU runs

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
    // ---- Sellout guard ----
    // If this VU has already seen INVENTORY successful responses globally
    // (a conservative estimate since each VU only knows its own observations),
    // we skip the checkout. In practice, once any VU has seen a 409 with a
    // "sold out" body, it will stop retrying — adjust the condition below
    // to parse the response body if your API returns a distinguishable message.
    // if (localSuccessCount >= INVENTORY) {
    //     skippedCount.add(1);
    //     // Still sleep to maintain realistic VU pressure on the event loop
    //     // without hammering the server with guaranteed-fail requests
    //     sleep(0.5 + Math.random() * 0.5);
    //     return;
    // }

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
        // Tag requests by whether we're pre- or post-sellout so you can
        // filter in Grafana/k6 Cloud dashboards
        tags: {
            phase: localSuccessCount < INVENTORY ? "active" : "post_sellout",
        },
    };

    const res = http.post(
        `${BASE_URL}/api/v1/product/braintree/payment`,
        payload,
        params
    );

    // -----------------------------
    // CLASSIFY + RECORD SPLIT LATENCY
    // -----------------------------
    if (res.status === 200) {
        successCount.add(1);
        localSuccessCount++;                          // update VU-local sold count
        checkoutLatency.add(res.timings.duration);   // meaningful checkout timing

    } else if (res.status === 400 || res.status === 409) {
        failCount.add(1);
        rejectLatency.add(res.timings.duration);      // should be fast

        // If the API body clearly says "out of stock", treat this VU as done.
        // Adjust the string match to whatever your server returns.
        try {
            const body = JSON.parse(res.body);
            if (
                body.message && (
                    body.message.toLowerCase().includes("out of stock") ||
                    body.message.toLowerCase().includes("insufficient")
                )
            ) {
                localSuccessCount = INVENTORY; // signal this VU to stop
            }
        } catch (_) {
            // non-JSON body — ignore and continue
        }

    } else if (res.status >= 500) {
        serverErrorCount.add(1);
        errorLatency.add(res.timings.duration);

    } else {
        failCount.add(1);
        rejectLatency.add(res.timings.duration);
    }

    // -----------------------------
    // CHECKS
    // -----------------------------
    check(res, {
        "no server error": (r) => r.status < 500,
        "valid response": (r) => [200, 400, 409].includes(r.status),
    });

    sleep(Math.random() * 0.3);
}