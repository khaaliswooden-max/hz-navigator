/**
 * Authentication E2E Tests
 * 
 * Tests for registration, login, and authentication flows.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    });

    test('should redirect to dashboard after successful login', async ({ page }) => {
      await page.goto('/login');
      
      // Use test credentials
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('TestPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should have link to registration', async ({ page }) => {
      await page.goto('/login');
      
      const registerLink = page.getByRole('link', { name: /create account|sign up|register/i });
      await expect(registerLink).toBeVisible();
      
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');
      
      const forgotLink = page.getByRole('link', { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
      
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    });
  });

  test.describe('Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');
      
      await expect(page.getByRole('heading', { name: /create|register|sign up/i })).toBeVisible();
      await expect(page.getByLabel(/first name/i)).toBeVisible();
      await expect(page.getByLabel(/last name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/register');
      
      await page.getByLabel(/first name/i).fill('Test');
      await page.getByLabel(/last name/i).fill('User');
      await page.getByLabel(/email/i).fill('newuser@example.com');
      await page.getByLabel(/^password$/i).fill('weak');
      
      await page.getByRole('button', { name: /create|register|sign up/i }).click();
      
      // Should show password requirement errors
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/register');
      
      await page.getByLabel(/first name/i).fill('Test');
      await page.getByLabel(/last name/i).fill('User');
      await page.getByLabel(/email/i).fill('existing@example.com');
      await page.getByLabel(/^password$/i).fill('SecurePass123!');
      
      if (await page.getByLabel(/confirm password/i).isVisible()) {
        await page.getByLabel(/confirm password/i).fill('SecurePass123!');
      }
      
      await page.getByRole('button', { name: /create|register|sign up/i }).click();
      
      await expect(page.getByText(/email already/i)).toBeVisible();
    });

    test('should have link to login', async ({ page }) => {
      await page.goto('/register');
      
      const loginLink = page.getByRole('link', { name: /sign in|login|already have/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Forgot Password', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await expect(page.getByRole('heading', { name: /forgot|reset|password/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should show success message after submission', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();
      
      await expect(page.getByText(/email sent|check your email|instructions/i)).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('TestPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should logout and redirect to login', async ({ page }) => {
      // Find and click logout button
      await page.getByRole('button', { name: /logout|sign out/i }).click();
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should clear session after logout', async ({ page }) => {
      await page.getByRole('button', { name: /logout|sign out/i }).click();
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });
});

