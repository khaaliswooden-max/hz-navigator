/**
 * HubzoneService Unit Tests
 */

import { HubzoneService } from '../../../src/services/hubzoneService';
import { mockDb, setMockQueryResult, resetDatabaseMock, createMockQueryResult } from '../../mocks/database';
import { testHubzones, createHubzone } from '../../fixtures';

// Mock the database module
jest.mock('../../../src/services/database', () => ({
  db: require('../../mocks/database').mockDb,
}));

describe('HubzoneService', () => {
  let hubzoneService: HubzoneService;

  beforeEach(() => {
    resetDatabaseMock();
    hubzoneService = new HubzoneService();
  });

  describe('findAll', () => {
    it('should return paginated hubzones', async () => {
      const mockHubzones = [
        { ...testHubzones.qct, geometry: '{}' },
        { ...testHubzones.qnmc, geometry: '{}' },
      ];

      // Mock count query
      setMockQueryResult('SELECT COUNT(*) FROM hubzones', [{ count: '2' }]);
      
      // Mock data query - need to set it up for the actual query
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '2' }]);
        }
        return createMockQueryResult(mockHubzones);
      });

      const result = await hubzoneService.findAll({ page: 1, limit: 10 });

      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.data).toHaveLength(2);
    });

    it('should filter hubzones by search term', async () => {
      const mockHubzones = [{ ...testHubzones.qct, geometry: '{}' }];

      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '1' }]);
        }
        return createMockQueryResult(mockHubzones);
      });

      const result = await hubzoneService.findAll({
        page: 1,
        limit: 10,
        search: 'Baltimore',
      });

      expect(result.pagination.total).toBe(1);
      expect(result.data[0].name).toBe('Baltimore QCT Zone 1');
    });

    it('should return empty results when no hubzones found', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([{ count: '0' }]));

      const result = await hubzoneService.findAll({ page: 1, limit: 10 });

      expect(result.pagination.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('should calculate correct pagination', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '25' }]);
        }
        return createMockQueryResult([]);
      });

      const result = await hubzoneService.findAll({ page: 2, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe('findById', () => {
    it('should return a hubzone by ID', async () => {
      const mockHubzone = { ...testHubzones.qct, geometry: '{}' };
      mockDb.query.mockResolvedValue(createMockQueryResult([mockHubzone]));

      const result = await hubzoneService.findById(testHubzones.qct.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testHubzones.qct.id);
      expect(result?.name).toBe(testHubzones.qct.name);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testHubzones.qct.id]
      );
    });

    it('should return null when hubzone not found', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await hubzoneService.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('checkLocation', () => {
    it('should return true when location is in a hubzone', async () => {
      const mockZone = {
        id: testHubzones.qct.id,
        name: testHubzones.qct.name,
        zone_type: testHubzones.qct.zoneType,
        state: testHubzones.qct.state,
        county: testHubzones.qct.county,
        status: testHubzones.qct.status,
      };
      mockDb.query.mockResolvedValue(createMockQueryResult([mockZone]));

      const result = await hubzoneService.checkLocation(39.2904, -76.6122);

      expect(result.isInHubzone).toBe(true);
      expect(result.coordinates).toEqual({ latitude: 39.2904, longitude: -76.6122 });
      expect(result.matchingZones).toHaveLength(1);
      expect(result.checkedAt).toBeDefined();
    });

    it('should return false when location is not in a hubzone', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await hubzoneService.checkLocation(40.7128, -74.006);

      expect(result.isInHubzone).toBe(false);
      expect(result.matchingZones).toHaveLength(0);
    });

    it('should return multiple zones when location is in overlapping hubzones', async () => {
      const mockZones = [
        {
          id: testHubzones.qct.id,
          name: testHubzones.qct.name,
          zone_type: 'qualified_census_tract',
          state: 'MD',
          county: 'Baltimore City',
          status: 'active',
        },
        {
          id: testHubzones.redesignated.id,
          name: testHubzones.redesignated.name,
          zone_type: 'redesignated',
          state: 'MD',
          county: 'Baltimore City',
          status: 'active',
        },
      ];
      mockDb.query.mockResolvedValue(createMockQueryResult(mockZones));

      const result = await hubzoneService.checkLocation(39.2904, -76.6122);

      expect(result.isInHubzone).toBe(true);
      expect(result.matchingZones).toHaveLength(2);
    });

    it('should only return active hubzones', async () => {
      // The query filters for status = 'active'
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const result = await hubzoneService.checkLocation(39.2904, -76.6122);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        expect.any(Array)
      );
    });

    it('should pass coordinates in correct order (longitude, latitude)', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      await hubzoneService.checkLocation(39.2904, -76.6122);

      // PostGIS expects longitude first, then latitude
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [-76.6122, 39.2904]
      );
    });
  });
});

