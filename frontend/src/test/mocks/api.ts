/**
 * API Mocks
 * 
 * Mock implementations for API services used in tests.
 */

import { vi } from 'vitest';
import {
  createMockUser,
  createMockBusiness,
  createMockCertification,
  createMockEmployee,
  createMockDocument,
  createMockAlert,
} from '../utils';

// ===== Auth Service Mock =====

export const mockAuthService = {
  login: vi.fn().mockResolvedValue({
    token: 'mock-jwt-token',
    user: createMockUser(),
  }),
  register: vi.fn().mockResolvedValue({
    token: 'mock-jwt-token',
    user: createMockUser(),
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(createMockUser()),
  forgotPassword: vi.fn().mockResolvedValue({ success: true }),
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
};

// ===== Business Service Mock =====

export const mockBusinessService = {
  getAll: vi.fn().mockResolvedValue({
    data: [createMockBusiness()],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue(createMockBusiness()),
  create: vi.fn().mockResolvedValue(createMockBusiness()),
  update: vi.fn().mockResolvedValue(createMockBusiness()),
  delete: vi.fn().mockResolvedValue({ success: true }),
  getCertifications: vi.fn().mockResolvedValue([createMockCertification()]),
};

// ===== Employee Service Mock =====

export const mockEmployeeService = {
  getAll: vi.fn().mockResolvedValue({
    data: [createMockEmployee(), createMockEmployee({ id: 'emp-2', firstName: 'Jane' })],
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue(createMockEmployee()),
  create: vi.fn().mockResolvedValue(createMockEmployee()),
  update: vi.fn().mockResolvedValue(createMockEmployee()),
  delete: vi.fn().mockResolvedValue({ success: true }),
  getResidencyStats: vi.fn().mockResolvedValue({
    totalEmployees: 50,
    hubzoneResidents: 20,
    percentage: 40,
    isCompliant: true,
  }),
};

// ===== Document Service Mock =====

export const mockDocumentService = {
  getAll: vi.fn().mockResolvedValue({
    data: [createMockDocument()],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue(createMockDocument()),
  upload: vi.fn().mockResolvedValue(createMockDocument()),
  delete: vi.fn().mockResolvedValue({ success: true }),
  getDownloadUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/download' }),
  getCategories: vi.fn().mockResolvedValue({
    categories: {
      tax_return: 'Tax Returns',
      employee_roster: 'Employee Roster',
      ownership_docs: 'Ownership Documents',
    },
  }),
};

// ===== HUBZone Service Mock =====

export const mockHubzoneService = {
  getAll: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  }),
  getById: vi.fn().mockResolvedValue(null),
  checkLocation: vi.fn().mockResolvedValue({
    isInHubzone: true,
    coordinates: { latitude: 39.2904, longitude: -76.6122 },
    matchingZones: [
      {
        id: 'hz-1',
        name: 'Baltimore QCT',
        zoneType: 'qualified_census_tract',
        state: 'MD',
        status: 'active',
      },
    ],
    checkedAt: new Date().toISOString(),
  }),
  verifyAddress: vi.fn().mockResolvedValue({
    isValid: true,
    isInHubzone: true,
    normalizedAddress: '123 Main St, Baltimore, MD 21201',
    coordinates: { latitude: 39.2904, longitude: -76.6122 },
  }),
};

// ===== Alert Service Mock =====

export const mockAlertService = {
  getAll: vi.fn().mockResolvedValue({
    data: [createMockAlert()],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  }),
  getById: vi.fn().mockResolvedValue(createMockAlert()),
  dismiss: vi.fn().mockResolvedValue({ success: true }),
  dismissAll: vi.fn().mockResolvedValue({ success: true }),
  getCount: vi.fn().mockResolvedValue({ count: 3 }),
};

// ===== Analytics Service Mock =====

export const mockAnalyticsService = {
  getDashboardStats: vi.fn().mockResolvedValue({
    totalBusinesses: 150,
    activeCertifications: 120,
    pendingApplications: 30,
    complianceRate: 92.5,
  }),
  getComplianceTrend: vi.fn().mockResolvedValue([
    { month: 'Jan', compliance: 90 },
    { month: 'Feb', compliance: 91 },
    { month: 'Mar', compliance: 92 },
  ]),
  getResidencyDistribution: vi.fn().mockResolvedValue([
    { range: '35-40%', count: 20 },
    { range: '40-50%', count: 45 },
    { range: '50%+', count: 35 },
  ]),
};

// ===== Notification Service Mock =====

export const mockNotificationService = {
  getPreferences: vi.fn().mockResolvedValue({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    alertTypes: {
      residency_warning: true,
      certification_expiration: true,
      compliance_change: true,
    },
  }),
  updatePreferences: vi.fn().mockResolvedValue({ success: true }),
  getHistory: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  }),
};

// ===== Reset All Mocks =====

export function resetAllMocks() {
  Object.values(mockAuthService).forEach((fn) => fn.mockClear());
  Object.values(mockBusinessService).forEach((fn) => fn.mockClear());
  Object.values(mockEmployeeService).forEach((fn) => fn.mockClear());
  Object.values(mockDocumentService).forEach((fn) => fn.mockClear());
  Object.values(mockHubzoneService).forEach((fn) => fn.mockClear());
  Object.values(mockAlertService).forEach((fn) => fn.mockClear());
  Object.values(mockAnalyticsService).forEach((fn) => fn.mockClear());
  Object.values(mockNotificationService).forEach((fn) => fn.mockClear());
}

export default {
  authService: mockAuthService,
  businessService: mockBusinessService,
  employeeService: mockEmployeeService,
  documentService: mockDocumentService,
  hubzoneService: mockHubzoneService,
  alertService: mockAlertService,
  analyticsService: mockAnalyticsService,
  notificationService: mockNotificationService,
  resetAllMocks,
};

