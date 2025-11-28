/**
 * Test Database Seeder
 * 
 * Seeds the test database with sample data for testing.
 * Usage: npm run db:test:seed
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const TEST_DB_NAME = process.env['POSTGRES_DB'] || 'hz_navigator_test';
const POSTGRES_HOST = process.env['POSTGRES_HOST'] || 'localhost';
const POSTGRES_PORT = parseInt(process.env['POSTGRES_PORT'] || '5432', 10);
const POSTGRES_USER = process.env['POSTGRES_USER'] || 'hz_admin';
const POSTGRES_PASSWORD = process.env['POSTGRES_PASSWORD'] || '';

// Test data
const testData = {
  users: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'reviewer@test.com',
      password: 'ReviewerPassword123!',
      firstName: 'Test',
      lastName: 'Reviewer',
      role: 'reviewer',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'user@test.com',
      password: 'UserPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    },
  ],
  businesses: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: '33333333-3333-3333-3333-333333333333',
      name: 'Test Business LLC',
      dunsNumber: '123456789',
      ein: '12-3456789',
      primaryAddress: {
        street1: '123 Test Street',
        city: 'Baltimore',
        state: 'MD',
        zipCode: '21201',
        country: 'US',
      },
      naicsCodes: ['541511', '541512'],
      employeeCount: 50,
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: '33333333-3333-3333-3333-333333333333',
      name: 'Another Test Corp',
      dunsNumber: '987654321',
      ein: '98-7654321',
      primaryAddress: {
        street1: '456 Main Ave',
        city: 'Washington',
        state: 'DC',
        zipCode: '20001',
        country: 'US',
      },
      naicsCodes: ['541519'],
      employeeCount: 25,
    },
  ],
  certifications: [
    {
      id: 'cert-1111-1111-1111-111111111111',
      businessId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      applicationNumber: 'HZ-2024-TEST-001',
      status: 'approved',
      employeeCount: 50,
      hubzoneEmployeesCount: 20,
      hubzoneEmployeesPercentage: 40,
      principalOfficeInHubzone: true,
    },
  ],
};

async function seedTestDatabase(): Promise<void> {
  console.log('🌱 Seeding test database...\n');

  const pool = new Pool({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: TEST_DB_NAME,
  });

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await pool.query('DELETE FROM certifications');
    await pool.query('DELETE FROM businesses');
    await pool.query('DELETE FROM users');
    console.log('✅ Data cleared\n');

    // Seed users
    console.log('👤 Seeding users...');
    for (const user of testData.users) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [user.id, user.email, passwordHash, user.firstName, user.lastName, user.role]
      );
      console.log(`  - Created user: ${user.email} (${user.role})`);
    }
    console.log('');

    // Seed businesses
    console.log('🏢 Seeding businesses...');
    for (const business of testData.businesses) {
      await pool.query(
        `INSERT INTO businesses (id, user_id, name, duns_number, ein, primary_address, naics_codes, employee_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          business.id,
          business.userId,
          business.name,
          business.dunsNumber,
          business.ein,
          JSON.stringify(business.primaryAddress),
          business.naicsCodes,
          business.employeeCount,
        ]
      );
      console.log(`  - Created business: ${business.name}`);
    }
    console.log('');

    // Seed certifications
    console.log('📜 Seeding certifications...');
    for (const cert of testData.certifications) {
      await pool.query(
        `INSERT INTO certifications (
          id, business_id, application_number, status,
          employee_count, hubzone_employees_count, hubzone_employees_percentage,
          principal_office_in_hubzone, application_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          cert.id,
          cert.businessId,
          cert.applicationNumber,
          cert.status,
          cert.employeeCount,
          cert.hubzoneEmployeesCount,
          cert.hubzoneEmployeesPercentage,
          cert.principalOfficeInHubzone,
        ]
      );
      console.log(`  - Created certification: ${cert.applicationNumber}`);
    }
    console.log('');

    // Create some audit logs
    console.log('📋 Creating audit log entries...');
    const auditEntries = [
      { action: 'AUTH_LOGIN_SUCCESS', entityType: 'user', userId: testData.users[0].id },
      { action: 'BUSINESS_CREATED', entityType: 'business', userId: testData.users[2].id },
      { action: 'CERTIFICATION_SUBMITTED', entityType: 'certification', userId: testData.users[2].id },
    ];

    for (const entry of auditEntries) {
      await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, severity)
         VALUES ($1, $2, $3, $4, 'low')`,
        [uuidv4(), entry.userId, entry.action, entry.entityType]
      );
    }
    console.log(`  - Created ${auditEntries.length} audit log entries`);
    console.log('');

    console.log('🎉 Test database seeded successfully!\n');
    console.log('Test credentials:');
    console.log('  Admin:    admin@test.com / AdminPassword123!');
    console.log('  Reviewer: reviewer@test.com / ReviewerPassword123!');
    console.log('  User:     user@test.com / UserPassword123!');

  } finally {
    await pool.end();
  }
}

seedTestDatabase().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

export default seedTestDatabase;

