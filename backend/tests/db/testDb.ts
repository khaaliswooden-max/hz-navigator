/**
 * Test Database Helper
 * 
 * Provides utilities for managing test database state during tests.
 */

import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const TEST_DB_NAME = process.env['POSTGRES_DB'] || 'hz_navigator_test';
const POSTGRES_HOST = process.env['POSTGRES_HOST'] || 'localhost';
const POSTGRES_PORT = parseInt(process.env['POSTGRES_PORT'] || '5432', 10);
const POSTGRES_USER = process.env['POSTGRES_USER'] || 'hz_admin';
const POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] || '';

let testPool: Pool | null = null;

/**
 * Get test database pool (creates one if not exists)
 */
export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: TEST_DB_NAME,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return testPool;
}

/**
 * Close test database pool
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Run a callback within a transaction that gets rolled back
 * Useful for tests that need to modify data but shouldn't persist changes
 */
export async function withRollback<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK');
    return result;
  } finally {
    client.release();
  }
}

/**
 * Truncate all tables (for test isolation)
 */
export async function truncateAllTables(): Promise<void> {
  const pool = getTestPool();
  
  const tables = [
    'audit_logs',
    'documents',
    'certifications',
    'businesses',
    'users',
    // Add other tables as needed
  ];

  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

/**
 * Reset auto-increment sequences
 */
export async function resetSequences(): Promise<void> {
  const pool = getTestPool();
  
  // Get all sequences
  const result = await pool.query(`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `);

  for (const row of result.rows) {
    await pool.query(`ALTER SEQUENCE ${row.sequence_name} RESTART WITH 1`);
  }
}

/**
 * Clean up test data (run after each test)
 */
export async function cleanupTestData(): Promise<void> {
  await truncateAllTables();
  await resetSequences();
}

/**
 * Insert test user
 */
export async function insertTestUser(data: {
  id?: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin' | 'reviewer';
}): Promise<string> {
  const pool = getTestPool();
  const id = data.id || require('uuid').v4();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [
      id,
      data.email,
      data.passwordHash || '$2a$12$default.password.hash',
      data.firstName || 'Test',
      data.lastName || 'User',
      data.role || 'user',
    ]
  );

  return id;
}

/**
 * Insert test business
 */
export async function insertTestBusiness(data: {
  id?: string;
  userId: string;
  name: string;
  dunsNumber?: string;
  ein?: string;
}): Promise<string> {
  const pool = getTestPool();
  const id = data.id || require('uuid').v4();

  await pool.query(
    `INSERT INTO businesses (id, user_id, name, duns_number, ein, primary_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      data.userId,
      data.name,
      data.dunsNumber || '123456789',
      data.ein || '12-3456789',
      JSON.stringify({ street1: '123 Test St', city: 'Test City', state: 'MD', zipCode: '12345' }),
    ]
  );

  return id;
}

/**
 * Insert test certification
 */
export async function insertTestCertification(data: {
  id?: string;
  businessId: string;
  applicationNumber?: string;
  status?: string;
}): Promise<string> {
  const pool = getTestPool();
  const id = data.id || require('uuid').v4();

  await pool.query(
    `INSERT INTO certifications (
      id, business_id, application_number, status,
      employee_count, hubzone_employees_count, hubzone_employees_percentage,
      principal_office_in_hubzone, primary_address, application_date
    ) VALUES ($1, $2, $3, $4, 50, 20, 40, true, $5, NOW())`,
    [
      id,
      data.businessId,
      data.applicationNumber || `HZ-TEST-${Date.now()}`,
      data.status || 'pending',
      JSON.stringify({ street1: '123 Test St', city: 'Test City', state: 'MD', zipCode: '12345' }),
    ]
  );

  return id;
}

export default {
  getTestPool,
  closeTestPool,
  withRollback,
  truncateAllTables,
  resetSequences,
  cleanupTestData,
  insertTestUser,
  insertTestBusiness,
  insertTestCertification,
};

