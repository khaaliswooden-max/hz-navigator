/**
 * Jest Test Setup
 * 
 * Runs before all tests to configure the testing environment.
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-for-testing-only';
process.env['ENCRYPTION_KEY'] = 'a'.repeat(64); // 32 bytes in hex

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests unless DEBUG is set
  if (!process.env['DEBUG']) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    // Keep warn and error for important messages
  }
});

afterAll(() => {
  // Restore console
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

