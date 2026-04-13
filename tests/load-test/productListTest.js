import http from 'k6/http';
import { check, sleep } from 'k6';

// run K6_WEB_DASHBOARD_PERIOD=1s K6_WEB_DASHBOARD=true k6 run tests/load-test/productListTest.js

// Danielle Loh, A0257220N
export const options = {
  stages: [
    { duration: '2m', target: 200 }, // ramp up
    { duration: '4m', target: 200 }, // sustain
    { duration: '3m', target: 0 }, // ramp down
  ],
  // define thresholds
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(99)<1000'], // 99% of requests should be below 1s
  },
};

export default () => {
  const page = Math.floor(Math.random() * 5) + 1; 

  const res = http.get(`http://localhost:6060/api/v1/product/product-list/${page}`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "success is true": (r) => r.json("success") === true,
    "products exists": (r) => Array.isArray(r.json("products")),
  });
  
  sleep(Math.random() * 2 + 1); // think time: 1 – 3s between requests
}