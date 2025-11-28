/**
 * Test Database Reset
 * 
 * Drops and recreates the test database.
 * Usage: npm run db:test:reset
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const TEST_DB_NAME = process.env['POSTGRES_DB'] || 'hz_navigator_test';
const POSTGRES_HOST = process.env['POSTGRES_HOST'] || 'localhost';
const POSTGRES_PORT = parseInt(process.env['POSTGRES_PORT'] || '5432', 10);
const POSTGRES_USER = process.env['POSTGRES_USER'] || 'hz_admin';
const POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] || '';

async function resetTestDatabase(): Promise<void> {
  console.log('🔄 Resetting test database...\n');

  const adminPool = new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: 'postgres',
  });

  try {
    // Terminate existing connections
    console.log('⏹️  Terminating existing connections...');
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [TEST_DB_NAME]);

    // Drop database
    console.log(`🗑️  Dropping database "${TEST_DB_NAME}"...`);
    try {
      await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      console.log('✅ Database dropped\n');
    } catch (error) {
      console.log('⚠️  Could not drop database:', (error as Error).message);
    }

    // Recreate database
    console.log(`📦 Creating database "${TEST_DB_NAME}"...`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log('✅ Database created\n');

  } finally {
    await adminPool.end();
  }

  // Run setup
  console.log('🔧 Running setup...\n');
  const { default: setup } = await import('./setup');
  
  console.log('\n🎉 Test database reset complete!');
}

resetTestDatabase().catch((error) => {
  console.error('❌ Reset failed:', error);
  process.exit(1);
});

