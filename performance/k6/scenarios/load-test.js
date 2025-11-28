/**
 * K6 Load Testing - Main Load Test Scenario
 * 
 * Tests the application under various load conditions:
 * - 100 concurrent users
 * - 1000 address verifications/minute
 * - 500 API requests/second
 * 
 * Run with: k6 run scenarios/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const apiErrors = new Counter('api_errors');
const addressVerifications = new Counter('address_verifications');
const authAttempts = new Counter('auth_attempts');
const apiResponseTime = new Trend('api_response_time');
const successRate = new Rate('success_rate');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to 100 concurrent users
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 100 },  // Ramp up to 100 users
        { duration: '10m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    
    // Scenario 2: Address verification stress test (1000/min = ~17/sec)
    address_verification: {
      executor: 'constant-arrival-rate',
      rate: 17,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'addressVerificationScenario',
    },
    
    // Scenario 3: API spike test (500 requests/second)
    api_spike: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 100,
      maxVUs: 500,
      startTime: '15m', // Start after other scenarios warm up
      exec: 'apiSpikeScenario',
    },
  },
  
  thresholds: {
    // API response time thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500'], // p95 < 200ms, p99 < 500ms
    'http_req_duration{endpoint:health}': ['p(95)<50'],
    'http_req_duration{endpoint:hubzone_check}': ['p(95)<500'],
    'http_req_duration{endpoint:auth}': ['p(95)<300'],
    
    // Error rate threshold
    'http_req_failed': ['rate<0.01'], // Less than 1% errors
    'success_rate': ['rate>0.99'],    // 99%+ success rate
    
    // Custom metric thresholds
    'api_response_time': ['p(95)<200'],
    'api_errors': ['count<100'],
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Test data
const testAddresses = [
  { street: '123 Main St', city: 'Baltimore', state: 'MD', zip: '21201' },
  { street: '456 Capitol Hill', city: 'Washington', state: 'DC', zip: '20001' },
  { street: '789 Market St', city: 'San Francisco', state: 'CA', zip: '94102' },
  { street: '321 Broadway', city: 'New York', state: 'NY', zip: '10007' },
  { street: '555 Commerce St', city: 'Dallas', state: 'TX', zip: '75201' },
];

const testCoordinates = [
  { lat: 39.2904, lng: -76.6122 },  // Baltimore
  { lat: 38.8951, lng: -77.0364 },  // Washington DC
  { lat: 37.7749, lng: -122.4194 }, // San Francisco
  { lat: 40.7128, lng: -74.006 },   // New York
  { lat: 32.7767, lng: -96.797 },   // Dallas
];

// Authentication tokens cache
let authToken = null;

/**
 * Setup function - runs once before tests
 */
export function setup() {
  console.log('Setting up load test...');
  
  // Login to get auth token
  const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.data?.token;
    console.log('Authentication successful');
  } else {
    console.log('Authentication failed, running unauthenticated tests');
  }
  
  return { authToken };
}

/**
 * Default function - main test scenario
 */
export default function(data) {
  const token = data.authToken;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  group('Health Check', () => {
    const res = http.get(`${API_URL}/health`, {
      tags: { endpoint: 'health' },
    });
    
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    successRate.add(res.status === 200);
    apiResponseTime.add(res.timings.duration);
  });
  
  group('HUBZone Check', () => {
    const coords = randomItem(testCoordinates);
    const res = http.get(
      `${API_URL}/hubzones/check?latitude=${coords.lat}&longitude=${coords.lng}`,
      { headers, tags: { endpoint: 'hubzone_check' } }
    );
    
    check(res, {
      'hubzone check status is 200': (r) => r.status === 200,
      'hubzone check has result': (r) => {
        const body = JSON.parse(r.body);
        return body.data && typeof body.data.isInHubzone === 'boolean';
      },
    });
    
    successRate.add(res.status === 200);
    apiResponseTime.add(res.timings.duration);
    
    if (res.status !== 200) {
      apiErrors.add(1);
    }
  });
  
  group('List HUBZones', () => {
    const page = randomIntBetween(1, 5);
    const res = http.get(`${API_URL}/hubzones?page=${page}&limit=20`, {
      headers,
      tags: { endpoint: 'hubzones_list' },
    });
    
    check(res, {
      'hubzones list status is 200': (r) => r.status === 200,
      'hubzones list has pagination': (r) => {
        const body = JSON.parse(r.body);
        return body.pagination && body.pagination.total >= 0;
      },
    });
    
    successRate.add(res.status === 200);
    apiResponseTime.add(res.timings.duration);
  });
  
  group('Dashboard Stats', () => {
    if (!token) return;
    
    const res = http.get(`${API_URL}/analytics/dashboard`, {
      headers,
      tags: { endpoint: 'dashboard' },
    });
    
    check(res, {
      'dashboard status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    
    successRate.add(res.status === 200);
    apiResponseTime.add(res.timings.duration);
  });
  
  sleep(randomIntBetween(1, 3));
}

/**
 * Address verification scenario
 */
export function addressVerificationScenario(data) {
  const token = data?.authToken;
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  const coords = randomItem(testCoordinates);
  
  const res = http.get(
    `${API_URL}/hubzones/check?latitude=${coords.lat}&longitude=${coords.lng}`,
    { headers, tags: { endpoint: 'address_verification' } }
  );
  
  check(res, {
    'address verification succeeded': (r) => r.status === 200,
    'address verification response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  addressVerifications.add(1);
  apiResponseTime.add(res.timings.duration);
  
  if (res.status !== 200) {
    apiErrors.add(1);
  }
}

/**
 * API spike test scenario
 */
export function apiSpikeScenario(data) {
  const endpoints = [
    { method: 'GET', url: `${API_URL}/health` },
    { method: 'GET', url: `${API_URL}/hubzones?page=1&limit=10` },
  ];
  
  const endpoint = randomItem(endpoints);
  
  const res = http.request(endpoint.method, endpoint.url, null, {
    tags: { endpoint: 'spike_test' },
  });
  
  check(res, {
    'spike test status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
  
  successRate.add(res.status === 200);
  apiResponseTime.add(res.timings.duration);
  
  if (res.status >= 500) {
    apiErrors.add(1);
  }
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('Load test completed');
}

