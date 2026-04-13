import http from 'k6/http';
import { check, sleep } from 'k6';

// run K6_WEB_DASHBOARD_PERIOD=1s K6_WEB_DASHBOARD=true k6 run tests/load-test/loginTest.js

// Danielle Loh, A0257220N
export const options = {
  stages: [
    { duration: '2m', target: 200 }, // ramp up
    { duration: '4m', target: 200 }, // sustain
    { duration: '3m', target: 0 }, // ramp down
  ],
  // define thresholds
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1% (error rate)
    http_req_duration: ['p(99)<2000'], // 99% of requests should be below 1s (latency)
  },
};

export default () => {
  const url = `http://localhost:6060/api/v1/auth/login`;

  const payload = JSON.stringify({ 
    email: "hh@hh.com",
    password: "Hhhh",
  });

  const headers = { 'Content-Type': 'application/json' };

  const res = http.post(url, payload, { headers });

  check(res, {
    'Post status is 200': (r) => r.status === 200,
    'Response has token': (r) => {
      try {
        return !!JSON.parse(r.body).token;
      } catch {
        return false;
      }
    },
    'Post is success': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
  });
  
  sleep(Math.random() * 2 + 1);
}