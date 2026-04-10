import http from 'k6/http';
import { check, sleep } from 'k6';

// run K6_WEB_DASHBOARD_PERIOD=1s K6_WEB_DASHBOARD=true k6 run tests/load-test/productPhotoTest.js

// Danielle Loh, A0257220N
const TEST_PRODUCT_SLUG = 'the-law-of-contract-in-singapore'; // real product ID from database

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up
    { duration: '4m', target: 100 }, // sustain
    { duration: '3m', target: 0 }, // ramp down
  ],
  // define thresholds
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(99)<1000'], // 99% of requests should be below 1s
  },
};

export default () => {
  const res = http.get(`http://localhost:6060/api/v1/product/get-product/${TEST_PRODUCT_SLUG}`);

  check(res, {
    'status is 200 or 304': (r) => r.status === 200 || r.status === 304,
  });
  
  sleep(Math.random() * 2 + 1); // think time: 1 – 3s between requests
}