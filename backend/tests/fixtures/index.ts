/**
 * Test Fixtures
 * 
 * Provides sample data for testing purposes.
 */

import { v4 as uuidv4 } from 'uuid';

// ===== User Fixtures =====

export const testUsers = {
  admin: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@test.com',
    password: 'AdminPassword123!',
    passwordHash: '$2a$12$test.hash.for.admin.password',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin' as const,
    isActive: true,
  },
  reviewer: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'reviewer@test.com',
    password: 'ReviewerPassword123!',
    passwordHash: '$2a$12$test.hash.for.reviewer.password',
    firstName: 'Test',
    lastName: 'Reviewer',
    role: 'reviewer' as const,
    isActive: true,
  },
  user: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'user@test.com',
    password: 'UserPassword123!',
    passwordHash: '$2a$12$test.hash.for.user.password',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    isActive: true,
  },
  inactiveUser: {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'inactive@test.com',
    password: 'InactivePassword123!',
    passwordHash: '$2a$12$test.hash.for.inactive.password',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'user' as const,
    isActive: false,
  },
};

// ===== Business Fixtures =====

export const testBusinesses = {
  compliant: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    userId: testUsers.user.id,
    legalName: 'Compliant Tech Solutions LLC',
    dbaName: 'CTS',
    ueiNumber: 'UEI123456789',
    cageCode: 'ABC12',
    ein: '12-3456789',
    state: 'MD',
    principalOfficeAddress: {
      street1: '123 HUBZone Street',
      city: 'Baltimore',
      state: 'MD',
      zipCode: '21201',
      country: 'US',
    },
    employeeCount: 50,
    hubzoneEmployees: 20,
  },
  nonCompliant: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    userId: testUsers.user.id,
    legalName: 'Non-Compliant Industries Inc',
    dbaName: null,
    ueiNumber: 'UEI987654321',
    cageCode: 'XYZ99',
    ein: '98-7654321',
    state: 'VA',
    principalOfficeAddress: {
      street1: '456 Regular Ave',
      city: 'Arlington',
      state: 'VA',
      zipCode: '22201',
      country: 'US',
    },
    employeeCount: 100,
    hubzoneEmployees: 25, // Less than 35%
  },
  expired: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userId: testUsers.user.id,
    legalName: 'Expired Certification Corp',
    dbaName: 'ECC',
    ueiNumber: 'UEI111222333',
    cageCode: 'EXP01',
    ein: '11-2223333',
    state: 'DC',
    principalOfficeAddress: {
      street1: '789 Capitol Hill',
      city: 'Washington',
      state: 'DC',
      zipCode: '20001',
      country: 'US',
    },
    employeeCount: 30,
    hubzoneEmployees: 12,
  },
};

// ===== Certification Fixtures =====

export const testCertifications = {
  approved: {
    id: 'cert-1111-1111-1111-111111111111',
    businessId: testBusinesses.compliant.id,
    applicationNumber: 'HZ-2024-001',
    status: 'approved' as const,
    certificationDate: new Date('2024-01-15'),
    expirationDate: new Date('2027-01-15'),
    hubzoneEmployeesPercentage: 40,
    principalOfficeInHubzone: true,
  },
  pending: {
    id: 'cert-2222-2222-2222-222222222222',
    businessId: testBusinesses.nonCompliant.id,
    applicationNumber: 'HZ-2024-002',
    status: 'pending' as const,
    certificationDate: null,
    expirationDate: null,
    hubzoneEmployeesPercentage: 25,
    principalOfficeInHubzone: false,
  },
  expired: {
    id: 'cert-3333-3333-3333-333333333333',
    businessId: testBusinesses.expired.id,
    applicationNumber: 'HZ-2023-001',
    status: 'expired' as const,
    certificationDate: new Date('2020-01-15'),
    expirationDate: new Date('2023-01-15'),
    hubzoneEmployeesPercentage: 40,
    principalOfficeInHubzone: true,
  },
};

// ===== HUBZone Fixtures =====

