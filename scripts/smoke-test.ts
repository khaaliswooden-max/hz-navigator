#!/usr/bin/env npx ts-node
/**
 * =============================================================================
 * HZ-Navigator Production Smoke Test Suite
 * =============================================================================
 * Run comprehensive smoke tests against production after deployment.
 * 
 * Usage:
 *   npx ts-node scripts/smoke-test.ts --env production
 *   npx ts-node scripts/smoke-test.ts --env staging --verbose
 * 
 * Exit codes:
 *   0 - All tests passed
 *   1 - Some tests failed
 *   2 - Critical tests failed
 * =============================================================================
 */

import https from 'https';
import http from 'http';

// =============================================================================
// Configuration
// =============================================================================

interface Config {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
  verbose: boolean;
}

const ENVIRONMENTS: Record<string, Partial<Config>> = {
  production: {
    baseUrl: 'https://app.hz-navigator.com',
    apiUrl: 'https://api.hz-navigator.com',
  },
  staging: {
    baseUrl: 'https://app.staging.hz-navigator.com',
    apiUrl: 'https://api.staging.hz-navigator.com',
  },
  development: {
    baseUrl: 'https://app.dev.hz-navigator.com',
    apiUrl: 'https://api.dev.hz-navigator.com',
  },
  local: {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:3000',
  },
};

// =============================================================================
// Types
// =============================================================================

interface TestResult {
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  critical: boolean;
}

interface TestContext {
  config: Config;
  authToken?: string;
  testUser?: {
    email: string;
    password: string;
  };
}

type TestFunction = (ctx: TestContext) => Promise<void>;

interface Test {
  name: string;
  category: string;
  critical: boolean;
  fn: TestFunction;
}

// =============================================================================
// HTTP Utilities
// =============================================================================

async function httpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  } = {}
): Promise<{ status: number; body: unknown; headers: Record<string, string>; responseTime: number }> {
  const startTime = Date.now();
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HZ-Navigator-SmokeTest/1.0',
        ...headers,
      },
      timeout,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(data);
        } catch {
          parsedBody = data;
        }
        resolve({
          status: res.statusCode || 0,
          body: parsedBody,
          headers: res.headers as Record<string, string>,
          responseTime,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// =============================================================================
// Test Definitions
// =============================================================================

const tests: Test[] = [
  // -------------------------------------------------------------------------
  // Infrastructure Tests (Critical)
  // -------------------------------------------------------------------------
  {
    name: 'API Health Check',
    category: 'Infrastructure',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/health`);
      if (res.status !== 200) {
        throw new Error(`Health check returned ${res.status}`);
      }
      if (res.responseTime > 500) {
        throw new Error(`Health check slow: ${res.responseTime}ms`);
      }
    },
  },
  {
    name: 'Frontend Loads',
    category: 'Infrastructure',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(ctx.config.baseUrl);
      if (res.status !== 200) {
        throw new Error(`Frontend returned ${res.status}`);
      }
      const body = res.body as string;
      if (!body.includes('<!DOCTYPE html>') && !body.includes('<html')) {
        throw new Error('Frontend did not return HTML');
      }
    },
  },
  {
    name: 'API Response Time',
    category: 'Infrastructure',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/health`);
      if (res.responseTime > 200) {
        throw new Error(`API response time ${res.responseTime}ms exceeds 200ms threshold`);
      }
    },
  },
  {
    name: 'SSL Certificate Valid',
    category: 'Infrastructure',
    critical: true,
    fn: async (ctx) => {
      if (!ctx.config.apiUrl.startsWith('https')) {
        return; // Skip for local
      }
      const res = await httpRequest(ctx.config.apiUrl);
      // If we get here without error, SSL is valid
      if (res.status === 0) {
        throw new Error('SSL connection failed');
      }
    },
  },
  {
    name: 'CORS Headers Present',
    category: 'Infrastructure',
    critical: false,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/health`, {
        headers: { Origin: ctx.config.baseUrl },
      });
      // Check for CORS headers in preflight or actual response
      if (!res.headers['access-control-allow-origin']) {
        console.log('  Warning: CORS headers may be configured for preflight only');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Authentication Tests
  // -------------------------------------------------------------------------
  {
    name: 'Login Endpoint Accessible',
    category: 'Authentication',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        body: { email: 'invalid@test.com', password: 'invalid' },
      });
      // Should return 401, not 500
      if (res.status === 500) {
        throw new Error('Login endpoint returned 500 error');
      }
    },
  },
  {
    name: 'Registration Endpoint Accessible',
    category: 'Authentication',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        body: { email: '', password: '' },
      });
      // Should return 400 (validation error), not 500
      if (res.status === 500) {
        throw new Error('Registration endpoint returned 500 error');
      }
    },
  },
  {
    name: 'Password Reset Endpoint Accessible',
    category: 'Authentication',
    critical: false,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        body: { email: 'test@example.com' },
      });
      if (res.status === 500) {
        throw new Error('Password reset endpoint returned 500 error');
      }
    },
  },

  // -------------------------------------------------------------------------
  // HUBZone Verification Tests
  // -------------------------------------------------------------------------
  {
    name: 'HUBZone Check Endpoint',
    category: 'HUBZone',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/hubzones/check`, {
        method: 'POST',
        body: { 
          address: '1600 Pennsylvania Avenue NW',
          city: 'Washington',
          state: 'DC',
          zip: '20500'
        },
      });
      if (res.status === 500) {
        throw new Error('HUBZone check returned 500 error');
      }
    },
  },
  {
    name: 'Map Tiles Accessible',
    category: 'HUBZone',
    critical: true,
    fn: async (ctx) => {
      // Check if map endpoint exists
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/map/config`);
      if (res.status === 500) {
        throw new Error('Map config endpoint returned 500 error');
      }
    },
  },
  {
    name: 'Geocoding Service',
    category: 'HUBZone',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(
        `${ctx.config.apiUrl}/api/v1/hubzones/geocode?address=${encodeURIComponent('1600 Pennsylvania Ave NW, Washington, DC')}`
      );
      if (res.status === 500) {
        throw new Error('Geocoding service returned 500 error');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Business API Tests
  // -------------------------------------------------------------------------
  {
    name: 'Business API Accessible',
    category: 'Business',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/businesses`);
      // Should return 401 (unauthorized) not 500
      if (res.status === 500) {
        throw new Error('Business API returned 500 error');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Document API Tests
  // -------------------------------------------------------------------------
  {
    name: 'Documents API Accessible',
    category: 'Documents',
    critical: false,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/documents`);
      if (res.status === 500) {
        throw new Error('Documents API returned 500 error');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Compliance API Tests
  // -------------------------------------------------------------------------
  {
    name: 'Compliance API Accessible',
    category: 'Compliance',
    critical: true,
    fn: async (ctx) => {
      const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/compliance`);
      if (res.status === 500) {
        throw new Error('Compliance API returned 500 error');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Security Tests
  // -------------------------------------------------------------------------
  {
    name: 'Security Headers Present',
    category: 'Security',
    critical: false,
    fn: async (ctx) => {
      const res = await httpRequest(ctx.config.baseUrl);
      const warnings: string[] = [];
      
      if (!res.headers['strict-transport-security']) {
        warnings.push('Missing Strict-Transport-Security header');
      }
      if (!res.headers['x-content-type-options']) {
        warnings.push('Missing X-Content-Type-Options header');
      }
      if (!res.headers['x-frame-options']) {
        warnings.push('Missing X-Frame-Options header');
      }
      
      if (warnings.length > 0) {
        console.log('  Warnings:', warnings.join(', '));
      }
    },
  },
  {
    name: 'Rate Limiting Active',
    category: 'Security',
    critical: false,
    fn: async (ctx) => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        httpRequest(`${ctx.config.apiUrl}/api/v1/health`)
      );
      const results = await Promise.all(requests);
      
      // Check if any got rate limited (429) - if not, rate limiting might not be active
      const rateLimited = results.some(r => r.status === 429);
      if (!rateLimited) {
        console.log('  Note: Rate limiting may not be triggered with 10 requests');
      }
    },
  },

  // -------------------------------------------------------------------------
  // Performance Tests
  // -------------------------------------------------------------------------
  {
    name: 'API Average Response Time',
    category: 'Performance',
    critical: false,
    fn: async (ctx) => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await httpRequest(`${ctx.config.apiUrl}/api/v1/health`);
        times.push(res.responseTime);
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`  Average response time: ${avg.toFixed(0)}ms`);
      if (avg > 500) {
        throw new Error(`Average response time ${avg.toFixed(0)}ms exceeds 500ms threshold`);
      }
    },
  },
];

