/**
 * Test Utilities
 * 
 * Custom render function and utilities for testing React components.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

// All providers wrapper
interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Custom render with all providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Router wrapper only
function RouterWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: RouterWrapper, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, renderWithRouter };

// ===== Mock Data Factories =====

export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    ...overrides,
  };
}

export function createMockBusiness(overrides = {}) {
  return {
    id: 'test-business-id',
    name: 'Test Business LLC',
    ueiNumber: 'UEI123456789',
    cageCode: 'ABC12',
    state: 'MD',
    certificationStatus: 'approved',
    employeeCount: 50,
    hubzoneEmployees: 20,
    ...overrides,
  };
}

export function createMockCertification(overrides = {}) {
  return {
    id: 'test-cert-id',
    businessId: 'test-business-id',
    applicationNumber: 'HZ-2024-001',
    status: 'approved',
    certificationDate: new Date('2024-01-15').toISOString(),
    expirationDate: new Date('2027-01-15').toISOString(),
    hubzoneEmployeesPercentage: 40,
    principalOfficeInHubzone: true,
    ...overrides,
  };
}

export function createMockEmployee(overrides = {}) {
  return {
    id: 'test-employee-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    position: 'Developer',
    isHubzoneResident: true,
    startDate: new Date('2023-01-01').toISOString(),
    ...overrides,
  };
}

export function createMockDocument(overrides = {}) {
  return {
    id: 'test-doc-id',
    fileName: 'test_document.pdf',
    fileType: 'pdf',
    fileSize: 1024000,
    category: 'tax_return',
    status: 'uploaded',
    uploadedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockAlert(overrides = {}) {
  return {
    id: 'test-alert-id',
    type: 'residency_warning',
    severity: 'warning' as const,
    title: 'Test Alert',
    message: 'This is a test alert message',
    dismissed: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ===== API Mock Helpers =====

export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<{ data: T }>((resolve) => {
    setTimeout(() => resolve({ data }), delay);
  });
}

export function mockApiError(message: string, status = 400) {
  const error = new Error(message) as Error & { response: { status: number; data: { error: { message: string } } } };
  error.response = {
    status,
    data: { error: { message } },
  };
  return Promise.reject(error);
}

// ===== Wait Helpers =====

export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const spinners = document.querySelectorAll('[data-testid="loading-spinner"]');
    expect(spinners.length).toBe(0);
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