export const testHubzones = {
  qct: {
    id: 'hz-1111-1111-1111-111111111111',
    externalId: 'QCT-MD-001',
    name: 'Baltimore QCT Zone 1',
    zoneType: 'qualified_census_tract' as const,
    state: 'MD',
    county: 'Baltimore City',
    fipsCode: '24510',
    designationDate: new Date('2020-01-01'),
    expirationDate: null,
    status: 'active' as const,
  },
  qnmc: {
    id: 'hz-2222-2222-2222-222222222222',
    externalId: 'QNMC-WV-001',
    name: 'Rural West Virginia County',
    zoneType: 'qualified_non_metro_county' as const,
    state: 'WV',
    county: 'McDowell',
    fipsCode: '54047',
    designationDate: new Date('2019-06-01'),
    expirationDate: null,
    status: 'active' as const,
  },
  redesignated: {
    id: 'hz-3333-3333-3333-333333333333',
    externalId: 'RD-VA-001',
    name: 'Redesignated Area Virginia',
    zoneType: 'redesignated' as const,
    state: 'VA',
    county: 'Fairfax',
    fipsCode: '51059',
    designationDate: new Date('2018-01-01'),
    expirationDate: new Date('2025-01-01'),
    status: 'redesignated' as const,
  },
};

// ===== Document Fixtures =====

export const testDocuments = {
  taxReturn: {
    id: 'doc-1111-1111-1111-111111111111',
    certificationId: testCertifications.approved.id,
    documentType: 'tax_return',
    fileName: 'tax_return_2023.pdf',
    filePath: 's3://test-bucket/documents/tax_return_2023.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    uploadedBy: testUsers.user.id,
    verified: true,
  },
  employeeRoster: {
    id: 'doc-2222-2222-2222-222222222222',
    certificationId: testCertifications.approved.id,
    documentType: 'employee_roster',
    fileName: 'employee_roster_2024.xlsx',
    filePath: 's3://test-bucket/documents/employee_roster_2024.xlsx',
    fileSize: 512000,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedBy: testUsers.user.id,
    verified: false,
  },
};

// ===== Contract Fixtures =====

export const testContracts = {
  active: {
    id: 'contract-1111-1111-1111-111111111111',
    businessId: testBusinesses.compliant.id,
    contractNumber: 'FA8732-24-C-0001',
    title: 'IT Support Services',
    value: 500000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'active' as const,
    agencyName: 'Department of Defense',
  },
  completed: {
    id: 'contract-2222-2222-2222-222222222222',
    businessId: testBusinesses.compliant.id,
    contractNumber: 'GS-35F-0123X',
    title: 'Software Development',
    value: 250000,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    status: 'completed' as const,
    agencyName: 'General Services Administration',
  },
};

// ===== Alert Fixtures =====

export const testAlerts = {
  residencyWarning: {
    id: 'alert-1111-1111-1111-111111111111',
    businessId: testBusinesses.compliant.id,
    type: 'residency_warning' as const,
    severity: 'warning' as const,
    title: 'Employee Residency Below Target',
    message: 'Your HUBZone employee residency is at 38%, approaching the 35% minimum.',
    dismissed: false,
    createdAt: new Date(),
  },
  expirationCritical: {
    id: 'alert-2222-2222-2222-222222222222',
    businessId: testBusinesses.expired.id,
    type: 'certification_expiration' as const,
    severity: 'critical' as const,
    title: 'Certification Expired',
    message: 'Your HUBZone certification has expired. Please recertify immediately.',
    dismissed: false,
    createdAt: new Date(),
  },
};

// ===== Factory Functions =====

export function createUser(overrides: Partial<typeof testUsers.user> = {}) {
  return {
    ...testUsers.user,
    id: uuidv4(),
    email: `test-${Date.now()}@test.com`,
    ...overrides,
  };
}

export function createBusiness(overrides: Partial<typeof testBusinesses.compliant> = {}) {
  return {
    ...testBusinesses.compliant,
    id: uuidv4(),
    ueiNumber: `UEI${Date.now()}`,
    ...overrides,
  };
}

export function createCertification(overrides: Partial<typeof testCertifications.approved> = {}) {
  return {
    ...testCertifications.approved,
    id: uuidv4(),
    applicationNumber: `HZ-${Date.now()}`,
    ...overrides,
  };
}

export function createHubzone(overrides: Partial<typeof testHubzones.qct> = {}) {
  return {
    ...testHubzones.qct,
    id: uuidv4(),
    externalId: `HZ-${Date.now()}`,
    ...overrides,
  };
}

export function createDocument(overrides: Partial<typeof testDocuments.taxReturn> = {}) {
  return {
    ...testDocuments.taxReturn,
    id: uuidv4(),
    fileName: `document_${Date.now()}.pdf`,
    ...overrides,
  };
}

// ===== JWT Token Fixtures =====

export function createTestToken(user: typeof testUsers.user = testUsers.user) {
  // This would be generated by the actual generateToken function in tests
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

export default {
  testUsers,
  testBusinesses,
  testCertifications,
  testHubzones,
  testDocuments,
  testContracts,
  testAlerts,
  createUser,
  createBusiness,
  createCertification,
  createHubzone,
  createDocument,
  createTestToken,
};

