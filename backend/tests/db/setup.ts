/**
 * Test Database Setup
 * 
 * Creates a separate test database and runs migrations.
 * Usage: npm run db:test:setup
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.test' });

const TEST_DB_NAME = process.env['POSTGRES_DB'] || 'hz_navigator_test';
const POSTGRES_HOST = process.env['POSTGRES_HOST'] || 'localhost';
const POSTGRES_PORT = parseInt(process.env['POSTGRES_PORT'] || '5432', 10);
const POSTGRES_USER = process.env['POSTGRES_USER'] || 'hz_admin';
const POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] || '';

async function setupTestDatabase(): Promise<void> {
  console.log('🔧 Setting up test database...\n');

  // Connect to default postgres database to create test database
  const adminPool = new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: 'postgres',
  });

  try {
    // Check if test database exists
    const dbExists = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB_NAME]
    );

    if (dbExists.rows.length === 0) {
      console.log(`📦 Creating database "${TEST_DB_NAME}"...`);
      await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log('✅ Database created\n');
    } else {
      console.log(`📦 Database "${TEST_DB_NAME}" already exists\n`);
    }
  } finally {
    await adminPool.end();
  }

  // Connect to test database
  const testPool = new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: TEST_DB_NAME,
  });

  try {
    // Enable required extensions
    console.log('🔌 Enabling extensions...');
    await testPool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await testPool.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await testPool.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    console.log('✅ Extensions enabled\n');

    // Run migrations
    console.log('📋 Running migrations...');
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`  - Running ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Skip "Down Migration" sections
        const upMigration = sql.split('-- Down Migration')[0];
        
        try {
          await testPool.query(upMigration);
        } catch (error) {
          // Ignore "already exists" errors
          if (!(error as Error).message.includes('already exists')) {
            throw error;
          }
        }
      }
      console.log('✅ Migrations completed\n');
    } else {
      console.log('⚠️  No migrations directory found\n');
    }

    console.log('🎉 Test database setup complete!\n');
    console.log(`Connection string: postgres://${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${TEST_DB_NAME}`);
  } finally {
    await testPool.end();
  }
}

setupTestDatabase().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

