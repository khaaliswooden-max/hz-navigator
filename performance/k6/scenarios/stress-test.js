/**
 * K6 Stress Testing - Breaking Point Analysis
 * 
 * Identifies system breaking points and bottlenecks.
 * 
 * Run with: k6 run scenarios/stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const apiErrors = new Counter('api_errors');
const breakingPointUsers = new Counter('breaking_point_users');
const apiResponseTime = new Trend('api_response_time');
const successRate = new Rate('success_rate');

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // Warm up
        { duration: '3m', target: 100 },   // Normal load
        { duration: '3m', target: 200 },   // High load
        { duration: '3m', target: 300 },   // Very high load
        { duration: '3m', target: 400 },   // Stress
        { duration: '3m', target: 500 },   // Breaking point?
        { duration: '5m', target: 500 },   // Hold at max
        { duration: '2m', target: 0 },     // Recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  
  thresholds: {
    'http_req_duration': ['p(95)<1000'],    // More lenient for stress test
    'http_req_failed': ['rate<0.10'],       // Allow up to 10% failures
    'api_errors': ['count<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

export default function() {
  // Cycle through different endpoints
  const endpoints = [
    { name: 'health', url: `${API_URL}/health` },
    { name: 'hubzones', url: `${API_URL}/hubzones?page=1&limit=10` },
    { name: 'hubzone_check', url: `${API_URL}/hubzones/check?latitude=39.2904&longitude=-76.6122` },
  ];
  
  const endpoint = endpoints[__ITER % endpoints.length];
  
  const startTime = Date.now();
  const res = http.get(endpoint.url, {
    tags: { endpoint: endpoint.name },
    timeout: '10s',
  });
  const duration = Date.now() - startTime;
  
  apiResponseTime.add(duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  successRate.add(success);
  
  if (!success) {
    apiErrors.add(1);
    
    // Track when we start seeing failures at VU count
    if (res.status >= 500 || res.timings.duration > 2000) {
      breakingPointUsers.add(__VU);
    }
  }
  
  // Short sleep to simulate realistic user behavior
  sleep(randomIntBetween(1, 2));
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;
  const maxVUs = data.metrics.vus_max?.values?.max || 0;
  
  console.log('\n=== STRESS TEST SUMMARY ===');
  console.log(`Max concurrent users: ${maxVUs}`);
  console.log(`P95 response time: ${p95.toFixed(2)}ms`);
  console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
  
  if (errorRate > 0.05) {
    console.log(`\n⚠️  High error rate detected. Consider scaling infrastructure.`);
  }
  if (p95 > 500) {
    console.log(`\n⚠️  High latency detected. Consider query optimization.`);
  }
  
  return {
    'stdout': JSON.stringify(data, null, 2),
    'stress-test-results.json': JSON.stringify(data, null, 2),
  };
}

