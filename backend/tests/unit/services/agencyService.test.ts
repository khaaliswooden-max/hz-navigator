/**
 * AgencyService Unit Tests
 */

import { AgencyService } from '../../../src/services/agencyService';
import { mockDb, resetDatabaseMock, createMockQueryResult } from '../../mocks/database';
import { testBusinesses, testCertifications, testUsers } from '../../fixtures';

// Mock the database module
jest.mock('../../../src/services/database', () => ({
  db: require('../../mocks/database').mockDb,
}));

// Mock the compliance monitoring service
jest.mock('../../../src/services/complianceMonitoring', () => ({
  complianceMonitoringService: {
    calculateCompliance: jest.fn().mockResolvedValue({
      residency: {
        percentage: 40,
        isCompliant: true,
        totalEmployees: 50,
        hubzoneResidents: 20,
      },
      principalOffice: {
        isCompliant: true,
        address: '123 HUBZone Street, Baltimore, MD',
        inHubzone: true,
        isRedesignated: false,
        gracePeriodDaysRemaining: null,
      },
      ownership: {
        isCompliant: true,
        ownershipPercentage: 51,
        isCitizenOwned: true,
      },
      certification: {
        isExpired: false,
        daysUntilExpiration: 365,
        isExpiringSoon: false,
      },
    }),
  },
}));

