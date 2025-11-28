/**
 * HZ Navigator - Production Smoke Tests (Playwright)
 * 
 * These tests verify critical user flows after deployment.
 * Run with: npx playwright test tests/smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://hz-navigator.com';
const API_URL = process.env.API_URL || 'https://api.hz-navigator.com';

test.describe('Production Smoke Tests', () => {
  
  test.describe('Homepage', () => {
    test('should load homepage', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page).toHaveTitle(/HZ Navigator/);
    });

    test('should display main navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page.locator('nav')).toBeVisible();
    });

    test('should have login button', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    });

    test('should have register button', async ({ page }) => {
      await page.goto(BASE_URL);
      await expect(page.getByRole('link', { name: /register|sign up/i })).toBeVisible();
    });
  });

  test.describe('Authentication Pages', () => {
    test('should load login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should load registration page', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      await expect(page.getByRole('heading', { name: /register|sign up|create account/i })).toBeVisible();
    });

    test('should load forgot password page', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should show validation errors on empty login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: /login|sign in/i }).click();
      await expect(page.getByText(/required|invalid/i)).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel(/email/i).fill('invalid@test.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login|sign in/i }).click();
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('HUBZone Check', () => {
    test('should load HUBZone check page', async ({ page }) => {
      await page.goto(`${BASE_URL}/hubzone-check`);
      await expect(page.getByText(/hubzone|address|check/i)).toBeVisible();
    });

    test('should have address input', async ({ page }) => {
      await page.goto(`${BASE_URL}/hubzone-check`);
      await expect(page.getByPlaceholder(/address|location/i)).toBeVisible();
    });
  });

  test.describe('Map', () => {
    test('should load map explorer page', async ({ page }) => {
      await page.goto(`${BASE_URL}/map`);
      // Map should render within reasonable time
      await page.waitForTimeout(2000);
      // Check for map container
      await expect(page.locator('[class*="map"]')).toBeVisible();
    });
  });

  test.describe('API Health', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/health`);
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body.status).toBe('healthy');
    });

    test('should have database connected', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/health`);
      const body = await response.json();
      expect(body.database?.status).toBe('healthy');
    });

    test('should have redis connected', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/health`);
      const body = await response.json();
      expect(body.redis?.status).toBe('healthy');
    });
  });

  test.describe('API Endpoints', () => {
    test('should require auth for protected endpoints', async ({ request }) => {
      const protectedEndpoints = [
        '/api/v1/businesses',
        '/api/v1/employees',
        '/api/v1/documents',
        '/api/v1/compliance',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request.get(`${API_URL}${endpoint}`);
        expect(response.status()).toBe(401);
      }
    });

    test('HUBZone check should work', async ({ request }) => {
      const response = await request.get(
        `${API_URL}/api/v1/hubzones/check?lat=38.8951&lng=-77.0364`
      );
      expect(response.ok()).toBeTruthy();
      
      const body = await response.json();
      expect(body).toHaveProperty('inHubzone');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/nonexistent-page-12345`);
      // SPA should handle 404 gracefully
      await expect(page.getByText(/not found|404|doesn't exist/i)).toBeVisible();
    });

    test('API should return proper 404', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/nonexistent`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Performance', () => {
    test('homepage should load within 3 seconds', async ({ page }) => {
      const start = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - start;
      expect(loadTime).toBeLessThan(3000);
    });

    test('API health should respond within 500ms', async ({ request }) => {
      const start = Date.now();
      await request.get(`${API_URL}/api/v1/health`);
      const responseTime = Date.now() - start;
      expect(responseTime).toBeLessThan(500);
    });
  });

  test.describe('Security Headers', () => {
    test('should have security headers', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/v1/health`);
      const headers = response.headers();
      
      // Check for common security headers
      expect(headers['x-content-type-options']).toBe('nosniff');
    });
  });

  test.describe('Legal Pages', () => {
    test('should have privacy policy', async ({ page }) => {
      await page.goto(`${BASE_URL}/privacy`);
      await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible();
    });

    test('should have terms of service', async ({ page }) => {
      await page.goto(`${BASE_URL}/terms`);
      await expect(page.getByRole('heading', { name: /terms/i })).toBeVisible();
    });
  });
});

test.describe('User Flow Smoke Tests', () => {
  
  test('complete registration flow (mock)', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Fill registration form
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill(`smoke-test-${Date.now()}@test.com`);
    await page.getByLabel(/password/i).first().fill('TestPassword123!');
    await page.getByLabel(/confirm password/i).fill('TestPassword123!');
    
    // Accept terms
    const termsCheckbox = page.getByRole('checkbox');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    
    // Submit (we won't actually create the user in smoke tests)
    // Just verify the form is functional
    const submitButton = page.getByRole('button', { name: /register|sign up|create/i });
    await expect(submitButton).toBeEnabled();
  });

  test('address search flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/hubzone-check`);
    
    // Enter an address
    const addressInput = page.getByPlaceholder(/address|location|search/i);
    if (await addressInput.isVisible()) {
      await addressInput.fill('1600 Pennsylvania Avenue NW, Washington, DC');
      
      // Wait for suggestions or submit
      await page.waitForTimeout(1000);
    }
  });
});

