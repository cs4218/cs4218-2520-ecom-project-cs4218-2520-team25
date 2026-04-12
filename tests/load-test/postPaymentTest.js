import http from 'k6/http';
import { check, fail, sleep } from 'k6';

// Danielle Loh, A0257220N

// run: K6_WEB_DASHBOARD_PERIOD=1s K6_WEB_DASHBOARD=true USER_TOKEN="<raw-user-jwt>" BT_NONCE="fake-valid-nonce" TEST_PRODUCT_ID="<real-product-id>" k6 run tests/load-test/postPaymentTest.js

// (manual) Set up database for test before running:
// 1. Insert test category in categories db: { "name": "load-test-category", "slug": "load-test-category" }
// 2. copy the created category _id: [e.g. 69db5a06dcb475a24863dd3a] 69dba311dcb475a24863dd79
// 3. Insert test product into the products db:
/**
{
  "name": "Load Test Product",
  "slug": "load-test-product",
  "description": "Product used for payment load testing",
  "price": 120,
  "category": { "$oid": "PUT_CATEGORY_ID_HERE" },
  "quantity": 999999999,
  "photo": {
    "data": null,
    "contentType": ""
  },
  "shipping": true,
  "createdAt": { "$date": "2026-04-12T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-04-12T00:00:00.000Z" }
}
 */
// 4. copy the product _id: [e.g. 69db5ab9dcb475a24863dd3d] 69dba33adcb475a24863dd7c

// get user token from local storage
// run the test using:
// K6_WEB_DASHBOARD_PERIOD=1s K6_WEB_DASHBOARD=true USER_TOKEN="<raw-user-jwt>" BT_NONCE="fake-valid-nonce" TEST_PRODUCT_ID="<real-product-id>" k6 run tests/load-test/postPaymentTest.js

// (manual) clean up after the test:
// 1. delete the orders created by test (run query):
/* 
db.orders.deleteMany({
  "products": ObjectId("PUT_PRODUCT_ID_HERE")
});
*/
// 2. delete the test products:
/*
db.products.deleteOne({ "_id": ObjectId("PUT_PRODUCT_ID_HERE") });
*/
// 3. delete the test category: 
/* db.categories.deleteOne({ "_id": ObjectId("PUT_CATEGORY_ID_HERE") });*/


// Danielle Loh, A0257220N
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const USER_TOKEN = __ENV.USER_TOKEN || '';
const BT_NONCE = __ENV.BT_NONCE || 'fake-valid-nonce';
const TEST_PRODUCT_ID = __ENV.TEST_PRODUCT_ID || '';
const TEST_PRODUCT_NAME =
  __ENV.TEST_PRODUCT_NAME || 'Load Test Product';
const TEST_PRODUCT_DESCRIPTION =
  __ENV.TEST_PRODUCT_DESCRIPTION || 'Product used for payment load testing';
const TEST_PRODUCT_PRICE = Number(__ENV.TEST_PRODUCT_PRICE || 120);
const TEST_PRODUCT_QUANTITY = Number(__ENV.TEST_PRODUCT_QUANTITY || 1);

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // ramp up
    { duration: '4m', target: 200 }, // sustain
    { duration: '3m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(99)<2000'], // 99% of requests should be below 2s
  },
};

function ensureEnv() {
  if (!USER_TOKEN) {
    fail('Set USER_TOKEN to a valid raw user JWT before running this test.');
  }

  if (!TEST_PRODUCT_ID) {
    fail('Set TEST_PRODUCT_ID to the MongoDB product ObjectId created for this test.');
  }
}

export default () => {
  ensureEnv();

  const res = http.post(
    `${BASE_URL}/api/v1/product/braintree/payment`,
    JSON.stringify({
      nonce: BT_NONCE,
      cart: [
        {
          _id: TEST_PRODUCT_ID,
          name: TEST_PRODUCT_NAME,
          description: TEST_PRODUCT_DESCRIPTION,
          price: TEST_PRODUCT_PRICE,
          quantity: TEST_PRODUCT_QUANTITY,
        },
      ],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: USER_TOKEN,
      },
    }
  );

  check(res, {
    'Post status is 200': (r) => r.status === 200,
    'Payment is ok': (r) => {
      try {
        return JSON.parse(r.body).ok === true;
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 2 + 1);
};
