/**
 * K6 Soak Testing - Extended Duration Test
 * 
 * Tests system stability over extended periods.
 * Identifies memory leaks and resource exhaustion.
 * 
 * Run with: k6 run scenarios/soak-test.js --duration 4h
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const apiErrors = new Counter('api_errors');
const memoryGauge = new Gauge('estimated_memory');
const apiResponseTime = new Trend('api_response_time');
const successRate = new Rate('success_rate');

export const options = {
  scenarios: {
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: __ENV.DURATION || '1h',
    },
  },
  
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],
    'success_rate': ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

let requestCount = 0;

export default function() {
  requestCount++;
  
  // Mix of different request types
  const requestTypes = [
    () => http.get(`${API_URL}/health`),
    () => http.get(`${API_URL}/hubzones?page=${randomIntBetween(1, 10)}&limit=20`),
    () => http.get(`${API_URL}/hubzones/check?latitude=${39 + Math.random()}&longitude=${-77 + Math.random()}`),
  ];
  
  const requestFn = requestTypes[requestCount % requestTypes.length];
  const res = requestFn();
  
  apiResponseTime.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 500,
  });
  
  successRate.add(success);
  
  if (!success) {
    apiErrors.add(1);
  }
  
  // Log progress every 10000 requests
  if (requestCount % 10000 === 0) {
    console.log(`Completed ${requestCount} requests...`);
  }
  
  sleep(randomIntBetween(2, 5));
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const duration = data.state?.testRunDurationMs / 1000 / 60 || 0;
  const rps = totalRequests / (duration * 60);
  
  console.log('\n=== SOAK TEST SUMMARY ===');
  console.log(`Duration: ${duration.toFixed(2)} minutes`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Requests/second: ${rps.toFixed(2)}`);
  console.log(`Error rate: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
  console.log(`P95 latency: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`);
  
  return {
    'soak-test-results.json': JSON.stringify(data, null, 2),
  };
}