describe('AgencyService', () => {
  let agencyService: AgencyService;

  beforeEach(() => {
    resetDatabaseMock();
    agencyService = new AgencyService();
  });

  describe('searchContractors', () => {
    it('should search contractors by legal name', async () => {
      const mockResults = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: testBusinesses.compliant.dbaName,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        state: testBusinesses.compliant.state,
        certification_status: 'approved',
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockResults));

      const result = await agencyService.searchContractors({
        legalName: 'Compliant Tech',
      });

      expect(result).toHaveLength(1);
      expect(result[0].legalName).toBe(testBusinesses.compliant.legalName);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(b.legal_name) LIKE LOWER'),
        expect.arrayContaining(['%Compliant Tech%'])
      );
    });

    it('should search contractors by UEI number', async () => {
      const mockResults = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: null,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        state: testBusinesses.compliant.state,
        certification_status: 'approved',
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockResults));

      const result = await agencyService.searchContractors({
        ueiNumber: testBusinesses.compliant.ueiNumber,
      });

      expect(result).toHaveLength(1);
      expect(result[0].ueiNumber).toBe(testBusinesses.compliant.ueiNumber);
    });

    it('should search contractors by CAGE code', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: null,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        state: testBusinesses.compliant.state,
        certification_status: 'approved',
      }]));

      const result = await agencyService.searchContractors({
        cageCode: testBusinesses.compliant.cageCode,
      });

      expect(result).toHaveLength(1);
      expect(result[0].cageCode).toBe(testBusinesses.compliant.cageCode);
    });

    it('should return empty array when no search params provided', async () => {
      const result = await agencyService.searchContractors({});

      expect(result).toHaveLength(0);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return empty array when no contractors found', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await agencyService.searchContractors({
        legalName: 'Nonexistent Company',
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('verifyContractor', () => {
    it('should verify a compliant contractor', async () => {
      const mockBusinessResult = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: testBusinesses.compliant.dbaName,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        principal_office_address: testBusinesses.compliant.principalOfficeAddress,
        certification_id: testCertifications.approved.id,
        certification_status: 'approved',
        certification_date: testCertifications.approved.certificationDate,
        expiration_date: testCertifications.approved.expirationDate,
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockBusinessResult));

      const result = await agencyService.verifyContractor(
        testBusinesses.compliant.ueiNumber
      );

      expect(result).not.toBeNull();
      expect(result?.businessId).toBe(testBusinesses.compliant.id);
      expect(result?.businessName).toBe(testBusinesses.compliant.legalName);
      expect(result?.certificationStatus).toBe('valid');
      expect(result?.isActive).toBe(true);
    });

    it('should return null for unknown UEI number', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await agencyService.verifyContractor('UNKNOWN123');

      expect(result).toBeNull();
    });

    it('should mark expired certification correctly', async () => {
      const expiredDate = new Date('2020-01-01');
      const mockBusinessResult = [{
        id: testBusinesses.expired.id,
        legal_name: testBusinesses.expired.legalName,
        dba_name: testBusinesses.expired.dbaName,
        uei_number: testBusinesses.expired.ueiNumber,
        cage_code: testBusinesses.expired.cageCode,
        principal_office_address: testBusinesses.expired.principalOfficeAddress,
        certification_id: testCertifications.expired.id,
        certification_status: 'expired',
        certification_date: new Date('2017-01-01'),
        expiration_date: expiredDate,
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockBusinessResult));

      const result = await agencyService.verifyContractor(
        testBusinesses.expired.ueiNumber
      );

      expect(result?.certificationStatus).toBe('expired');
      expect(result?.isActive).toBe(false);
    });

    it('should record verification history when agencyId provided', async () => {
      const mockBusinessResult = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: null,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        principal_office_address: testBusinesses.compliant.principalOfficeAddress,
        certification_id: testCertifications.approved.id,
        certification_status: 'approved',
        certification_date: testCertifications.approved.certificationDate,
        expiration_date: testCertifications.approved.expirationDate,
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockBusinessResult));

      const agencyId = 'agency-123';
      await agencyService.verifyContractor(
        testBusinesses.compliant.ueiNumber,
        agencyId,
        'verifier@agency.gov'
      );

      // Should have made an INSERT query for verification history
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO verification_history'),
        expect.any(Array)
      );
    });
  });

  describe('bulkVerifyContractors', () => {
    it('should verify multiple contractors', async () => {
      const mockBusinessResult = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: null,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        principal_office_address: testBusinesses.compliant.principalOfficeAddress,
        certification_id: testCertifications.approved.id,
        certification_status: 'approved',
        certification_date: testCertifications.approved.certificationDate,
        expiration_date: testCertifications.approved.expirationDate,
      }];

      mockDb.query.mockResolvedValue(createMockQueryResult(mockBusinessResult));

      const result = await agencyService.bulkVerifyContractors({
        agencyId: 'agency-123',
        ueiNumbers: [testBusinesses.compliant.ueiNumber],
        requestedBy: 'admin@agency.gov',
      });

      expect(result.status).toBe('completed');
      expect(result.totalRequested).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.summary.compliant).toBe(1);
    });

    it('should handle not found contractors in bulk', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await agencyService.bulkVerifyContractors({
        agencyId: 'agency-123',
        ueiNumbers: ['UNKNOWN1', 'UNKNOWN2'],
        requestedBy: 'admin@agency.gov',
      });

      expect(result.summary.notFound).toBe(2);
      expect(result.results[0].status).toBe('not_found');
    });

    it('should return job ID for tracking', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await agencyService.bulkVerifyContractors({
        agencyId: 'agency-123',
        ueiNumbers: ['UEI1'],
        requestedBy: 'admin@agency.gov',
      });

      expect(result.jobId).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('getVerificationHistory', () => {
    it('should return verification history with filters', async () => {
      const mockHistory = [{
        id: 'vh-123',
        agency_id: 'agency-123',
        agency_name: 'Test Agency',
        business_id: testBusinesses.compliant.id,
        business_name: testBusinesses.compliant.legalName,
        uei_number: testBusinesses.compliant.ueiNumber,
        verification_status: 'valid',
        compliance_score: 95,
        risk_level: 'low',
        verified_at: new Date(),
        verified_by: 'admin@agency.gov',
        method: 'single',
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
      }];

      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ total: '1' }]);
        }
        return createMockQueryResult(mockHistory);
      });

      const result = await agencyService.getVerificationHistory({
        agencyId: 'agency-123',
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].agencyId).toBe('agency-123');
    });

    it('should filter by date range', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ total: '0' }]);
        }
        return createMockQueryResult([]);
      });

      await agencyService.getVerificationHistory({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('vh.verified_at >='),
        expect.any(Array)
      );
    });
  });

  describe('generateVerificationReport', () => {
    it('should generate a verification report', async () => {
      const mockBusinessResult = [{
        id: testBusinesses.compliant.id,
        legal_name: testBusinesses.compliant.legalName,
        dba_name: testBusinesses.compliant.dbaName,
        uei_number: testBusinesses.compliant.ueiNumber,
        cage_code: testBusinesses.compliant.cageCode,
        principal_office_address: testBusinesses.compliant.principalOfficeAddress,
        certification_id: testCertifications.approved.id,
        certification_number: 'HZ-2024-001',
        certification_status: 'approved',
        certification_date: testCertifications.approved.certificationDate,
        expiration_date: testCertifications.approved.expirationDate,
      }];

      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('FROM businesses')) {
          return createMockQueryResult(mockBusinessResult);
        }
        if (text.includes('FROM agencies')) {
          return createMockQueryResult([{ name: 'Test Agency' }]);
        }
        return createMockQueryResult([]);
      });

      const report = await agencyService.generateVerificationReport(
        testBusinesses.compliant.id,
        'agency-123',
        'John Verifier'
      );

      expect(report).not.toBeNull();
      expect(report?.businessName).toBe(testBusinesses.compliant.legalName);
      expect(report?.agencyName).toBe('Test Agency');
      expect(report?.verifierName).toBe('John Verifier');
      expect(report?.reportId).toBeDefined();
      expect(report?.validUntil).toBeDefined();
    });

    it('should return null for non-existent business', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const report = await agencyService.generateVerificationReport(
        'non-existent-id',
        'agency-123'
      );

      expect(report).toBeNull();
    });
  });
});

