/**
 * Database Mock
 * 
 * Provides a mock implementation of the database module for testing.
 */

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

// Mock query results storage
const mockResults: Map<string, QueryResult<QueryResultRow>> = new Map();
const mockQueryHistory: Array<{ text: string; params?: unknown[] }> = [];

// Create mock query result
export function createMockQueryResult<T extends QueryResultRow>(
  rows: T[],
  rowCount?: number
): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

// Mock database implementation
export const mockDb = {
  query: jest.fn(async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => {
    mockQueryHistory.push({ text, params });
    
    // Check for pre-configured mock results
    const key = text.trim().substring(0, 100);
    const result = mockResults.get(key);
    if (result) {
      return result as QueryResult<T>;
    }
    
    // Return empty result by default
    return createMockQueryResult<T>([]);
  }),

  getClient: jest.fn(async (): Promise<PoolClient> => {
    return {
      query: mockDb.query,
      release: jest.fn(),
    } as unknown as PoolClient;
  }),

  transaction: jest.fn(async <T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> => {
    const client = await mockDb.getClient();
    try {
      const result = await callback(client);
      return result;
    } finally {
      client.release();
    }
  }),

  close: jest.fn(async (): Promise<void> => {
    // No-op
  }),
};

// Helper functions for setting up mock responses
export function setMockQueryResult<T extends QueryResultRow>(
  queryPrefix: string,
  rows: T[],
  rowCount?: number
): void {
  mockResults.set(
    queryPrefix.trim().substring(0, 100),
    createMockQueryResult(rows, rowCount)
  );
}

export function clearMockQueryResults(): void {
  mockResults.clear();
}

export function getMockQueryHistory(): Array<{ text: string; params?: unknown[] }> {
  return [...mockQueryHistory];
}

export function clearMockQueryHistory(): void {
  mockQueryHistory.length = 0;
}

// Reset all mocks
export function resetDatabaseMock(): void {
  clearMockQueryResults();
  clearMockQueryHistory();
  jest.clearAllMocks();
}

export default mockDb;

