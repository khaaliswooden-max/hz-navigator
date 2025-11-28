/**
 * Business Management E2E Tests
 * 
 * Tests for business creation, editing, and management.
 */

import { test, expect } from '@playwright/test';

// Helper to login before tests
async function loginAsUser(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe('Business Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.describe('Business List', () => {
    test('should display list of businesses', async ({ page }) => {
      await page.goto('/businesses');
      
      await expect(page.getByRole('heading', { name: /business|companies/i })).toBeVisible();
      // Should have a table or list of businesses
      await expect(page.getByRole('table').or(page.locator('[data-testid="business-list"]'))).toBeVisible();
    });

    test('should have button to create new business', async ({ page }) => {
      await page.goto('/businesses');
      
      const createButton = page.getByRole('button', { name: /create|add|new/i });
      await expect(createButton).toBeVisible();
    });

    test('should search businesses', async ({ page }) => {
      await page.goto('/businesses');
      
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test Business');
        await page.keyboard.press('Enter');
        
        // Results should filter
        await expect(page.getByText(/test business/i)).toBeVisible();
      }
    });
  });

  test.describe('Business Creation', () => {
    test('should display business creation form', async ({ page }) => {
      await page.goto('/businesses/new');
      
      await expect(page.getByRole('heading', { name: /create|new|add/i })).toBeVisible();
      await expect(page.getByLabel(/business name|legal name/i)).toBeVisible();
      await expect(page.getByLabel(/uei|duns/i)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/businesses/new');
      
      // Submit without filling form
      await page.getByRole('button', { name: /create|submit|save/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required/i)).toBeVisible();
    });

    test('should create business successfully', async ({ page }) => {
      await page.goto('/businesses/new');
      
      // Fill in required fields
      await page.getByLabel(/business name|legal name/i).fill('New Test Business LLC');
      await page.getByLabel(/uei/i).fill('UEI' + Date.now());
      
      // Fill address if visible
      if (await page.getByLabel(/street/i).isVisible()) {
        await page.getByLabel(/street/i).fill('123 Test Street');
        await page.getByLabel(/city/i).fill('Baltimore');
        await page.getByLabel(/state/i).selectOption('MD');
        await page.getByLabel(/zip/i).fill('21201');
      }
      
      await page.getByRole('button', { name: /create|submit|save/i }).click();
      
      // Should redirect to business detail or list
      await expect(page.getByText(/business created|success/i)).toBeVisible();
    });
  });

  test.describe('Business Details', () => {
    test('should display business details', async ({ page }) => {
      await page.goto('/businesses');
      
      // Click on first business
      const businessRow = page.locator('[data-testid="business-row"]').first();
      if (await businessRow.isVisible()) {
        await businessRow.click();
        
        // Should show business details
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }
    });

    test('should show certification status', async ({ page }) => {
      await page.goto('/businesses');
      
      const businessRow = page.locator('[data-testid="business-row"]').first();
      if (await businessRow.isVisible()) {
        await businessRow.click();
        
        // Should show certification info
        await expect(page.getByText(/certification|hubzone/i)).toBeVisible();
      }
    });

    test('should have edit button', async ({ page }) => {
      await page.goto('/businesses');
      
      const businessRow = page.locator('[data-testid="business-row"]').first();
      if (await businessRow.isVisible()) {
        await businessRow.click();
        
        const editButton = page.getByRole('button', { name: /edit/i });
        await expect(editButton).toBeVisible();
      }
    });
  });

  test.describe('Business Editing', () => {
    test('should pre-fill form with existing data', async ({ page }) => {
      await page.goto('/businesses');
      
      const businessRow = page.locator('[data-testid="business-row"]').first();
      if (await businessRow.isVisible()) {
        await businessRow.click();
        await page.getByRole('button', { name: /edit/i }).click();
        
        // Form should have existing values
        const nameInput = page.getByLabel(/business name|legal name/i);
        await expect(nameInput).not.toHaveValue('');
      }
    });

    test('should update business successfully', async ({ page }) => {
      await page.goto('/businesses');
      
      const businessRow = page.locator('[data-testid="business-row"]').first();
      if (await businessRow.isVisible()) {
        await businessRow.click();
        await page.getByRole('button', { name: /edit/i }).click();
        
        // Update a field
        const nameInput = page.getByLabel(/business name|legal name/i);
        await nameInput.clear();
        await nameInput.fill('Updated Business Name');
        
        await page.getByRole('button', { name: /save|update/i }).click();
        
        await expect(page.getByText(/updated|saved|success/i)).toBeVisible();
      }
    });
  });
});

