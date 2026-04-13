// Kailashwaran, A0253385Y

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = 'http://localhost:3000/api/v1/auth/';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export const options = {
  stages: [
    { duration: '5m', target: 200 },  
    { duration: '60m', target: 200 }, // The Soak
    { duration: '5m', target: 0 },
  ],
};

export default function () {
  // Pick a random user from the pool
  const user = users[Math.floor(Math.random() * users.length)];

  const payload = JSON.stringify({
    email: user.email,       
    password: "password123", 
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/login`, payload, params);

  if (res.status !== 200) {
    console.log(`Error Status: ${res.status}`);
    console.log(`Error Body: ${res.body}`); 
  }

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has token': (r) => r.json().token !== undefined,
  });

  // Simulate real user behavior
  sleep(Math.random() * 5 + 2); 
}