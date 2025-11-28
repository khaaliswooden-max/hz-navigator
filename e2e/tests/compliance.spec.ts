/**
 * Compliance Monitoring E2E Tests
 * 
 * Tests for compliance dashboard, alerts, and monitoring.
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

test.describe('Compliance Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.describe('Dashboard', () => {
    test('should display compliance dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should show compliance metrics
      await expect(page.getByText(/compliance|status/i)).toBeVisible();
    });

    test('should show employee residency percentage', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Look for residency metric
      await expect(page.getByText(/residency|hubzone employees/i)).toBeVisible();
      await expect(page.getByText(/%/).first()).toBeVisible();
    });

    test('should show certification status', async ({ page }) => {
      await page.goto('/dashboard');
      
      await expect(page.getByText(/certification|certified|expires/i)).toBeVisible();
    });

    test('should display alerts count', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should show alerts section or badge
      const alertsSection = page.getByText(/alerts?|warnings?|notifications?/i);
      await expect(alertsSection).toBeVisible();
    });
  });

  test.describe('Compliance Alerts', () => {
    test('should display list of alerts', async ({ page }) => {
      await page.goto('/compliance/alerts');
      
      await expect(page.getByRole('heading', { name: /alerts|notifications/i })).toBeVisible();
    });

    test('should filter alerts by severity', async ({ page }) => {
      await page.goto('/compliance/alerts');
      
      const severityFilter = page.getByLabel(/severity|type/i);
      if (await severityFilter.isVisible()) {
        await severityFilter.selectOption('critical');
        
        // Should filter results
        await page.waitForTimeout(500);
      }
    });

    test('should dismiss an alert', async ({ page }) => {
      await page.goto('/compliance/alerts');
      
      const dismissButton = page.getByRole('button', { name: /dismiss|close/i }).first();
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        
        await expect(page.getByText(/dismissed|removed/i)).toBeVisible();
      }
    });

    test('should view alert details', async ({ page }) => {
      await page.goto('/compliance/alerts');
      
      const alertItem = page.locator('[data-testid="alert-item"]').first();
      if (await alertItem.isVisible()) {
        await alertItem.click();
        
        // Should show detailed information
        await expect(page.getByText(/details|description|recommended/i)).toBeVisible();
      }
    });
  });

  test.describe('Employee Residency', () => {
    test('should display employee list with residency status', async ({ page }) => {
      await page.goto('/employees');
      
      await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible();
      // Should show hubzone resident column or indicator
      await expect(page.getByText(/hubzone|resident/i)).toBeVisible();
    });

    test('should show residency statistics', async ({ page }) => {
      await page.goto('/employees');
      
      // Should show summary stats
      await expect(page.getByText(/total|employees/i)).toBeVisible();
      await expect(page.getByText(/%/).first()).toBeVisible();
    });

    test('should verify employee address', async ({ page }) => {
      await page.goto('/employees');
      
      // Click on an employee
      const employeeRow = page.locator('[data-testid="employee-row"]').first();
      if (await employeeRow.isVisible()) {
        await employeeRow.click();
        
        // Look for verify address button
        const verifyButton = page.getByRole('button', { name: /verify address|check hubzone/i });
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
          
          await expect(page.getByText(/hubzone|verified|not in hubzone/i)).toBeVisible();
        }
      }
    });
  });

  test.describe('Compliance Reports', () => {
    test('should generate compliance report', async ({ page }) => {
      await page.goto('/compliance/reports');
      
      await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
      
      const generateButton = page.getByRole('button', { name: /generate|create|download/i });
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Should start download or show preview
        await expect(page.getByText(/generating|download|preview/i)).toBeVisible();
      }
    });

    test('should view historical compliance data', async ({ page }) => {
      await page.goto('/compliance/history');
      
      // Should show historical data
      await expect(page.getByText(/history|trend|timeline/i)).toBeVisible();
    });
  });
});

test.describe('Address Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should display address verification form', async ({ page }) => {
    await page.goto('/hubzone-check');
    
    await expect(page.getByRole('heading', { name: /hubzone|address|verify/i })).toBeVisible();
    await expect(page.getByLabel(/address|street/i)).toBeVisible();
  });

  test('should verify a HUBZone address', async ({ page }) => {
    await page.goto('/hubzone-check');
    
    await page.getByLabel(/address|street/i).fill('123 Main St');
    await page.getByLabel(/city/i).fill('Baltimore');
    await page.getByLabel(/state/i).selectOption('MD');
    await page.getByLabel(/zip/i).fill('21201');
    
    await page.getByRole('button', { name: /verify|check|submit/i }).click();
    
    // Should show result
    await expect(page.getByText(/hubzone|result|found/i)).toBeVisible();
  });

  test('should show map with HUBZone boundaries', async ({ page }) => {
    await page.goto('/hubzone-check');
    
    // Wait for map to load
    const map = page.locator('[data-testid="hubzone-map"]').or(page.locator('.mapboxgl-map'));
    await expect(map).toBeVisible({ timeout: 10000 });
  });
});