// =============================================================================
// Test Runner
// =============================================================================

async function runTests(config: Config): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const ctx: TestContext = { config };

  console.log('\n🧪 HZ-Navigator Smoke Tests\n');
  console.log(`Environment: ${config.apiUrl}`);
  console.log('─'.repeat(60));

  let currentCategory = '';

  for (const test of tests) {
    if (test.category !== currentCategory) {
      currentCategory = test.category;
      console.log(`\n📁 ${currentCategory}`);
    }

    const startTime = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let error: string | undefined;

    try {
      await test.fn(ctx);
      console.log(`  ✅ ${test.name}`);
    } catch (err) {
      status = 'fail';
      error = err instanceof Error ? err.message : String(err);
      const icon = test.critical ? '❌' : '⚠️';
      console.log(`  ${icon} ${test.name}`);
      if (config.verbose) {
        console.log(`     Error: ${error}`);
      }
    }

    results.push({
      name: test.name,
      category: test.category,
      status,
      duration: Date.now() - startTime,
      error,
      critical: test.critical,
    });
  }

  return results;
}

function printSummary(results: TestResult[]): number {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const criticalFailed = results.filter(r => r.status === 'fail' && r.critical).length;

  console.log(`  Total:    ${results.length}`);
  console.log(`  Passed:   ${passed} ✅`);
  console.log(`  Failed:   ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Critical: ${criticalFailed} ${criticalFailed > 0 ? '🚨' : ''}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        const icon = r.critical ? '🚨' : '⚠️';
        console.log(`  ${icon} [${r.category}] ${r.name}`);
        if (r.error) {
          console.log(`     ${r.error}`);
        }
      });
  }

  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);

  console.log('\n' + '═'.repeat(60));

  if (criticalFailed > 0) {
    console.log('🚨 CRITICAL TESTS FAILED - DO NOT PROCEED WITH LAUNCH\n');
    return 2;
  } else if (failed > 0) {
    console.log('⚠️  Some tests failed - Review before launch\n');
    return 1;
  } else {
    console.log('✅ All tests passed - Ready for launch!\n');
    return 0;
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf('--env');
  const env = envIndex !== -1 ? args[envIndex + 1] : 'staging';
  const verbose = args.includes('--verbose') || args.includes('-v');

  const envConfig = ENVIRONMENTS[env];
  if (!envConfig) {
    console.error(`Unknown environment: ${env}`);
    console.error(`Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }

  const config: Config = {
    baseUrl: envConfig.baseUrl!,
    apiUrl: envConfig.apiUrl!,
    timeout: 30000,
    verbose,
  };

  try {
    const results = await runTests(config);
    const exitCode = printSummary(results);
    process.exit(exitCode);
  } catch (err) {
    console.error('Fatal error running tests:', err);
    process.exit(2);
  }
}

main();

