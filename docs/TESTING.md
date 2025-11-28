# HZ Navigator Testing Guide

This document describes the testing infrastructure and best practices for the HZ Navigator application.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [E2E Testing](#e2e-testing)
5. [Test Database](#test-database)
6. [Running Tests](#running-tests)
7. [Writing Tests](#writing-tests)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

The testing strategy follows the testing pyramid:

```
        /\
       /E2E\           Few, slow, high confidence
      /------\
     / Integ. \        Moderate amount
    /----------\
   /    Unit    \      Many, fast, low cost
  /--------------\
```

**Coverage Targets:**
- Backend: 80%+ coverage
- Frontend: 70%+ coverage
- E2E: Critical user journeys

---

## Backend Testing

### Structure

```
backend/
├── tests/
│   ├── setup.ts              # Jest setup
│   ├── fixtures/             # Test data
│   │   └── index.ts
│   ├── mocks/                # Mock implementations
│   │   └── database.ts
│   ├── unit/                 # Unit tests
│   │   ├── services/
│   │   └── middleware/
│   ├── integration/          # Integration tests
│   │   └── api/
│   └── db/                   # Database utilities
│       ├── setup.ts
│       ├── reset.ts
│       ├── seed.ts
│       └── testDb.ts
└── jest.config.js
```

### Unit Tests

Test individual functions and classes in isolation.

```typescript
// Example: tests/unit/services/hubzoneService.test.ts
import { HubzoneService } from '../../../src/services/hubzoneService';
import { mockDb } from '../../mocks/database';

jest.mock('../../../src/services/database', () => ({
  db: require('../../mocks/database').mockDb,
}));

describe('HubzoneService', () => {
  describe('checkLocation', () => {
    it('should return true when location is in a hubzone', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockZone] });
      
      const result = await hubzoneService.checkLocation(39.2904, -76.6122);
      
      expect(result.isInHubzone).toBe(true);
    });
  });
});
```

### Integration Tests

Test API endpoints with supertest.

```typescript
// Example: tests/integration/api/auth.test.ts
import request from 'supertest';
import app from '../../../src/index';

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    expect(response.body.token).toBeDefined();
  });
});
```

### Running Backend Tests

```bash
# Run all tests
cd backend && npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Frontend Testing

### Structure

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts          # Vitest setup
│   │   ├── utils.tsx         # Test utilities
│   │   └── mocks/
│   │       └── api.ts
│   ├── components/
│   │   └── Common/
│   │       ├── Button.tsx
│   │       └── Button.test.tsx
│   └── hooks/
│       ├── useAuth.ts
│       └── useAuth.test.ts
└── vite.config.ts            # Vitest config
```

### Component Tests

```typescript
// Example: src/components/Common/Button.test.tsx
import { render, screen, fireEvent } from '../../test/utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Tests

```typescript
// Example: src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Running Frontend Tests

```bash
# Run all tests
cd frontend && npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## E2E Testing

### Structure

```
e2e/
├── playwright.config.ts
├── tests/
│   ├── auth.spec.ts
│   ├── business.spec.ts
│   └── compliance.spec.ts
└── package.json
```

### Writing E2E Tests

```typescript
// Example: e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  await expect(page).toHaveURL(/dashboard/);
});
```

### Running E2E Tests

```bash
# Run all E2E tests
cd e2e && npm test

# Run with UI
npm run test:ui

# Run headed (visible browser)
npm run test:headed

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Generate tests with codegen
npm run codegen
```

---

## Test Database

### Setup

```bash
# Create test database
npm run db:test:setup

# Reset test database (drop and recreate)
npm run db:test:reset

# Seed test data
npm run db:test:seed
```

### Environment Variables

Create `.env.test` in the backend directory:

```env
NODE_ENV=test
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=hz_navigator_test
POSTGRES_USER=hz_admin
POSTGRES_PASSWORD=your_password
JWT_SECRET=test-jwt-secret
```

### Using Test Database in Tests

```typescript
import { 
  getTestPool, 
  cleanupTestData, 
  insertTestUser 
} from '../db/testDb';

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await closeTestPool();
});

it('should create user', async () => {
  const userId = await insertTestUser({
    email: 'test@example.com',
    role: 'user'
  });
  
  const pool = getTestPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  
  expect(result.rows).toHaveLength(1);
});
```

---

## Running Tests

### All Tests

```bash
# From root directory
npm test                 # Run all unit/integration tests
npm run test:e2e         # Run E2E tests
npm run test:all         # Run everything
npm run test:coverage    # Run with coverage reports
```

### Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### CI Mode

```bash
npm run test:ci          # Optimized for CI (coverage, parallel)
```

---

## Writing Tests

### Best Practices

1. **Follow AAA pattern:** Arrange, Act, Assert
2. **One assertion per test** (when practical)
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Clean up after tests**

### Test File Naming

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.spec.ts` (in e2e/tests)

### Mocking

```typescript
// Mock a module
jest.mock('../services/database', () => ({
  db: mockDb,
}));

// Mock a function
const mockFn = jest.fn().mockResolvedValue(data);

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Testing Async Code

```typescript
// Using async/await
it('should fetch data', async () => {
  const result = await service.getData();
  expect(result).toBeDefined();
});

// Testing errors
it('should throw on invalid input', async () => {
  await expect(service.process(null))
    .rejects
    .toThrow('Invalid input');
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:15-3.3
        env:
          POSTGRES_USER: hz_admin
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: hz_navigator_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: npm run db:test:setup
        env:
          POSTGRES_HOST: localhost
          POSTGRES_PASSWORD: test_password
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report
```

---

## Coverage Reports

Coverage reports are generated in:
- Backend: `backend/coverage/`
- Frontend: `frontend/coverage/`

View HTML reports:
```bash
# Backend
open backend/coverage/lcov-report/index.html

# Frontend
open frontend/coverage/index.html
```

