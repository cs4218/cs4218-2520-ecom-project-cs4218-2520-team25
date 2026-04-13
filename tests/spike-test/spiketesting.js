import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Han Tae Won, A0221684E
// Sudden spike on login endpoint

export const errorRate = new Rate("errors");
export const loginDuration = new Trend("login_duration");

export const options = {
  stages: [
    { duration: "10s", target: 5 },    // baseline
    { duration: "5s", target: 500 },   // spike 1 up
    { duration: "5s", target: 500 },   // spike 1 hold
    { duration: "5s", target: 5 },     // drop
    { duration: "10s", target: 5 },    // recovery baseline

    { duration: "5s", target: 500 },   // spike 2 up
    { duration: "5s", target: 500 },   // spike 2 hold
    { duration: "5s", target: 5 },     // drop
    { duration: "10s", target: 5 },    // recovery baseline

    { duration: "5s", target: 500 },   // spike 3 up
    { duration: "5s", target: 500 },   // spike 3 hold
    { duration: "5s", target: 5 },     // drop
    { duration: "10s", target: 5 },    // final recovery
  ],
  thresholds: {
    http_req_failed: ["rate<0.2"],
    http_req_duration: ["p(90)<2000"],
    errors: ["rate<0.2"],
    login_duration: ["p(90)<2000"],
  },
};

const BASE_URL = "http://localhost:6060";

export default function () {
  const url = `${BASE_URL}/api/v1/auth/login`;

  const payload = JSON.stringify({
    email: "hh@hh.com",
    password: "Hhhh",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  loginDuration.add(res.timings.duration);

  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "response has success true": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    "response has token": (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.token;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!ok);

  sleep(1);
}